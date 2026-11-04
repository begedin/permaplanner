defmodule PermaplannerWeb.MCPController do
  use PermaplannerWeb, :controller
  alias Permaplanner.MCP.{OAuth, Protocol}

  plug :validate_origin
  plug :authenticate
  plug :validate_version

  def message(conn, _params) do
    case Protocol.handle(conn.assigns.current_user, conn.body_params) do
      {:reply, response} -> json(conn, response)
      {:invalid, response} -> conn |> put_status(:bad_request) |> json(response)
      :accepted -> send_resp(conn, 202, "")
    end
  end

  def unsupported(conn, _), do: conn |> put_resp_header("allow", "POST") |> send_resp(405, "")

  defp validate_origin(conn, _) do
    allowed = Application.get_env(:permaplanner, :mcp_allowed_origins, [OAuth.base_url()])

    case get_req_header(conn, "origin") do
      [] ->
        conn

      [origin] ->
        if origin in allowed, do: conn, else: conn |> send_resp(403, "Forbidden") |> halt()

      _ ->
        conn |> send_resp(403, "Forbidden") |> halt()
    end
  end

  defp authenticate(conn, _) do
    user =
      case get_req_header(conn, "authorization") do
        ["Bearer " <> token] -> OAuth.user_for_token(token)
        _ -> nil
      end

    conn = put_resp_header(conn, "cache-control", "no-store")

    if user do
      assign(conn, :current_user, user)
    else
      conn
      |> put_resp_header(
        "www-authenticate",
        ~s(Bearer resource_metadata="#{OAuth.base_url()}/.well-known/oauth-protected-resource", scope="gardens:read")
      )
      |> put_status(:unauthorized)
      |> json(%{error: "unauthorized"})
      |> halt()
    end
  end

  defp validate_version(conn, _) do
    case get_req_header(conn, "mcp-protocol-version") do
      [] -> conn
      [version] -> if version in Protocol.versions(), do: conn, else: invalid_version(conn)
      _ -> invalid_version(conn)
    end
  end

  defp invalid_version(conn),
    do:
      conn |> put_status(:bad_request) |> json(%{error: "unsupported_protocol_version"}) |> halt()
end
