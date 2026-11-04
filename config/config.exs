import Config

config :permaplanner, ecto_repos: [Permaplanner.Repo]

config :permaplanner, :mcp_clients, %{
  "chatgpt" => %{
    "name" => "ChatGPT",
    "redirect_uris" => ["https://chatgpt.com/connector_platform_oauth_redirect"]
  },
  "claude" => %{
    "name" => "Claude",
    "redirect_uris" => ["https://claude.ai/api/mcp/auth_callback"]
  },
  "cursor" => %{
    "name" => "Cursor",
    "redirect_uris" => [
      "https://www.cursor.com/agents/mcp/oauth/callback",
      "http://localhost:8787/callback"
    ]
  },
  "vscode" => %{
    "name" => "VS Code / GitHub Copilot",
    "redirect_uris" => ["http://127.0.0.1:33418", "https://vscode.dev/redirect"]
  },
  "gemini-cli" => %{
    "name" => "Gemini CLI",
    "redirect_uris" => ["http://localhost:7777/oauth/callback"]
  }
}

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
config :phoenix, :filter_parameters, ["password", "token", "secret", "code", "state"]

import_config "#{config_env()}.exs"
