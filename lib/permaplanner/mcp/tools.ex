defmodule Permaplanner.MCP.Tools do
  @moduledoc "Read-only, user-scoped garden tools shared by MCP clients."

  alias Permaplanner.Gardens
  alias Permaplanner.PlantCatalog

  @garden_id %{
    "type" => "string",
    "minLength" => 1,
    "description" => "Garden ID from list_gardens."
  }
  @definitions [
    {"list_gardens", "List the signed-in user's gardens. Use first to discover garden IDs.", %{},
     []},
    {"get_garden_context",
     "Read the latest saved garden, including every guild, resolved plant, notes, health and layout. Use before answering questions about the user's garden. Unsynced edits are unavailable.",
     %{"gardenId" => @garden_id}, ["gardenId"]},
    {"get_guild", "Read one guild with resolved plants and the garden's map scale.",
     %{"gardenId" => @garden_id, "guildId" => %{"type" => "string", "minLength" => 1}},
     ["gardenId", "guildId"]},
    {"search_plant_catalog",
     "Search catalog species and cultivars by English/Latin name, ID, role or layer. Terms are ANDed, case-insensitively. Use nextOffset to retrieve further matches; empty query browses the catalog.",
     %{
       "query" => %{"type" => "string", "maxLength" => 200},
       "offset" => %{"type" => "integer", "minimum" => 0, "default" => 0},
       "limit" => %{"type" => "integer", "minimum" => 1, "maximum" => 50, "default" => 20}
     }, ["query"]}
  ]

  def definitions do
    Enum.map(@definitions, fn {name, description, properties, required} ->
      %{
        name: name,
        description: description,
        inputSchema: %{
          type: "object",
          properties: properties,
          required: required,
          additionalProperties: false
        },
        annotations: %{readOnlyHint: true, destructiveHint: false, openWorldHint: false}
      }
    end)
  end

  def call(user, "list_gardens", args) when is_map(args) and map_size(args) == 0 do
    {:ok, %{gardens: Enum.map(Gardens.list_gardens(user), &Gardens.garden_summary/1)}}
  end

  def call(user, "get_garden_context", %{"gardenId" => id} = args)
      when is_binary(id) and byte_size(id) > 0 and map_size(args) == 1,
      do: Gardens.garden_context(user, id)

  def call(user, "get_guild", %{"gardenId" => id, "guildId" => guild_id} = args)
      when is_binary(id) and byte_size(id) > 0 and is_binary(guild_id) and
             byte_size(guild_id) > 0 and map_size(args) == 2,
      do: Gardens.guild_context(user, id, guild_id)

  def call(_user, "search_plant_catalog", %{"query" => query} = args) when is_binary(query) do
    offset = Map.get(args, "offset", 0)
    limit = Map.get(args, "limit", 20)

    if String.length(query) <= 200 and is_integer(offset) and offset >= 0 and
         is_integer(limit) and limit in 1..50 and
         Enum.all?(Map.keys(args), &(&1 in ["query", "offset", "limit"])) do
      {:ok, PlantCatalog.search(query, offset, limit)}
    else
      {:error, :invalid_arguments}
    end
  end

  def call(_user, name, _args) do
    if Enum.any?(@definitions, &(elem(&1, 0) == name)),
      do: {:error, :invalid_arguments},
      else: {:error, :unknown_tool}
  end
end
