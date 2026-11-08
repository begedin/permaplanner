defmodule Permaplanner.Gardens.LandmarksTest do
  use Permaplanner.DataCase, async: true

  alias Permaplanner.Gardens
  alias Permaplanner.MCP.Tools

  test "saves landmarks and units and includes them in garden and guild MCP reads" do
    user = Permaplanner.MCPFixtures.user!()

    landmark = %{
      "id" => "house",
      "name" => "House",
      "x" => 100,
      "y" => 50,
      "width" => 80,
      "height" => 40,
      "rotation" => 35
    }

    border = [%{"x" => 0, "y" => 0}, %{"x" => 200, "y" => 0}, %{"x" => 100, "y" => 150}]
    assert Gardens.default_document()["plotBorder"] == []

    document =
      Gardens.default_document()
      |> Map.put("landmarks", [landmark])
      |> Map.put("plotBorder", border)
      |> Map.put("guilds", [
        %{"id" => "bed", "name" => "Bed", "path" => [], "plants" => [], "mulchLevel" => 1}
      ])
      |> put_in(["mapScale", "unit"], "ft")

    assert {:ok, garden} = Gardens.create_garden(user, %{"document" => document})
    assert Gardens.get_garden!(user, garden.id).document == document

    for {tool, args} <- [
          {"get_garden_context", %{"gardenId" => garden.id}},
          {"get_guild", %{"gardenId" => garden.id, "guildId" => "bed"}}
        ] do
      assert {:ok,
              %{
                landmarks: [^landmark],
                plotBorder: ^border,
                mapScale: %{"unit" => "ft"},
                coordinateSystem: %{landmarkPosition: "rectangle centre", north: "unknown"}
              }} =
               Tools.call(user, tool, args)
    end

    for invalid_border <- [
          nil,
          [%{"x" => 1, "y" => 2}],
          [%{"x" => "bad", "y" => 2} | border],
          [%{"x" => 0, "y" => 0}, %{"x" => 200, "y" => 0}, %{"x" => 100, "y" => 0}],
          [
            %{"x" => 0.0, "y" => 0.0},
            %{"x" => 1.0e200, "y" => 0.0},
            %{"x" => 0.0, "y" => 1.0e200}
          ]
        ] do
      assert {:error, :invalid_document} =
               Gardens.create_garden(user, %{
                 "document" => Map.put(document, "plotBorder", invalid_border)
               })

      assert {:error, :invalid_document} =
               Gardens.update_garden(user, garden.id, %{
                 "document" => Map.put(document, "plotBorder", invalid_border)
               })

      assert Gardens.get_garden!(user, garden.id).document == document
    end

    for {key, value} <- [{"width", 0}, {"height", -1}, {"rotation", 360}, {"x", "100"}] do
      invalid = Map.put(document, "landmarks", [Map.put(landmark, key, value)])
      assert {:error, :invalid_document} = Gardens.create_garden(user, %{"document" => invalid})
    end
  end
end
