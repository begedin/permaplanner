defmodule Permaplanner.Repo.Migrations.CreateShares do
  use Ecto.Migration

  def change do
    create table(:shares, primary_key: false) do
      add(:id, :binary_id, primary_key: true)
      add(:garden_id, references(:gardens, type: :binary_id, on_delete: :delete_all), null: false)
      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create(index(:shares, [:garden_id]))
  end
end
