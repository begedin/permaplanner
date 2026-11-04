defmodule Permaplanner.MCP.ConfigTest do
  use ExUnit.Case, async: true
  alias Permaplanner.MCP.{Client, Config}

  test "normalizes client defaults and supports IPv4 and IPv6 loopback callbacks" do
    redirects = [
      "http://localhost:3000/cb",
      "http://127.0.0.1:3000/cb",
      "http://[::1]:3000/cb",
      "https://client.example/cb"
    ]

    clients = %{"assistant" => %{"redirect_uris" => redirects}}

    assert [
             mcp_base_url: "https://garden.example",
             mcp_clients: %{
               "assistant" => %Client{
                 id: "assistant",
                 name: "assistant",
                 redirect_uris: ^redirects,
                 secret: nil
               }
             }
           ] =
             Config.load!("https://garden.example/", clients, true)
  end

  test "rejects insecure or malformed deployment inputs" do
    for redirect <- [
          "http://remote.example/cb",
          "https://client.example/cb#fragment",
          "https://user@client.example/cb",
          "/cb",
          42
        ] do
      assert_raise ArgumentError, fn ->
        Config.parse_clients!(%{"client" => %{"redirect_uris" => [redirect]}})
      end
    end

    for client <- [
          %{},
          %{"redirect_uris" => []},
          %{"redirect_uris" => ["https://client.example/cb"], "client_secret" => "short"},
          %{"redirect_uris" => ["https://client.example/cb"], "name" => nil}
        ] do
      assert_raise ArgumentError, fn -> Config.parse_clients!(%{"client" => client}) end
    end

    for origin <- [
          "https://garden.example/path",
          "https://garden.example?x=1",
          "http://garden.example",
          "https://user@garden.example"
        ] do
      assert_raise ArgumentError, fn -> Config.load!(origin, %{}, true) end
    end

    clients = %{"client" => %{"redirect_uris" => ["https://client.example/cb"]}}
    assert_raise ArgumentError, fn -> Config.load!(nil, clients, true) end
    assert_raise ArgumentError, fn -> Config.parse_clients!([]) end
  end
end
