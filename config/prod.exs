import Config

config :permaplanner, PermaplannerWeb.Endpoint,
  cache_static_manifest: nil,
  force_ssl: [rewrite_on: [:x_forwarded_proto]]

config :logger, level: :info
