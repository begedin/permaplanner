defmodule PermaplannerWeb.UserAuth do
  @moduledoc false

  import Plug.Conn
  import Phoenix.Controller

  alias Permaplanner.Accounts
  alias Permaplanner.Accounts.User

  @session_token_key "user_token"
  @pending_user_id_key "pending_user_id"

  def init(action), do: action

  def call(conn, action) do
    apply(__MODULE__, action, [conn, []])
  end

  def fetch_current_user(conn, _opts) do
    user_token = get_session(conn, @session_token_key)

    conn =
      case user_token && Accounts.get_user_by_session_token(user_token) do
        {user, _token} -> assign(conn, :current_user, user)
        _ -> assign(conn, :current_user, nil)
      end

    pending_user_id = get_session(conn, @pending_user_id_key)

    case pending_user_id do
      nil ->
        assign(conn, :pending_user, nil)

      id ->
        case Accounts.get_user(id) do
          %User{} = user ->
            assign(conn, :pending_user, user)

          nil ->
            conn
            |> delete_session(@pending_user_id_key)
            |> assign(:pending_user, nil)
        end
    end
  end

  def require_authenticated(conn, _opts) do
    if conn.assigns[:current_user] do
      conn
    else
      conn |> put_status(:unauthorized) |> json(%{error: "unauthorized"}) |> halt()
    end
  end

  def require_pending_user(conn, _opts) do
    if conn.assigns[:pending_user] do
      conn
    else
      conn |> put_status(:unauthorized) |> json(%{error: "unauthorized"}) |> halt()
    end
  end

  def require_totp_confirmed(conn, _opts) do
    case conn.assigns[:current_user] do
      %User{} = user ->
        if User.totp_confirmed?(user) do
          conn
        else
          conn |> put_status(:forbidden) |> json(%{error: "totp_required"}) |> halt()
        end

      _ ->
        conn |> put_status(:unauthorized) |> json(%{error: "unauthorized"}) |> halt()
    end
  end

  def log_in_user(conn, user) do
    token = Accounts.generate_user_session_token(user)

    conn
    |> renew_session()
    |> put_session(@session_token_key, token)
    |> delete_session(@pending_user_id_key)
  end

  def set_pending_user(conn, user) do
    conn
    |> renew_session()
    |> put_session(@pending_user_id_key, user.id)
    |> delete_session(@session_token_key)
  end

  def log_out_user(conn) do
    user_token = get_session(conn, @session_token_key)
    user_token && Accounts.delete_user_session_token(user_token)

    conn
    |> renew_session()
    |> delete_session(@session_token_key)
    |> delete_session(@pending_user_id_key)
  end

  defp renew_session(conn) do
    conn
    |> configure_session(renew: true)
    |> clear_session()
  end
end
