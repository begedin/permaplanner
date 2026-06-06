import Config

if config_env() == :prod do
  port = String.to_integer(System.get_env("PORT") || "8080")

  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      "permaplanner_stateless_static_server_no_cookies_or_sessions"

  config :permaplanner, PermaplannerWeb.Endpoint,
    http: [ip: {0, 0, 0, 0}, port: port],
    secret_key_base: secret_key_base,
    server: true
end
