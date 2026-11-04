defmodule Permaplanner.PlantCatalog do
  @moduledoc "Catalog data embedded at compile time so releases use the frontend's source of truth."

  @external_resource Path.expand("../../src/data/plantCatalog.json", __DIR__)
  @species @external_resource |> File.read!() |> Jason.decode!() |> Map.fetch!("species")
  @by_id Map.new(@species, &{&1["id"], &1})

  @search_index Enum.map(@species, fn species ->
                  text =
                    [species | species["cultivars"]]
                    |> Enum.flat_map(fn row ->
                      [row["id"], row["name"], row["name_latin"]] ++
                        Map.get(row, "functions", []) ++ Map.get(row, "layers", [])
                    end)
                    |> Enum.reject(&is_nil/1)
                    |> Enum.join(" ")
                    |> String.downcase()

                  {species, text}
                end)

  def resolve(plant) do
    species = Map.get(@by_id, plant["speciesId"], hd(@species))
    cultivar = Enum.find(species["cultivars"], &(&1["id"] == plant["cultivarId"]))
    species_override = Map.get(plant, "speciesOverride", %{})
    cultivar_override = Map.get(plant, "cultivarOverride", %{})

    traits =
      Map.take(species, ["functions", "layers", "blooming", "harvest"])
      |> Map.put("iconId", species["defaultIconId"])
      |> Map.merge(Map.take(species_override, ["functions", "layers", "iconId"]))
      |> Map.merge(Map.take(cultivar || %{}, ["functions", "layers", "blooming", "harvest"]))

    traits =
      if cultivar && cultivar["defaultIconId"],
        do: Map.put(traits, "iconId", cultivar["defaultIconId"]),
        else: traits

    traits
    |> Map.merge(Map.take(cultivar_override, ["functions", "layers", "iconId"]))
    |> Map.merge(%{
      "id" => plant["id"],
      "speciesId" => plant["speciesId"],
      "cultivarId" => plant["cultivarId"],
      "name" => Map.get(species_override, "name", species["name"]),
      "cultivar" => Map.get(cultivar_override, "name", cultivar && cultivar["name"]),
      "nameLatin" => species["name_latin"],
      "cultivarLatin" => cultivar && cultivar["name_latin"]
    })
  end

  def search(query, offset, limit) do
    terms = query |> String.downcase() |> String.split()

    matches =
      @search_index
      |> Enum.filter(fn {_species, text} -> Enum.all?(terms, &String.contains?(text, &1)) end)
      |> Enum.map(&elem(&1, 0))

    next_offset = offset + limit
    total = length(matches)

    %{
      "species" => Enum.slice(matches, offset, limit),
      "total" => total,
      "nextOffset" => if(next_offset < total, do: next_offset, else: nil)
    }
  end
end
