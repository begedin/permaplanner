defmodule Permaplanner.Repo.Migrations.MarkExplicitPlantPlacements do
  use Ecto.Migration
  import Ecto.Query

  def up do
    from(g in "gardens",
      where: g.file_version == 10,
      select: %{id: g.id, document: g.document},
      lock: "FOR UPDATE"
    )
    |> repo().stream(prefix: prefix())
    |> Enum.each(fn garden ->
      document =
        garden.document
        |> Map.put("version", 11)
        |> Map.update!("guilds", fn guilds ->
          Enum.map(guilds, fn guild ->
            Map.update!(guild, "plants", fn plants ->
              Enum.map(plants, fn plant ->
                # The old add-plant action assigned every individual a 16x16 placeholder.
                # Keep coordinates intact, but only retain non-placeholder placements.
                placed =
                  plant["width"] > 0 and plant["height"] > 0 and
                    not (plant["width"] == 16 and plant["height"] == 16)

                Map.put_new(plant, "placed", placed)
              end)
            end)
          end)
        end)

      from(g in "gardens", where: g.id == ^garden.id)
      |> repo().update_all([set: [document: document, file_version: 11]], prefix: prefix())
    end)
  end

  def down do
    raise "Removing explicit placement state would restore legacy placeholder placements"
  end
end
