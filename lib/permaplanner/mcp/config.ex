defmodule Permaplanner.MCP.Config do
  @moduledoc "Validates the public origin and registered OAuth clients."
  alias Permaplanner.MCP.Client

  def load!(base_url, clients, production?) do
    clients = parse_clients!(clients)

    if production? and map_size(clients) > 0 and is_nil(base_url),
      do:
        raise(
          ArgumentError,
          "MCP_BASE_URL is required when configuring MCP clients in production"
        )

    origin = base_url || "http://localhost:4000"
    uri = URI.parse(origin)

    unless valid_http_uri?(uri) and uri.path in [nil, "", "/"] and is_nil(uri.query) and
             (not production? or is_nil(base_url) or uri.scheme == "https") do
      raise ArgumentError, "MCP_BASE_URL must be an absolute origin (HTTPS in production)"
    end

    [mcp_base_url: String.trim_trailing(origin, "/"), mcp_clients: clients]
  end

  def parse_clients!(clients) when is_map(clients) do
    Map.new(clients, fn {id, attrs} ->
      unless is_binary(id) and id != "" and is_map(attrs),
        do: raise(ArgumentError, "MCP clients must map nonempty client IDs to objects")

      name = Map.get(attrs, "name", id)
      redirects = attrs["redirect_uris"]
      secret = attrs["client_secret"]

      unless is_binary(name) and is_list(redirects) and redirects != [] and
               Enum.all?(redirects, &valid_redirect?/1) and
               (is_nil(secret) or (is_binary(secret) and byte_size(secret) >= 32)) do
        raise ArgumentError,
              "Invalid MCP client #{id}: check name, redirect_uris and client_secret (minimum 32 bytes)"
      end

      {id, %Client{id: id, name: name, redirect_uris: redirects, secret: secret}}
    end)
  end

  def parse_clients!(_), do: raise(ArgumentError, "MCP clients must be a map")

  defp valid_redirect?(value) when is_binary(value) do
    uri = URI.parse(value)

    valid_http_uri?(uri) and
      (uri.scheme == "https" or uri.host in ["localhost", "127.0.0.1", "::1"])
  end

  defp valid_redirect?(_), do: false

  defp valid_http_uri?(uri) do
    uri.scheme in ["http", "https"] and is_binary(uri.host) and uri.host != "" and
      is_nil(uri.fragment) and is_nil(uri.userinfo)
  end
end
