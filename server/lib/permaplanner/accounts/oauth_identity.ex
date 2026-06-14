defmodule Permaplanner.Accounts.OauthIdentity do
  @moduledoc false

  use Ecto.Schema

  alias Permaplanner.Accounts.User

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "oauth_identities" do
    field :provider, :string
    field :provider_user_id, :string
    field :provider_login, :string
    belongs_to :user, User

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end
end
