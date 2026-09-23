defmodule PermaplannerWeb.GardenShareHTMLTest do
  use ExUnit.Case, async: true

  alias PermaplannerWeb.GardenShareHTML

  @fixtures Path.expand("../fixtures/garden_share_summaries.json", __DIR__)
            |> File.read!()
            |> Jason.decode!()

  for fixture <- @fixtures do
    @guilds fixture["guilds"]
    @summary fixture["summary"]
    test "show renders the shared summary: #{fixture["name"]}" do
      guilds = @guilds
      summary = @summary

      html =
        GardenShareHTML.show(%{garden_name: "Backyard", guilds: guilds})
        |> Phoenix.HTML.Safe.to_iodata()
        |> IO.iodata_to_binary()

      escaped_summary = summary |> Phoenix.HTML.html_escape() |> Phoenix.HTML.safe_to_string()

      assert html =~ "<title>Permaplanner Guilds (Backyard)</title>"
      assert html =~ "Garden: Backyard · Guilds: #{length(guilds)}"
      assert html =~ "<pre>#{escaped_summary}</pre>"
    end
  end
end
