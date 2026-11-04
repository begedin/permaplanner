defmodule Permaplanner.Gardens.DocumentTest do
  use ExUnit.Case, async: true

  alias Permaplanner.Gardens
  alias Permaplanner.Gardens.Document

  test "validates nested plan data and optional fields" do
    document =
      Gardens.default_document()
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
              "width" => 16,
              "height" => 16
            }
          ]
        }
      ])

    assert {:ok, ^document, :unchanged} = Document.prepare(document)

    invalid_documents = [
      nil,
      Map.put(document, "mapScale", nil),
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
end
