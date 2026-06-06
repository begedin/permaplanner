import Config

config :permaplanner, PermaplannerWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "test_secret_key_base_for_conn_tests_only",
  server: false

config :permaplanner,
  static_dir: Path.expand("../test/fixtures/static", __DIR__)

config :logger, level: :warning
