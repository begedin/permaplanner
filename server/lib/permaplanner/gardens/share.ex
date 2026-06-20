defmodule Permaplanner.Gardens.Share do
  @moduledoc false

  use Ecto.Schema

  alias Permaplanner.Gardens.Garden

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "shares" do
    belongs_to(:garden, Garden)

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end
end
