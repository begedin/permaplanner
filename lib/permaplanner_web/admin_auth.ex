defmodule PermaplannerWeb.AdminAuth do
  @moduledoc false
  import Plug.Conn
  alias Permaplanner.Accounts
  alias Permaplanner.Accounts.User

  def init(opts), do: opts

  def call(conn, _opts) do
    conn = put_resp_header(conn, "cache-control", "no-store")

    case authenticate(get_session(conn, "user_token")) do
      %User{} ->
        conn

      nil ->
        conn
        |> put_resp_content_type("text/plain")
        |> send_resp(404, "Not Found")
        |> halt()
    end
  end

  def authenticate(token) when is_binary(token) do
    case Accounts.get_user_by_session_token(token) do
      {%User{} = user, _} ->
        if User.totp_confirmed?(user) and
             user.id in Application.get_env(:permaplanner, :admin_user_ids, []) do
          user
        end

      _ ->
        nil
    end
  end

  def authenticate(_), do: nil
end
