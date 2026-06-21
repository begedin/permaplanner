defmodule PermaplannerWeb.AuthController do
  use PermaplannerWeb, :controller

  alias Permaplanner.Accounts
  alias PermaplannerWeb.UserAuth

  def session(conn, _params) do
    case conn.assigns[:current_user] do
      nil -> conn |> put_status(:unauthorized) |> json(%{error: "unauthorized"})
      user -> json(conn, %{user: Accounts.user_json(user)})
    end
  end

  def register(conn, %{"email" => email, "password" => password}) do
    case Accounts.register_user(%{email: email, password: password}) do
      {:ok, user} ->
        case Accounts.totp_setup_for_user(user) do
          {:ok, totp} ->
            conn
            |> UserAuth.set_pending_user(user)
            |> put_status(:created)
            |> json(%{totp: %{uri: totp.uri, secret: totp.secret, qrSvg: totp.qr_svg}})

          {:error, _} ->
            conn |> put_status(:internal_server_error) |> json(%{error: "totp_setup_failed"})
        end

      {:error, %Ecto.Changeset{} = changeset} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "validation_failed", fields: errors_on(changeset)})
    end
  end

  def register(conn, _params) do
    conn |> put_status(:bad_request) |> json(%{error: "invalid_request"})
  end

  def register_totp(conn, %{"code" => code}) do
    user = conn.assigns.pending_user

    case Accounts.confirm_totp_registration(user, code) do
      {:ok, confirmed_user, recovery_codes} ->
        conn
        |> UserAuth.log_in_user(confirmed_user)
        |> json(%{user: Accounts.user_json(confirmed_user), recoveryCodes: recovery_codes})

      {:error, :invalid_totp} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "invalid_totp"})

      {:error, _} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "totp_setup_failed"})
    end
  end

  def register_totp(conn, _params) do
    conn |> put_status(:bad_request) |> json(%{error: "invalid_request"})
  end

  def login(conn, %{"email" => email, "password" => password}) do
    case Accounts.authenticate_password(email, password) do
      {:ok, user} ->
        conn
        |> UserAuth.set_pending_user(user)
        |> json(%{requiresTotp: true})

      {:error, :invalid_credentials} ->
        conn |> put_status(:unauthorized) |> json(%{error: "invalid_credentials"})
    end
  end

  def login(conn, _params) do
    conn |> put_status(:bad_request) |> json(%{error: "invalid_request"})
  end

  def login_totp(conn, %{"code" => code}) do
    user = conn.assigns.pending_user

    case Accounts.verify_login_totp(user, code) do
      :ok ->
        conn
        |> UserAuth.log_in_user(user)
        |> json(%{user: Accounts.user_json(user)})

      {:error, :invalid_totp} ->
        case Accounts.verify_recovery_code(user, code) do
          :ok ->
            conn
            |> UserAuth.log_in_user(user)
            |> json(%{user: Accounts.user_json(user)})

          {:error, _} ->
            conn |> put_status(:unprocessable_entity) |> json(%{error: "invalid_totp"})
        end
    end
  end

  def login_totp(conn, _params) do
    conn |> put_status(:bad_request) |> json(%{error: "invalid_request"})
  end

  def logout(conn, _params) do
    conn
    |> UserAuth.log_out_user()
    |> send_resp(:no_content, "")
  end

  def github(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  defp errors_on(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
