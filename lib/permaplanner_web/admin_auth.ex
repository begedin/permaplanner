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

  def on_mount(:admin, _params, session, socket) do
    case authenticate(session["user_token"]) do
      nil ->
        {:halt, Phoenix.LiveView.redirect(socket, to: "/admin")}

      user ->
        socket =
          socket
          |> Phoenix.Component.assign(token: session["user_token"], admin_email: user.email)
          |> Phoenix.LiveView.attach_hook(:admin_params, :handle_params, &authorize_socket/3)
          |> Phoenix.LiveView.attach_hook(:admin_events, :handle_event, &authorize_socket/3)

        {:cont, socket}
    end
  end

  defp authorize_socket(_event_or_params, _payload_or_uri, socket) do
    if authenticate(socket.assigns.token) do
      {:cont, socket}
    else
      {:halt, Phoenix.LiveView.redirect(socket, to: "/admin")}
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
