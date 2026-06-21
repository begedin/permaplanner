defmodule Permaplanner.Accounts.UserRecoveryCode do
  @moduledoc false

  use Ecto.Schema

  alias Permaplanner.Accounts.User

  @primary_key {:id, :id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "user_recovery_codes" do
    field :code_hash, :string
    field :used_at, :utc_datetime_usec
    belongs_to :user, User

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end
end
