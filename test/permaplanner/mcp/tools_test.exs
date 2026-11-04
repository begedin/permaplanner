defmodule Permaplanner.MCP.ToolsTest do
  use ExUnit.Case, async: true
  alias Permaplanner.MCP.Tools

  test "search honors advertised bounds without imposing hidden offset limits" do
    assert {:ok, %{"species" => [], "nextOffset" => nil}} =
             Tools.call(nil, "search_plant_catalog", %{"query" => "", "offset" => 1_000_001})

    assert {:ok, _} =
             Tools.call(nil, "search_plant_catalog", %{
               "query" => String.duplicate("a", 200),
               "limit" => 50
             })

    for args <- [
          %{"query" => String.duplicate("a", 201)},
          %{"query" => "", "limit" => 0},
          %{"query" => "", "limit" => 51},
          %{"query" => "", "offset" => -1},
          %{"query" => "", "offset" => 1.5},
          %{"query" => "", "limit" => nil},
          %{"query" => "", "extra" => true}
        ] do
      assert {:error, :invalid_arguments} = Tools.call(nil, "search_plant_catalog", args)
    end
  end
end
