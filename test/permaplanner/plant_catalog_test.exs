defmodule Permaplanner.PlantCatalogTest do
  use ExUnit.Case, async: true
  alias Permaplanner.PlantCatalog

  @external_resource Path.expand("../fixtures/plant_resolution.json", __DIR__)
  @fixtures @external_resource |> File.read!() |> Jason.decode!()

  for fixture <- @fixtures do
    @fixture fixture
    test "shared resolution contract: #{@fixture["name"]}" do
      resolved =
        Map.merge(%{"blooming" => nil, "harvest" => nil}, PlantCatalog.resolve(@fixture["plant"]))

      assert resolved == @fixture["expected"]
    end
  end

  test "search indexes only names, IDs, roles and layers, not JSON keys or icon metadata" do
    for query <- ["functions", "defaultIconId", "cultivars", "blooming", "seedling"] do
      assert %{"species" => [], "total" => 0, "nextOffset" => nil} =
               PlantCatalog.search(query, 0, 20)
    end

    assert %{"species" => [%{"id" => "lawsons_cypress"}]} =
             PlantCatalog.search("CHAMAECYPARIS ellwoodii", 0, 20)

    assert %{"species" => [_ | _]} = PlantCatalog.search("nitrogen fixer", 0, 20)
  end
end
