import Config

config :permaplanner, Permaplanner.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  port: 5433,
  database: "permaplanner_dev",
  stacktrace: true,
  show_sensitive_data_on_connection_error: true,
  pool_size: 10

config :permaplanner, PermaplannerWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 8080],
  check_origin: false,
  code_reloader: true,
  debug_errors: true,
  secret_key_base: "dev_secret_key_base_not_used_for_sessions_or_cookies_in_this_app",
  live_reload: [
    patterns: [
      ~r"lib/permaplanner/.*(ex)$",
      ~r"lib/permaplanner_web/.*(ex)$"
    ]
  ]

config :permaplanner,
  static_dir: Path.expand("../../dist", __DIR__)

config :logger, :console, format: "[$level] $message\n"
