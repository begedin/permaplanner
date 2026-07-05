defmodule Permaplanner.Repo.Migrations.RemoveImportSourceFromGardens do
  use Ecto.Migration

  def change do
    alter table(:gardens) do
      remove :import_source
    end
  end
end
