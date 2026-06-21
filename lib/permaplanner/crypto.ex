defmodule Permaplanner.Crypto do
  @moduledoc false

  @aad "permaplanner-totp"

  def encrypt(plaintext) when is_binary(plaintext) do
    iv = :crypto.strong_rand_bytes(12)
    key = encryption_key()
    {cipher, tag} = :crypto.crypto_one_time_aead(:aes_256_gcm, key, iv, plaintext, @aad, true)
    iv <> tag <> cipher
  end

  def decrypt(blob) when is_binary(blob) and byte_size(blob) > 28 do
    <<iv::binary-size(12), tag::binary-size(16), cipher::binary>> = blob
    key = encryption_key()

    case :crypto.crypto_one_time_aead(:aes_256_gcm, key, iv, cipher, @aad, tag, false) do
      plaintext when is_binary(plaintext) -> {:ok, plaintext}
      :error -> :error
    end
  end

  def decrypt(_), do: :error

  defp encryption_key do
    raw =
      System.get_env("TOTP_ENCRYPTION_KEY") ||
        Application.get_env(:permaplanner, PermaplannerWeb.Endpoint)[:secret_key_base]

    :crypto.hash(:sha256, raw)
  end
end
