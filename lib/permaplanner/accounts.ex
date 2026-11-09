defmodule Permaplanner.Accounts do
  @moduledoc false

  import Ecto.Query, warn: false

  alias Permaplanner.Accounts.{User, UserRecoveryCode, UserToken}
  alias Permaplanner.Crypto
  alias Permaplanner.Repo

  @recovery_code_count 8
  @recovery_code_length 10

  def get_user!(id), do: Repo.get!(User, id)

  def get_user(id), do: Repo.get(User, id)

  def get_user_by_email(email) when is_binary(email) do
    Repo.get_by(User, email: String.downcase(String.trim(email)))
  end

  def register_user(attrs) do
    %User{}
    |> User.registration_changeset(attrs)
    |> Ecto.Changeset.put_change(:totp_secret, generate_totp_secret())
    |> Repo.insert()
  end

  def ensure_totp_secret(%User{} = user) do
    case decrypt_totp_secret(user) do
      {:ok, _} -> {:ok, user}
      {:error, _} -> reset_totp_secret(user)
    end
  end

  def totp_setup_for_user(%User{} = user) do
    with {:ok, secret} <- decrypt_totp_secret(user) do
      uri = NimbleTOTP.otpauth_uri(user.email, secret, issuer: "Permaplanner")

      qr_svg =
        uri
        |> EQRCode.encode()
        |> EQRCode.svg(width: 200, color: "#3d2f24", background_color: "#FFF")

      {:ok,
       %{
         secret: Base.encode32(secret, padding: false),
         uri: uri,
         qr_svg: qr_svg
       }}
    end
  end

  def confirm_totp_registration(%User{} = user, code) when is_binary(code) do
    with {:ok, secret} <- decrypt_totp_secret(user),
         true <- valid_totp?(secret, code) do
      prepared_codes = prepare_recovery_codes(user)

      Repo.transaction(fn ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        query =
          from(u in User, where: u.id == ^user.id and is_nil(u.totp_confirmed_at), select: u)

        case Repo.update_all(query, set: [totp_confirmed_at: now, updated_at: now]) do
          {1, [confirmed]} ->
            Enum.each(prepared_codes, fn {_code, row} -> Repo.insert!(row) end)
            {confirmed, Enum.map(prepared_codes, &elem(&1, 0))}

          {0, []} ->
            Repo.rollback(:already_confirmed)
        end
      end)
      |> case do
        {:ok, {confirmed, codes}} -> {:ok, confirmed, codes}
        error -> error
      end
    else
      false -> {:error, :invalid_totp}
      {:error, _} = err -> err
    end
  end

  def authenticate_password(email, password) do
    user = get_user_by_email(email)

    cond do
      user && User.verify_password(user, password) -> {:ok, user}
      user -> {:error, :invalid_credentials}
      true -> {:error, :invalid_credentials}
    end
  end

  def verify_login_totp(%User{} = user, code) when is_binary(code) do
    with {:ok, secret} <- decrypt_totp_secret(user),
         true <- valid_totp?(secret, code) do
      :ok
    else
      false -> {:error, :invalid_totp}
      {:error, _} = err -> err
    end
  end

  def verify_recovery_code(%User{} = user, code) when is_binary(code) do
    normalized = String.upcase(String.trim(code))

    query =
      from(c in UserRecoveryCode,
        where: c.user_id == ^user.id and is_nil(c.used_at),
        order_by: [asc: c.id]
      )

    Repo.all(query)
    |> Enum.find(fn row -> Bcrypt.verify_pass(normalized, row.code_hash) end)
    |> case do
      nil ->
        {:error, :invalid_recovery_code}

      row ->
        {count, _} =
          from(c in UserRecoveryCode, where: c.id == ^row.id and is_nil(c.used_at))
          |> Repo.update_all(
            set: [used_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)]
          )

        if count == 1, do: :ok, else: {:error, :invalid_recovery_code}
    end
  end

  def generate_user_session_token(user) do
    {token, user_token} = UserToken.build_session_token(user)
    Repo.insert!(user_token)
    token
  end

  def get_user_by_session_token(token) when is_binary(token) do
    case UserToken.verify_session_token_query(token) do
      nil -> nil
      query -> Repo.one(query)
    end
  end

  def delete_user_session_token(token) when is_binary(token) do
    case Base.url_decode64(token, padding: false) do
      {:ok, decoded} ->
        hashed = :crypto.hash(:sha256, decoded)

        from(t in UserToken, where: t.context == "session" and t.token == ^hashed)
        |> Repo.delete_all()

      :error ->
        :ok
    end
  end

  def user_json(%User{} = user) do
    %{
      id: user.id,
      email: user.email,
      totpConfirmed: User.totp_confirmed?(user)
    }
  end

  defp reset_totp_secret(user) do
    user
    |> Ecto.Changeset.change(totp_secret: generate_totp_secret())
    |> Repo.update()
  end

  defp generate_totp_secret do
    :crypto.strong_rand_bytes(20) |> Crypto.encrypt()
  end

  defp decrypt_totp_secret(%User{totp_secret: secret}) when is_binary(secret) do
    case Crypto.decrypt(secret) do
      {:ok, plaintext} -> {:ok, plaintext}
      :error -> {:error, :invalid_totp_secret}
    end
  end

  defp decrypt_totp_secret(_), do: {:error, :invalid_totp_secret}

  defp valid_totp?(secret, code) do
    NimbleTOTP.valid?(secret, normalize_totp_code(code))
  end

  defp normalize_totp_code(code) do
    code |> String.trim() |> String.replace(" ", "")
  end

  # Hashing is CPU intensive; prepare outside the transaction and user lock.
  defp prepare_recovery_codes(user) do
    for _ <- 1..@recovery_code_count do
      code = random_recovery_code()
      {code, %UserRecoveryCode{user_id: user.id, code_hash: Bcrypt.hash_pwd_salt(code)}}
    end
  end

  defp random_recovery_code do
    :crypto.strong_rand_bytes(@recovery_code_length)
    |> Base.encode32(padding: false, case: :upper)
    |> binary_part(0, @recovery_code_length)
  end
end
