defmodule Permaplanner.MCP.ProtocolTest do
  use ExUnit.Case, async: true
  alias Permaplanner.MCP.Protocol

  test "tool discovery ignores common request metadata" do
    request = %{"jsonrpc" => "2.0", "id" => 1, "method" => "tools/list", "params" => %{}}
    expected = Protocol.handle(nil, request)
    assert {:reply, %{result: %{tools: [_, _, _, _]}}} = expected

    for metadata <- [
          %{},
          %{"progressToken" => "discovery"},
          %{"progressToken" => 42, "clientExtension" => true}
        ] do
      assert Protocol.handle(nil, %{request | "params" => %{"_meta" => metadata}}) == expected
    end
  end

  test "metadata handling preserves method and tool argument validation" do
    request = %{"jsonrpc" => "2.0", "id" => 1, "method" => "tools/list"}

    for params <- [%{"_meta" => []}, %{"_meta" => nil}, %{"_meta" => %{}, "unexpected" => true}] do
      assert {:reply, %{error: %{code: -32602}}} =
               Protocol.handle(nil, Map.put(request, "params", params))
    end

    assert {:reply, %{error: %{code: -32602}}} =
             Protocol.handle(nil, %{
               "jsonrpc" => "2.0",
               "id" => 1,
               "method" => "tools/call",
               "params" => %{
                 "_meta" => %{"progressToken" => "search"},
                 "name" => "search_plant_catalog",
                 "arguments" => %{"query" => "", "_meta" => %{}}
               }
             })
  end
end
