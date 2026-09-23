defmodule PermaplannerWeb.GardenShareJSONTest do
  use ExUnit.Case, async: true

  alias Permaplanner.Gardens.Share
  alias PermaplannerWeb.GardenShareJSON

  @fixtures Path.expand("../fixtures/garden_share_summaries.json", __DIR__)
            |> File.read!()
            |> Jason.decode!()

  for fixture <- @fixtures do
    @guilds fixture["guilds"]
    @summary fixture["summary"]
    test "show returns the shared summary: #{fixture["name"]}" do
      guilds = @guilds
      summary = @summary

      assert GardenShareJSON.show(%{garden_name: "Backyard", guilds: guilds}) == %{
               gardenName: "Backyard",
               guilds: guilds,
               summary: summary
             }
    end
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
