defmodule Permaplanner.Gardens.GardenBackgroundImage do
  @moduledoc false

  use Ecto.Schema

  alias Permaplanner.Gardens.Garden

  @primary_key {:id, :binary_id, autogenerate: false}
  @foreign_key_type :binary_id

  schema "garden_background_images" do
    belongs_to :garden, Garden, define_field: false, foreign_key: :id, references: :id

    field :content_type, :string
    field :data, :binary

    timestamps(type: :utc_datetime_usec)
  end
end
