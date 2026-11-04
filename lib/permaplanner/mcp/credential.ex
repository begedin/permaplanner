defmodule Permaplanner.MCP.Credential do
  @moduledoc "Individually indexed OAuth credentials; consumed refresh tokens remain for replay detection."
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "mcp_credentials" do
    belongs_to(:grant, Permaplanner.MCP.Grant)
    field(:kind, Ecto.Enum, values: [:code, :access, :refresh])
    field(:token_hash, :binary, redact: true)
    field(:expires_at, :utc_datetime_usec)
    field(:consumed_at, :utc_datetime_usec)
    field(:redirect_uri, :string)
    field(:code_challenge, :string)
  end
end
