import Config

config :permaplanner, Permaplanner.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "permaplanner_test#{System.get_env("MIX_TEST_PARTITION")}",
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: System.schedulers_online() * 2

config :permaplanner, PermaplannerWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "test_secret_key_base_for_conn_tests_only_must_be_at_least_64_bytes_long_xxxxxxxx",
  server: false

config :permaplanner,
  static_dir: Path.expand("../test/fixtures/static", __DIR__)

config :logger, level: :warning
