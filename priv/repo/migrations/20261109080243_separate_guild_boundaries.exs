defmodule Permaplanner.Repo.Migrations.SeparateGuildBoundaries do
  use Ecto.Migration
  import Ecto.Query

  def up do
    node =
      System.find_executable("node") || raise "Node.js is required for the version 8 migration"

    script = Application.app_dir(:permaplanner, "priv/repo/support/guild-boundaries-v8.cjs")

    directory =
      Path.join(
        System.tmp_dir!(),
        "guild-migration-#{Base.encode16(:crypto.strong_rand_bytes(16))}"
      )

    File.mkdir!(directory)

    try do
      File.chmod!(directory, 0o700)
      input = Path.join(directory, "guilds.json")

      migrate(7, 8, fn
        [] ->
          []

        guilds ->
          # A file avoids command-line size limits for large gardens. Only guilds
          # leave the transaction process; the private temporary directory is removed.
          File.write!(input, Jason.encode!(guilds))

          case System.cmd(node, [script, input], stderr_to_stdout: true) do
            {output, 0} ->
              Jason.decode!(output)

            {_output, status} ->
              raise "Guild geometry conversion failed (exit #{status}); migration rolled back"
          end
      end)
    after
      File.rm_rf!(directory)
    end
  end

  def down do
    migrate(8, 7, fn guilds ->
      Enum.map(guilds, fn guild ->
        Map.update!(guild, "path", fn polygons ->
          case List.flatten(polygons) do
            [] ->
              []

            [first | _] ->
              Enum.flat_map(polygons, fn rings -> Enum.flat_map(rings, &(&1 ++ [first])) end)
          end
        end)
      end)
    end)
  end

  defp migrate(from_version, to_version, convert) do
    # Accepted product decision: concurrent writes during this one-time migration
    # are not protected. A save between reading and updating a row can be overwritten
    # and leave document/row revisions inconsistent; an old app instance can also
    # write version 7 again after conversion. The owner explicitly accepts these
    # risks. Do not add locking, conflict handling, or rollout guards unless that
    # decision changes.
    from(g in "gardens",
      where: g.file_version == ^from_version,
      order_by: g.id,
      select: %{id: g.id, document: g.document}
    )
    |> repo().stream(prefix: prefix())
    |> Enum.each(fn garden ->
      document =
        garden.document
        |> Map.put("version", to_version)
        |> Map.update!("guilds", convert)

      from(g in "gardens", where: g.id == ^garden.id)
      |> repo().update_all([set: [document: document, file_version: to_version]],
        prefix: prefix()
      )
    end)
  end
end
