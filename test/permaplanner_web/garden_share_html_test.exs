defmodule PermaplannerWeb.GardenShareHTMLTest do
  use ExUnit.Case, async: true

  alias PermaplannerWeb.GardenShareHTML

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

  test "guild_content renders guild name, plants, mulch, and note" do
    text = GardenShareHTML.guild_content(@sample_guilds)

    assert text =~ ~r/Edge guild[\s\S]*- plants:[\s\S]*Thai Basil/
    assert text =~ "condition: Healthy (4/5)"
    assert text =~ "stage: Young"
    assert text =~ "mulch level: 3/5"
    assert text =~ "note: North bed"
  end

  test "render produces share page html" do
    html = GardenShareHTML.render("my-garden", @sample_guilds)

    assert html =~ "<title>Permaplanner Guilds (my-garden)</title>"
    assert html =~ "Garden: my-garden · Guilds: 1"
    assert html =~ "Thai Basil"
  end

  test "render shows (no guilds) when guild list is empty" do
    html = GardenShareHTML.render("empty", [])

    assert html =~ "Guilds: 0"
    assert html =~ "(no guilds)"
  end
end
