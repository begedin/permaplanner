defmodule Permaplanner.Gardens.DocumentMigrationTest do
  use ExUnit.Case, async: false
  import Ecto.Query
  alias Ecto.Adapters.SQL.Sandbox
  alias Permaplanner.Repo

  @migration Permaplanner.Repo.Migrations.AddLandmarksAndScaleUnits
  @version 20_261_106_211_236
  Code.require_file(
    "../../../priv/repo/migrations/20261106211236_add_landmarks_and_scale_units.exs",
    __DIR__
  )

  @border_migration Permaplanner.Repo.Migrations.AddPlotBorder
  @border_version 20_261_108_054_137
  Code.require_file("../../../priv/repo/migrations/20261108054137_add_plot_border.exs", __DIR__)

  @guild_migration Permaplanner.Repo.Migrations.SeparateGuildBoundaries
  @guild_version 20_261_109_080_243
  Code.require_file(
    "../../../priv/repo/migrations/20261109080243_separate_guild_boundaries.exs",
    __DIR__
  )

  @feature_migration Permaplanner.Repo.Migrations.UnifyFeaturePaths
  @feature_version 20_261_110_160_055
  Code.require_file(
    "../../../priv/repo/migrations/20261110160055_unify_feature_paths.exs",
    __DIR__
  )

  @paths_migration Permaplanner.Repo.Migrations.AddGardenPaths
  @paths_version 20_261_111_085_623
  Code.require_file("../../../priv/repo/migrations/20261111085623_add_garden_paths.exs", __DIR__)

  @placement_migration Permaplanner.Repo.Migrations.MarkExplicitPlantPlacements
  @placement_version 20_261_112_215_926
  if not Code.ensure_loaded?(@placement_migration) do
    Code.require_file(
      "../../../priv/repo/migrations/20261112215926_mark_explicit_plant_placements.exs",
      __DIR__
    )
  end

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

    assert :ok =
             Ecto.Migrator.up(Repo, @border_version, @border_migration,
               prefix: schema,
               log: false
             )

    bordered = expected |> Map.put("version", 7) |> Map.put("plotBorder", [])

    assert [[^bordered, 7, 3, ^timestamp]] =
             Repo.query!(
               "SELECT document, file_version, sync_revision, updated_at FROM #{schema}.gardens"
             ).rows

    assert :ok =
             Ecto.Migrator.down(Repo, @border_version, @border_migration,
               prefix: schema,
               log: false
             )

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

  # Slow integration exception: real migration DDL and the Node geometry converter
  # verify persisted boundary/hole conversion; mocks would miss the migration contract.
  test "separates retraced boundaries and holes without changing metadata", %{
    schema: schema,
    document: document,
    timestamp: timestamp
  } do
    square = fn x, y, size ->
      Enum.map([{x, y}, {x + size, y}, {x + size, y + size}, {x, y + size}, {x, y}], fn {x, y} ->
        %{"x" => x, "y" => y}
      end)
    end

    outer = square.(0, 0, 30)
    hole = Enum.reverse(square.(10, 10, 10))

    touching_hole =
      Enum.map([{30, 30}, {26, 24}, {24, 26}, {30, 30}], fn {x, y} -> %{"x" => x, "y" => y} end)

    island = square.(12, 12, 2)
    separate = square.(50, 0, 10)
    legacy = Enum.flat_map([outer, hole, touching_hole, island, separate], &(&1 ++ [hd(outer)]))

    guilds = [
      %{"id" => "bed", "path" => legacy},
      %{"id" => "unplaced", "path" => []},
      %{"id" => "clockwise", "path" => Enum.reverse(separate)},
      %{"id" => "degenerate", "path" => [%{"x" => 1, "y" => 1}]}
    ]

    old = document |> Map.put("version", 7) |> Map.put("guilds", guilds)

    from(g in "gardens", where: g.id == "garden")
    |> Repo.update_all([set: [document: old, file_version: 7]], prefix: schema)

    assert :ok =
             Ecto.Migrator.up(Repo, @guild_version, @guild_migration, prefix: schema, log: false)

    expected =
      old
      |> Map.put("version", 8)
      |> Map.put("guilds", [
        %{"id" => "bed", "path" => [[outer, touching_hole, hole], [island], [separate]]},
        %{"id" => "unplaced", "path" => []},
        %{"id" => "clockwise", "path" => [[separate]]},
        %{"id" => "degenerate", "path" => []}
      ])

    assert [[^expected, 8, 3, ^timestamp]] =
             Repo.query!(
               "SELECT document, file_version, sync_revision, updated_at FROM #{schema}.gardens"
             ).rows

    assert :ok =
             Ecto.Migrator.down(Repo, @guild_version, @guild_migration,
               prefix: schema,
               log: false
             )

    [[rolled_back]] = Repo.query!("SELECT document FROM #{schema}.gardens").rows

    assert hd(rolled_back["guilds"])["path"] ==
             Enum.flat_map([outer, touching_hole, hole, island, separate], &(&1 ++ [hd(outer)]))
  end

  test "matches file-import conversion for the shared legacy geometry corpus", %{
    schema: schema,
    document: document,
    timestamp: timestamp
  } do
    cases =
      File.read!(Path.expand("../../fixtures/guild-boundaries-v8.json", __DIR__))
      |> Jason.decode!()

    old =
      document
      |> Map.put("version", 7)
      |> Map.put("guilds", Enum.map(cases, fn c -> %{"id" => c["name"], "path" => c["path"]} end))

    from(g in "gardens", where: g.id == "garden")
    |> Repo.update_all([set: [document: old, file_version: 7]], prefix: schema)

    assert :ok =
             Ecto.Migrator.up(Repo, @guild_version, @guild_migration, prefix: schema, log: false)

    expected =
      old
      |> Map.put("version", 8)
      |> Map.put(
        "guilds",
        Enum.map(cases, fn c -> %{"id" => c["name"], "path" => c["expected"]} end)
      )

    assert [[^expected, 8, 3, ^timestamp]] =
             Repo.query!(
               "SELECT document, file_version, sync_revision, updated_at FROM #{schema}.gardens"
             ).rows
  end

  # Slow integration exception: real DDL/transactions and two Node invocations
  # verify that a successful row is undone when the next real conversion fails.
  # Mocking the converter or repository would lose this cross-process rollback check.
  test "rolls back earlier rows when a legacy geometry cannot be converted", %{
    schema: schema,
    document: document
  } do
    old = Map.put(document, "version", 7)

    from(g in "gardens", where: g.id == "garden")
    |> Repo.update_all([set: [document: old, file_version: 7]], prefix: schema)

    invalid = put_in(old, ["guilds", Access.at(0), "path"], [%{"x" => "invalid", "y" => 0}])

    Repo.insert_all(
      "gardens",
      [%{id: "zz-invalid", file_version: 7, document: invalid, sync_revision: 3}],
      prefix: schema
    )

    before =
      Repo.query!(
        "SELECT id, document, file_version, sync_revision, updated_at FROM #{schema}.gardens ORDER BY id"
      ).rows

    assert_raise RuntimeError, ~r/Guild geometry conversion failed/, fn ->
      Ecto.Migrator.up(Repo, @guild_version, @guild_migration, prefix: schema, log: false)
    end

    assert Repo.query!(
             "SELECT id, document, file_version, sync_revision, updated_at FROM #{schema}.gardens ORDER BY id"
           ).rows == before
  end

  test "converts feature geometry while preserving transforms, revisions and metadata", %{
    schema: schema,
    document: document,
    timestamp: timestamp
  } do
    border = [%{"x" => 0, "y" => 0}, %{"x" => 100, "y" => 0}, %{"x" => 50, "y" => 80}]

    landmark = %{
      "id" => "shed",
      "name" => "Shed",
      "x" => 100,
      "y" => 50,
      "width" => 80,
      "height" => 40,
      "rotation" => 35
    }

    old =
      document
      |> Map.put("version", 8)
      |> Map.put("landmarks", [landmark])
      |> Map.put("plotBorder", border)

    from(g in "gardens", where: g.id == "garden")
    |> Repo.update_all([set: [document: old, file_version: 8]], prefix: schema)

    assert :ok =
             Ecto.Migrator.up(Repo, @feature_version, @feature_migration,
               prefix: schema,
               log: false
             )

    rectangle =
      Enum.map([{-0.5, -0.5}, {0.5, -0.5}, {0.5, 0.5}, {-0.5, 0.5}, {-0.5, -0.5}], fn {x, y} ->
        %{"x" => x, "y" => y}
      end)

    expected =
      old
      |> Map.put("version", 9)
      |> Map.put("landmarks", [Map.put(landmark, "path", [[rectangle]])])
      |> Map.put("plotBorder", [[border ++ [hd(border)]]])

    assert [%{document: ^expected, file_version: 9, sync_revision: 3, updated_at: ^timestamp}] =
             Repo.all(
               from(g in "gardens",
                 select: map(g, [:document, :file_version, :sync_revision, :updated_at])
               ),
               prefix: schema
             )
  end

  test "adds paths without changing existing data or revisions", %{
    schema: schema,
    document: document,
    timestamp: timestamp
  } do
    old = Map.put(document, "version", 9)

    from(g in "gardens", where: g.id == "garden")
    |> Repo.update_all([set: [document: old, file_version: 9]], prefix: schema)

    assert :ok =
             Ecto.Migrator.up(Repo, @paths_version, @paths_migration, prefix: schema, log: false)

    expected = old |> Map.put("version", 10) |> Map.put("paths", [])

    assert [%{document: ^expected, file_version: 10, sync_revision: 3, updated_at: ^timestamp}] =
             Repo.all(
               from(g in "gardens",
                 select: map(g, [:document, :file_version, :sync_revision, :updated_at])
               ),
               prefix: schema
             )
  end

  test "marks legacy placeholders unplaced without losing geometry, notes, or revisions", %{
    schema: schema,
    document: document,
    timestamp: timestamp
  } do
    plants = [
      %{
        "id" => "placeholder",
        "x" => 35,
        "y" => 45,
        "width" => 16,
        "height" => 16,
        "note" => "Keep me"
      },
      %{"id" => "drawn", "x" => 30, "y" => 40, "width" => 48, "height" => 48},
      %{"id" => "unplaced", "x" => 0, "y" => 0, "width" => 0, "height" => 0},
      %{"id" => "explicit", "x" => 1, "y" => 2, "width" => 16, "height" => 16, "placed" => true}
    ]

    old = document |> Map.put("version", 10) |> put_in(["guilds", Access.at(0), "plants"], plants)

    from(g in "gardens", where: g.id == "garden")
    |> Repo.update_all([set: [document: old, file_version: 10]], prefix: schema)

    assert :ok =
             Ecto.Migrator.up(Repo, @placement_version, @placement_migration,
               prefix: schema,
               log: false
             )

    expected_plants =
      Enum.zip_with(plants, [false, true, false, true], &Map.put(&1, "placed", &2))

    expected =
      old |> Map.put("version", 11) |> put_in(["guilds", Access.at(0), "plants"], expected_plants)

    assert [%{document: ^expected, file_version: 11, sync_revision: 3, updated_at: ^timestamp}] =
             Repo.all(
               from(g in "gardens",
                 select: map(g, [:document, :file_version, :sync_revision, :updated_at])
               ),
               prefix: schema
             )
  end
end
