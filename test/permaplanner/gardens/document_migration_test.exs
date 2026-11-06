defmodule Permaplanner.Gardens.DocumentMigrationTest do
  use ExUnit.Case, async: false
  alias Ecto.Adapters.SQL.Sandbox
  alias Permaplanner.Repo

  @migration Permaplanner.Repo.Migrations.AddLandmarksAndScaleUnits
  @version 20_261_106_211_236
  Code.require_file(
    "../../../priv/repo/migrations/20261106211236_add_landmarks_and_scale_units.exs",
    __DIR__
  )

  setup do
    # An isolated schema exercises the real migration with separate transactions,
    # without rolling back or rewriting any application test data.
    Sandbox.mode(Repo, :auto)
    schema = "migration_test_#{System.unique_integer([:positive])}"
    Repo.query!("CREATE SCHEMA #{schema}")

    Repo.query!("""
    CREATE TABLE #{schema}.gardens (
      id text PRIMARY KEY,
      file_version integer NOT NULL,
      document jsonb NOT NULL,
      sync_revision integer NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
    """)

    on_exit(fn ->
      Repo.query!("DROP SCHEMA #{schema} CASCADE")
      Sandbox.mode(Repo, :manual)
    end)

    document = %{
      "version" => 5,
      "syncRevision" => 3,
      "mapScale" => %{
        "start" => %{"x" => 0, "y" => 0},
        "end" => %{"x" => 100, "y" => 0},
        "linePhysicalLength" => 10
      },
      "guilds" => [%{"id" => "bed", "path" => [%{"x" => 12, "y" => 34}]}],
      "backgroundImage" => "preserved",
      "note" => "original"
    }

    Repo.insert_all(
      "gardens",
      [%{id: "garden", file_version: 5, document: document, sync_revision: 3}],
      prefix: schema
    )

    [[timestamp]] = Repo.query!("SELECT updated_at FROM #{schema}.gardens").rows
    {:ok, schema: schema, document: document, timestamp: timestamp}
  end

  test "upgrades and rolls back documents while preserving geometry and revisions",
       %{schema: schema, document: document, timestamp: timestamp} do
    assert :ok = Ecto.Migrator.up(Repo, @version, @migration, prefix: schema, log: false)

    expected =
      document
      |> Map.put("version", 6)
      |> Map.put("landmarks", [])
      |> put_in(["mapScale", "unit"], "unspecified")

    assert [[^expected, 6, 3, ^timestamp]] =
             Repo.query!(
               "SELECT document, file_version, sync_revision, updated_at FROM #{schema}.gardens"
             ).rows

    assert :ok = Ecto.Migrator.down(Repo, @version, @migration, prefix: schema, log: false)

    assert [[^document, 5, 3, ^timestamp]] =
             Repo.query!(
               "SELECT document, file_version, sync_revision, updated_at FROM #{schema}.gardens"
             ).rows
  end
end
