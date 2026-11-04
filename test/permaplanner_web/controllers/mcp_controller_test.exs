defmodule PermaplannerWeb.MCPControllerTest do
  use PermaplannerWeb.ConnCase, async: false
  import Permaplanner.MCPFixtures
  alias Permaplanner.{Accounts, Gardens}

  setup do
    configure_oauth()
    user = user!()
    tokens = tokens(user)
    conn = build_conn() |> put_req_header("authorization", "Bearer " <> tokens.access_token)
    %{conn: conn, user: user}
  end

  test "negotiates protocol, lists four read-only tools and accepts notifications", %{conn: conn} do
    assert %{"result" => %{"protocolVersion" => "2025-11-25", "capabilities" => %{"tools" => _}}} =
             rpc(conn, "initialize", %{
               "protocolVersion" => "future",
               "capabilities" => %{},
               "clientInfo" => %{"name" => "test", "version" => "1"}
             })

    assert %{"result" => %{"tools" => tools}} = rpc(conn, "tools/list", %{})

    assert Enum.map(tools, & &1["name"]) ==
             ~w(list_gardens get_garden_context get_guild search_plant_catalog)

    assert Enum.all?(tools, & &1["annotations"]["readOnlyHint"])
    assert %{"result" => %{}} = rpc(conn, "ping", %{})

    assert conn
           |> post("/mcp", %{"jsonrpc" => "2.0", "method" => "notifications/initialized"})
           |> response(202) == ""

    assert conn |> get("/mcp") |> response(405) == ""
  end

  test "returns saved guild data with resolved catalog traits and user overrides", %{
    conn: conn,
    user: user
  } do
    document =
      Gardens.default_document()
      |> Map.put("plants", [
        %{
          "id" => "p1",
          "speciesId" => "lawsons_cypress",
          "cultivarId" => "ellwoodii",
          "speciesOverride" => %{"name" => "My cypress", "layers" => ["overstory"]},
          "cultivarOverride" => %{"name" => "My Ellwoodii", "functions" => ["ground_cover"]}
        }
      ])
      |> Map.put("guilds", [
        %{
          "id" => "g1",
          "name" => "North bed",
          "mulchLevel" => 4,
          "note" => "Needs water",
          "path" => [%{"x" => 0, "y" => 0}],
          "plants" => [
            %{
              "id" => "t1",
              "plantId" => "p1",
              "nameOrCultivar" => "Old label",
              "x" => 10,
              "y" => 20,
              "width" => 3,
              "height" => 4,
              "note" => "Planted yesterday",
              "growthPhase" => "transplanted",
              "vigor" => 3
            }
          ]
        }
      ])

    {:ok, garden} = Gardens.create_garden(user, %{"name" => "Garden", "document" => document})
    {:ok, _} = Gardens.create_garden(user!(), %{"name" => "Private"})
    id = garden.id

    assert %{"result" => %{"structuredContent" => %{"gardens" => [%{"id" => ^id}]}}} =
             tool(conn, "list_gardens", %{})

    assert %{
             "result" => %{
               "structuredContent" => %{"guilds" => [guild], "mapScale" => scale},
               "content" => [%{"text" => text}]
             }
           } =
             tool(conn, "get_garden_context", %{"gardenId" => id})

    assert scale == document["mapScale"]

    assert %{
             "note" => "Needs water",
             "mulchLevel" => 4,
             "plants" => [
               %{
                 "growthPhase" => "transplanted",
                 "vigor" => 3,
                 "note" => "Planted yesterday",
                 "plant" => %{
                   "name" => "My cypress",
                   "cultivar" => "My Ellwoodii",
                   "functions" => ["ground_cover"],
                   "layers" => ["shrub", "understory"]
                 }
               }
             ]
           } = guild

    assert Jason.decode!(text)["guilds"] == [guild]

    assert %{"result" => %{"structuredContent" => %{"guild" => ^guild}}} =
             tool(conn, "get_guild", %{"gardenId" => id, "guildId" => "g1"})

    {:ok, _} = Gardens.update_garden(user, id, %{"document" => Map.put(document, "guilds", [])})

    assert %{"result" => %{"structuredContent" => %{"guilds" => [], "syncRevision" => 1}}} =
             tool(conn, "get_garden_context", %{"gardenId" => id})
  end

  test "hides other users' gardens and handles missing IDs", %{conn: conn, user: user} do
    {:ok, own} = Gardens.create_garden(user, %{})
    {:ok, other} = Gardens.create_garden(user!(), %{})

    for id <- [other.id, Ecto.UUID.generate(), "malformed"] do
      assert %{"result" => %{"isError" => true}} =
               tool(conn, "get_garden_context", %{"gardenId" => id})
    end

    assert %{"result" => %{"isError" => true}} =
             tool(conn, "get_guild", %{"gardenId" => own.id, "guildId" => "missing"})
  end

  test "searches Latin and cultivar names and paginates the catalog", %{conn: conn} do
    assert %{"result" => %{"structuredContent" => %{"species" => [%{"id" => "lawsons_cypress"}]}}} =
             tool(conn, "search_plant_catalog", %{"query" => "CHAMAECYPARIS ellwoodii"})

    assert %{
             "result" => %{
               "structuredContent" => %{"species" => first, "nextOffset" => 2, "total" => total}
             }
           } =
             tool(conn, "search_plant_catalog", %{"query" => "", "limit" => 2})

    assert total > 2

    assert %{"result" => %{"structuredContent" => %{"species" => second}}} =
             tool(conn, "search_plant_catalog", %{"query" => "", "limit" => 2, "offset" => 2})

    refute first == second
  end

  test "validates tool arguments and JSON-RPC envelopes", %{conn: conn} do
    for {name, args} <- [
          {"missing", %{}},
          {"get_guild", %{}},
          {"list_gardens", %{"extra" => 1}},
          {"search_plant_catalog", %{"query" => "", "limit" => 51}},
          {"search_plant_catalog", %{"query" => "", "offset" => -1}},
          {"list_gardens", []}
        ] do
      assert %{"error" => %{"code" => -32602}} = tool(conn, name, args)
    end

    assert %{"error" => %{"code" => -32601}} = rpc(conn, "missing", %{})

    assert %{"error" => %{"code" => -32600}} =
             conn |> post("/mcp", %{"id" => nil}) |> json_response(400)

    assert conn
           |> put_req_header("mcp-protocol-version", "invalid")
           |> post("/mcp", %{})
           |> json_response(400)
  end

  test "requires dedicated bearer credentials and rejects foreign origins", %{
    user: user,
    conn: conn
  } do
    session = Accounts.generate_user_session_token(user)

    for unauthorized <- [
          build_conn(),
          build_conn() |> init_test_session(%{"user_token" => session}),
          build_conn() |> put_req_header("authorization", "Bearer " <> session)
        ] do
      response = post(unauthorized, "/mcp", %{})
      assert %{"error" => "unauthorized"} = json_response(response, 401)
      assert [challenge] = get_resp_header(response, "www-authenticate")
      assert challenge =~ "oauth-protected-resource"
    end

    assert conn
           |> put_req_header("origin", "https://evil.example")
           |> post("/mcp", %{})
           |> response(403)
  end

  defp tool(conn, name, args), do: rpc(conn, "tools/call", %{"name" => name, "arguments" => args})

  defp rpc(conn, method, params),
    do:
      conn
      |> post("/mcp", %{"jsonrpc" => "2.0", "id" => 1, "method" => method, "params" => params})
      |> json_response(200)
end
