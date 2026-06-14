import Config

if config_env() == :prod do
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
    http: [ip: {0, 0, 0, 0}, port: port],
    secret_key_base: secret_key_base,
    server: true,
    force_ssl: [rewrite_on: [:x_forwarded_proto]]
end
