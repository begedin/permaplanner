defmodule PermaplannerWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :permaplanner

  if Application.compile_env(:permaplanner, :sql_sandbox) do
    plug Phoenix.Ecto.SQL.Sandbox,
      at: "/sandbox",
      repo: Permaplanner.Repo,
      header: "x-phoenix-ecto-sandbox"
  end

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Jason

  plug Plug.MethodOverride
  plug Plug.Head
  plug Plug.Session,
    store: :cookie,
    key: "_permaplanner_session",
    signing_salt: "permaplanner_sess",
    same_site: "Lax"

  if code_reloading? do
    socket "/phoenix/live_reload/socket", Phoenix.LiveReloader.Socket
    plug Phoenix.LiveReloader
    plug Phoenix.CodeReloader
  end

  plug PermaplannerWeb.Router
end
