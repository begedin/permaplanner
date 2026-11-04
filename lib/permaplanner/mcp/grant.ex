defmodule Permaplanner.MCP.Grant do
  @moduledoc "The user's consent to a client's read-only access, independent of its credentials."
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "mcp_grants" do
    belongs_to(:user, Permaplanner.Accounts.User)
    field(:client_id, :string)
    field(:resource, :string)
    field(:activated_at, :utc_datetime_usec)
    field(:expires_at, :utc_datetime_usec)
    timestamps(type: :utc_datetime_usec)
  end
end
