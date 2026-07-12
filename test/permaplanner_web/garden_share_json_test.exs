defmodule PermaplannerWeb.GardenShareJSONTest do
  use ExUnit.Case, async: true

  alias Permaplanner.Gardens.Share
  alias PermaplannerWeb.GardenShareJSON

  @sample_guilds [
    %{
      "id" => "g1",
      "name" => "Edge guild",
      "mulchLevel" => 3,
      "note" => "North bed",
      "plants" => [
        %{
          "name" => "Thai Basil",
          "growthPhase" => "young",
          "vigor" => 4
        }
      ]
    }
  ]

  test "show returns garden name, guilds, and summary text" do
    result = GardenShareJSON.show(%{garden_name: "Backyard", guilds: @sample_guilds})

    assert result.gardenName == "Backyard"
    assert result.guilds == @sample_guilds
    assert result.summary =~ "Edge guild"
    assert result.summary =~ "Thai Basil"
  end

  test "index returns api share metadata list" do
    inserted_at = ~U[2026-06-15 10:00:00.000000Z]

    share = %Share{
      id: "share-1",
      inserted_at: inserted_at
    }

    assert GardenShareJSON.index(%{shares: [share]}) == %{
             shares: [
               %{
                 id: "share-1",
                 url: "/share/share-1",
                 createdAt: inserted_at
               }
             ]
           }
  end

  test "create returns api share metadata wrapper" do
    inserted_at = ~U[2026-06-15 10:00:00.000000Z]

    share = %Share{
      id: "share-1",
      inserted_at: inserted_at
    }

    assert GardenShareJSON.create(%{share: share}) == %{
             share: %{
               id: "share-1",
               url: "/share/share-1",
               createdAt: inserted_at
             }
           }
  end

  test "not_found returns error payload" do
    assert GardenShareJSON.not_found(%{}) == %{error: "not_found"}
  end
end
