defmodule Permaplanner.Gardens.Snapshot do
  @moduledoc "A resolved, image-free read model of a saved garden."
  alias Permaplanner.{Gardens, PlantCatalog}

  def build(garden, guilds \\ nil) do
    plants = Enum.map(garden.document["plants"], &PlantCatalog.resolve/1)
    by_id = Map.new(plants, &{&1["id"], &1})

    guilds =
      Enum.map(guilds || garden.document["guilds"], fn guild ->
        Map.update!(guild, "plants", fn instances ->
          Enum.map(instances, &Map.put(&1, "plant", by_id[&1["plantId"]]))
        end)
      end)

    garden
    |> Gardens.garden_summary()
    |> Map.merge(%{mapScale: garden.document["mapScale"], plants: plants, guilds: guilds})
  end
end
