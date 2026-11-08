defmodule PermaplannerWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :permaplanner

  if Application.compile_env(:permaplanner, :sql_sandbox) do
    plug Phoenix.Ecto.SQL.Sandbox,
      at: "/sandbox",
      repo: Permaplanner.Repo,
      header: "x-phoenix-ecto-sandbox"
  end

  @session_options [
    store: :cookie,
    key: "_permaplanner_session",
    signing_salt: "permaplanner_sess",
    same_site: "Lax"
  ]
  socket "/live", Phoenix.LiveView.Socket, websocket: [connect_info: [session: @session_options]]
  plug Plug.Static, at: "/admin-assets", from: {:permaplanner, "priv/admin"}

  plug Plug.Static,
    at: "/admin-assets/phoenix",
    from: {:phoenix, "priv/static"},
    only: ~w(phoenix.min.js)

  plug Plug.Static,
    at: "/admin-assets/live-view",
    from: {:phoenix_live_view, "priv/static"},
    only: ~w(phoenix_live_view.min.js)

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    # Garden JSON includes base64-encoded background images.
    parsers: [:urlencoded, :multipart, {:json, length: 16_000_000}],
    pass: ["*/*"],
    json_decoder: Jason

  plug Plug.MethodOverride
  plug Plug.Head
  plug Plug.Session, @session_options

  if code_reloading? do
    socket "/phoenix/live_reload/socket", Phoenix.LiveReloader.Socket
    plug Phoenix.LiveReloader
    plug Phoenix.CodeReloader
  end

  plug PermaplannerWeb.Router
end
