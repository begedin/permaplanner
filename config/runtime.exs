import Config

if admin_user_ids = System.get_env("ADMIN_USER_IDS") do
  config :permaplanner,
         :admin_user_ids,
         admin_user_ids |> String.split(",", trim: true) |> Enum.map(&String.trim/1)
end

config :permaplanner,
       Permaplanner.MCP.Config.load!(
         System.get_env("MCP_BASE_URL"),
         Application.fetch_env!(:permaplanner, :mcp_clients),
         config_env() == :prod
       )

if config_env() == :prod do
  public_uri = URI.parse(System.get_env("MCP_BASE_URL") || "https://permaplanner.fly.dev")
  port = String.to_integer(System.get_env("PORT") || "8080")

  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise "SECRET_KEY_BASE must be set in production"

  database_url =
    System.get_env("DATABASE_URL") ||
      raise "DATABASE_URL must be set in production"

  maybe_ipv6 = if System.get_env("ECTO_IPV6") in ~w(true 1), do: [:inet6], else: []

  config :permaplanner, Permaplanner.Repo,
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    socket_options: maybe_ipv6

  config :permaplanner, PermaplannerWeb.Endpoint,
    url: [scheme: public_uri.scheme, host: public_uri.host, port: public_uri.port],
    http: [ip: {0, 0, 0, 0}, port: port],
    secret_key_base: secret_key_base,
    server: true,
    force_ssl: [rewrite_on: [:x_forwarded_proto]]
end
