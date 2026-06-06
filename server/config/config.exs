import Config

config :permaplanner, PermaplannerWeb.Endpoint,
  url: [host: "localhost"],
  render_errors: [
    formats: [json: PermaplannerWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: Permaplanner.PubSub,
  live_view: [signing_salt: "permaplanner"]

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :phoenix, :json_library, Jason

import_config "#{config_env()}.exs"
