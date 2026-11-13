defmodule Permaplanner.Gardens.DocumentTest do
  use ExUnit.Case, async: true

  alias Permaplanner.Gardens
  alias Permaplanner.Gardens.Document

  test "validates nested plan data and optional fields" do
    landmark = %{
      "id" => "landmark",
      "name" => "Shed",
      "x" => 0,
      "y" => 0,
      "width" => 10,
      "height" => 10,
      "rotation" => 0,
      "path" => [
        [
          [
            %{"x" => -0.5, "y" => -0.5},
            %{"x" => 0.5, "y" => -0.5},
            %{"x" => 0.5, "y" => 0.5},
            %{"x" => -0.5, "y" => -0.5}
          ]
        ]
      ]
    }

    document =
      Gardens.default_document()
      |> Map.put("landmarks", [landmark])
      |> Map.put("plants", [%{"id" => "p1", "speciesId" => "unknown", "cultivarId" => nil}])
      |> Map.put("guilds", [
        %{
          "id" => "g1",
          "name" => "Bed",
          "mulchLevel" => 1,
          "path" => [],
          "plants" => [
            %{
              "id" => "t1",
              "plantId" => "p1",
              "nameOrCultivar" => "Plant",
              "x" => 0,
              "y" => 0,
              "placed" => true,
              "width" => 16,
              "height" => 16
            }
          ]
        }
      ])

    assert {:ok, ^document, :unchanged} = Document.prepare(document)

    [guild] = document["guilds"]

    invalid_documents = [
      nil,
      Map.put(document, "landmarks", [landmark, landmark]),
      Map.put(document, "guilds", [guild, Map.put(guild, "id", "other")]),
      Map.put(document, "plants", document["plants"] ++ document["plants"]),
      Map.put(document, "guilds", document["guilds"] ++ document["guilds"]),
      put_in(
        document,
        ["guilds", Access.at(0), "plants"],
        List.duplicate(hd(hd(document["guilds"])["plants"]), 2)
      ),
      put_in(document, ["guilds", Access.at(0), "plants", Access.at(0), "plantId"], "missing"),
      put_in(document, ["guilds", Access.at(0), "plants", Access.at(0), "placed"], "true"),
      Map.put(document, "mapScale", nil),
      put_in(document, ["mapScale", "unit"], "cubits"),
      Map.delete(document, "paths"),
      Map.put(document, "paths", [landmark, landmark]),
      Map.put(document, "paths", [%{"id" => "path"}]),
      Map.delete(document, "landmarks"),
      Map.put(document, "landmarks", [%{"id" => "house"}]),
      put_in(document, ["mapScale", "start", "x"], "20"),
      put_in(document, ["mapScale", "linePhysicalLength"], 0),
      Map.put(document, "syncRevision", -1),
      Map.put(document, "backgroundOpacity", 2),
      Map.put(document, "backgroundImage", "not an image"),
      Map.put(document, "onboardingState", "unexpected"),
      Map.put(document, "guilds", [%{"id" => "g1"}]),
      put_in(document, ["guilds", Access.at(0), "path"], [%{"x" => 1}]),
      put_in(document, ["guilds", Access.at(0), "plants", Access.at(0), "vigor"], 6),
      put_in(document, ["guilds", Access.at(0), "plants", Access.at(0), "growthPhase"], "old"),
      put_in(document, ["plants", Access.at(0), "speciesOverride"], %{"functions" => ["unknown"]})
    ]

    for invalid <- invalid_documents do
      assert {:error, :invalid_document} = Document.prepare(invalid)
    end
  end

  test "prepares image changes alongside the validated document" do
    document = Gardens.default_document()
    with_image = Map.put(document, "backgroundImage", "data:image/png;base64,aW1hZ2U=")
    assert {:ok, ^document, {:set, "image/png", "image"}} = Document.prepare(with_image)
    assert {:ok, ^document, :clear} = Document.prepare(Map.put(document, "backgroundImage", nil))
  end

  test "plot borders may be absent or have nonzero area in either winding direction" do
    triangle = [%{"x" => 10, "y" => 10}, %{"x" => 110, "y" => 10}, %{"x" => 110, "y" => 110}]

    for points <- [
          [],
          [[triangle ++ [hd(triangle)]]],
          [[Enum.reverse(triangle) ++ [List.last(triangle)]]]
        ] do
      document = Map.put(Gardens.default_document(), "plotBorder", points)
      assert {:ok, ^document, :unchanged} = Document.prepare(document)
    end

    for points <- [
          nil,
          Enum.take(triangle, 2),
          [%{"x" => 10, "y" => 10}, %{"x" => 110, "y" => 10}, %{"x" => 60, "y" => 10}],
          List.duplicate(%{"x" => 10, "y" => 10}, 3),
          [%{"x" => "10", "y" => 10} | triangle]
        ] do
      assert {:error, :invalid_document} =
               Document.prepare(Map.put(Gardens.default_document(), "plotBorder", points))
    end
  end

  test "accepts closed region and hole rings and rejects flat or incomplete geometry" do
    outer =
      Enum.map([{0, 0}, {30, 0}, {30, 30}, {0, 30}, {0, 0}], fn {x, y} ->
        %{"x" => x, "y" => y}
      end)

    hole =
      Enum.map([{10, 10}, {10, 20}, {20, 20}, {20, 10}, {10, 10}], fn {x, y} ->
        %{"x" => x, "y" => y}
      end)

    second = Enum.map(outer, &Map.update!(&1, "x", fn x -> x + 50 end))

    guild = %{
      "id" => "bed",
      "name" => "Bed",
      "path" => [[outer, hole], [second]],
      "plants" => [],
      "mulchLevel" => 1
    }

    document = Map.put(Gardens.default_document(), "guilds", [guild])
    assert {:ok, ^document, :unchanged} = Document.prepare(document)

    for path <- [
          outer,
          [outer],
          [[]],
          [[[]]],
          [[Enum.take(outer, 4)]]
        ] do
      invalid = put_in(document, ["guilds", Access.at(0), "path"], path)
      assert {:error, :invalid_document} = Document.prepare(invalid)
    end
  end

  test "stores large translated outlines unchanged without geometry processing" do
    ring =
      for i <- 0..10_000 do
        angle = 2 * :math.pi() * rem(i, 10_000) / 10_000
        %{"x" => 1.0e8 + :math.cos(angle), "y" => 1.0e8 + :math.sin(angle)}
      end

    unit_square =
      Enum.map([{0, 0}, {1, 0}, {1, 1}, {0, 1}, {0, 0}], fn {x, y} ->
        %{"x" => 1.0e8 + x, "y" => 1.0e8 + y}
      end)

    for path <- [[[ring]], [[unit_square]]] do
      document =
        Map.put(Gardens.default_document(), "guilds", [
          %{"id" => "g", "name" => "G", "path" => path, "plants" => [], "mulchLevel" => 1}
        ])

      assert {:ok, ^document, :unchanged} = Document.prepare(document)
    end
  end
end
