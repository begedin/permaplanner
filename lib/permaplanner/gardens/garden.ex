defmodule Permaplanner.Gardens.Garden do
  @moduledoc false

  use Ecto.Schema

  alias Permaplanner.Accounts.User
  alias Permaplanner.Gardens.GardenBackgroundImage

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @current_file_version 5

  schema "gardens" do
    field :name, :string
    field :document, :map
    field :sync_revision, :integer, default: 0
    field :file_version, :integer, default: @current_file_version
    field :import_source, :string
    belongs_to :user, User
    has_one :background_image, GardenBackgroundImage, foreign_key: :id, references: :id

    timestamps(type: :utc_datetime_usec)
  end

  def current_file_version, do: @current_file_version
end
