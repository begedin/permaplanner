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
    |> Map.merge(%{
      mapScale: garden.document["mapScale"],
      landmarks: garden.document["landmarks"],
      paths: garden.document["paths"],
      plotBorder: garden.document["plotBorder"],
      coordinateSystem: %{
        axes: "x right, y down",
        pathPosition:
          "path bounding-box centre; local geometry and rotation use the landmark conventions",
        landmarkPosition: "path bounding-box centre",
        landmarkPath:
          "local coordinates scaled by width/height, then rotated and translated by x/y",
        featurePaths: "polygons containing an exterior ring followed by hole rings",
        landmarkRotation: "clockwise degrees",
        dimensions:
          "map coordinates; divide by scale-line coordinate length and multiply by linePhysicalLength to get physical units",
        north: "unknown"
      },
      plants: plants,
      guilds: guilds
    })
  end
end
