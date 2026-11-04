defmodule Permaplanner.MCP.OAuth do
  @moduledoc "Self-hosted, read-only OAuth authorization for explicitly registered MCP clients."
  import Ecto.Query
  alias Permaplanner.{Accounts.User, Repo}
  alias Permaplanner.MCP.{Client, Credentials, Grant}

  @scope "gardens:read"

  def base_url, do: Application.fetch_env!(:permaplanner, :mcp_base_url)
  def resource, do: base_url() <> "/mcp"
  def clients, do: Application.get_env(:permaplanner, :mcp_clients, %{})

  def metadata do
    %{
      issuer: base_url(),
      authorization_endpoint: base_url() <> "/oauth/authorize",
      token_endpoint: base_url() <> "/oauth/token",
      revocation_endpoint: base_url() <> "/oauth/revoke",
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: [@scope],
      authorization_response_iss_parameter_supported: true
    }
  end

  def validate_authorization(params) do
    client = clients()[params["client_id"]]
    challenge = params["code_challenge"]

    cond do
      !is_struct(client, Client) ->
        {:error, "invalid_client"}

      params["redirect_uri"] not in client.redirect_uris ->
        {:error, "invalid_request"}

      params["response_type"] != "code" ->
        {:error, "unsupported_response_type"}

      params["resource"] != resource() ->
        {:error, "invalid_target"}

      Map.get(params, "scope", @scope) != @scope ->
        {:error, "invalid_scope"}

      params["code_challenge_method"] != "S256" ->
        {:error, "invalid_request"}

      !is_binary(challenge) or !Regex.match?(~r/\A[A-Za-z0-9_-]{43}\z/, challenge) ->
        {:error, "invalid_request"}

      !is_binary(params["state"]) or byte_size(params["state"]) > 2048 ->
        {:error, "invalid_request"}

      true ->
        {:ok, client}
    end
  end

  def authorize(%User{} = user, params) do
    with {:ok, _} <- validate_authorization(params),
         true <- User.totp_confirmed?(user) do
      {:ok, code} = Credentials.authorize(user, params)
      {:ok, callback(params, %{"code" => code})}
    else
      false -> {:error, "access_denied"}
      error -> error
    end
  end

  def callback(params, values) do
    uri = URI.parse(params["redirect_uri"])

    query =
      URI.decode_query(uri.query || "")
      |> Map.merge(values)
      |> Map.merge(%{"state" => params["state"], "iss" => base_url()})

    URI.to_string(%{uri | query: URI.encode_query(query)})
  end

  def authenticate_client(params) do
    case clients()[params["client_id"]] do
      nil ->
        {:error, "invalid_client"}

      client ->
        expected = client.secret
        supplied = params["client_secret"]

        if (is_nil(expected) and is_nil(supplied)) or
             (is_binary(expected) and is_binary(supplied) and
                Plug.Crypto.secure_compare(expected, supplied)),
           do: :ok,
           else: {:error, "invalid_client"}
    end
  end

  def exchange(params) do
    with :ok <- authenticate_client(params),
         true <- params["resource"] == resource() do
      case params["grant_type"] do
        "authorization_code" -> exchange_code(params)
        "refresh_token" -> refresh(params)
        _ -> {:error, "unsupported_grant_type"}
      end
    else
      false -> {:error, "invalid_target"}
      error -> error
    end
  end

  defp exchange_code(%{"code" => code, "code_verifier" => verifier} = params)
       when is_binary(code) and is_binary(verifier),
       do: Credentials.exchange(:code, code, params)

  defp exchange_code(_), do: {:error, "invalid_request"}

  defp refresh(%{"refresh_token" => token} = params) when is_binary(token) do
    if Map.get(params, "scope", @scope) == @scope,
      do: Credentials.exchange(:refresh, token, params),
      else: {:error, "invalid_grant"}
  end

  defp refresh(_), do: {:error, "invalid_request"}

  def user_for_token(token) when is_binary(token),
    do: Credentials.user_for_token(token, resource())

  def revoke_token(params) do
    with :ok <- authenticate_client(params),
         token when is_binary(token) <- params["token"] do
      Credentials.revoke_token(params["client_id"], token)
    else
      {:error, _} = error -> error
      _ -> {:error, "invalid_request"}
    end
  end

  def connections(user) do
    now = DateTime.utc_now()

    Repo.all(
      from(g in Grant,
        where: g.user_id == ^user.id and not is_nil(g.activated_at) and g.expires_at > ^now,
        order_by: [desc: g.inserted_at]
      )
    )
  end

  def revoke_connection(user, id) do
    with {:ok, id} <- Ecto.UUID.cast(id) do
      from(g in Grant, where: g.id == ^id and g.user_id == ^user.id) |> Repo.delete_all()
    end

    :ok
  end
end
