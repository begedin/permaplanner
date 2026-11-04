defmodule PermaplannerWeb.OAuthController do
  use PermaplannerWeb, :controller
  alias Permaplanner.MCP.OAuth
  alias Permaplanner.Accounts.User

  @authorization_keys ~w(client_id redirect_uri response_type resource scope code_challenge code_challenge_method state)

  def metadata(conn, _), do: json(conn, OAuth.metadata())

  def protected_resource(conn, _) do
    json(conn, %{
      resource: OAuth.resource(),
      authorization_servers: [OAuth.base_url()],
      scopes_supported: ["gardens:read"]
    })
  end

  def authorize(conn, params) do
    with {:ok, client} <- OAuth.validate_authorization(params) do
      page(conn, client, Map.take(params, @authorization_keys), [])
    else
      {:error, error} -> oauth_error(conn, error)
    end
  end

  def approve(conn, %{"decision" => decision} = params) when decision in ["allow", "deny"] do
    with %User{} = user <- confirmed_user(conn),
         {:ok, _} <- OAuth.validate_authorization(params),
         {:ok, location} <-
           if(decision == "deny",
             do: {:ok, OAuth.callback(params, %{"error" => "access_denied"})},
             else: OAuth.authorize(user, params)
           ) do
      redirect(conn, external: location)
    else
      nil -> conn |> put_status(:unauthorized) |> json(%{error: "unauthorized"})
      {:error, error} -> oauth_error(conn, error)
    end
  end

  def approve(conn, _), do: oauth_error(conn, "invalid_request")

  def token(conn, params) do
    with {:ok, params} <- client_credentials(conn, params),
         {:ok, tokens} <- OAuth.exchange(params) do
      conn |> put_resp_header("cache-control", "no-store") |> json(tokens)
    else
      {:error, error} -> oauth_error(conn, error)
    end
  end

  def revoke(conn, params) do
    with {:ok, params} <- client_credentials(conn, params),
         :ok <- OAuth.revoke_token(params) do
      send_resp(conn, 200, "")
    else
      {:error, error} -> oauth_error(conn, error)
    end
  end

  def connections(conn, _) do
    user = confirmed_user(conn)
    page(conn, nil, %{}, if(user, do: OAuth.connections(user), else: []))
  end

  def disconnect(conn, %{"connection_id" => id}) when is_binary(id) do
    case confirmed_user(conn) do
      nil ->
        conn |> put_status(:unauthorized) |> json(%{error: "unauthorized"})

      user ->
        OAuth.revoke_connection(user, id)
        redirect(conn, to: "/oauth/connections")
    end
  end

  def disconnect(conn, _), do: oauth_error(conn, "invalid_request")

  defp confirmed_user(conn) do
    case conn.assigns[:current_user] do
      %User{} = user -> if User.totp_confirmed?(user), do: user
      _ -> nil
    end
  end

  defp page(conn, client, params, connections) do
    assigns = %{
      user: confirmed_user(conn),
      client: client,
      params: params,
      connections: connections,
      return_to:
        conn.request_path <> if(conn.query_string == "", do: "", else: "?" <> conn.query_string)
    }

    html =
      PermaplannerWeb.OAuthHTML.page(assigns)
      |> Phoenix.HTML.Safe.to_iodata()
      |> IO.iodata_to_binary()

    conn
    |> put_resp_header("cache-control", "no-store")
    |> put_resp_header("referrer-policy", "no-referrer")
    |> put_resp_content_type("text/html")
    |> send_resp(200, html)
  end

  defp client_credentials(conn, params) do
    case get_req_header(conn, "authorization") do
      [] ->
        {:ok, params}

      ["Basic " <> encoded] ->
        with {:ok, decoded} <- Base.decode64(encoded),
             [id, secret] <- String.split(decoded, ":", parts: 2),
             id = URI.decode_www_form(id),
             false <- Map.has_key?(params, "client_secret"),
             true <- is_nil(params["client_id"]) or params["client_id"] == id do
          {:ok,
           Map.merge(params, %{
             "client_id" => id,
             "client_secret" => URI.decode_www_form(secret)
           })}
        else
          _ -> {:error, "invalid_client"}
        end

      _ ->
        {:error, "invalid_client"}
    end
  end

  defp oauth_error(conn, error) do
    conn
    |> put_resp_header("cache-control", "no-store")
    |> put_status(:bad_request)
    |> json(%{error: error})
  end
end
