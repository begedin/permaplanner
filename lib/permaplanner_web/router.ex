defmodule PermaplannerWeb.Router do
  use PermaplannerWeb, :router
  import Phoenix.LiveView.Router

  pipeline :api do
    plug :accepts, ["json"]
    plug :fetch_session
    plug PermaplannerWeb.UserAuth, :fetch_current_user
  end

  pipeline :require_authenticated do
    plug PermaplannerWeb.UserAuth, :require_authenticated
  end

  pipeline :require_pending_user do
    plug PermaplannerWeb.UserAuth, :require_pending_user
  end

  pipeline :require_totp_confirmed do
    plug PermaplannerWeb.UserAuth, :require_totp_confirmed
  end

  pipeline :admin do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug :put_root_layout, html: {PermaplannerWeb.AdminHTML, :root}
    plug PermaplannerWeb.AdminAuth
  end

  scope "/admin", PermaplannerWeb do
    pipe_through :admin

    live_session :admin, on_mount: [{PermaplannerWeb.AdminAuth, :admin}] do
      live "/", AdminLive
      live "/gardens/:id", AdminGardenLive
    end
  end

  pipeline :spa do
    plug PermaplannerWeb.Plugs.SpaStatic
  end

  pipeline :oauth_browser do
    plug :fetch_session
    plug PermaplannerWeb.UserAuth, :fetch_current_user
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  scope "/", PermaplannerWeb do
    get "/.well-known/oauth-authorization-server", OAuthController, :metadata
    get "/.well-known/oauth-protected-resource", OAuthController, :protected_resource
    get "/.well-known/oauth-protected-resource/mcp", OAuthController, :protected_resource
    post "/oauth/token", OAuthController, :token
    post "/oauth/revoke", OAuthController, :revoke
    post "/mcp", MCPController, :message
    get "/mcp", MCPController, :unsupported
    delete "/mcp", MCPController, :unsupported
  end

  scope "/oauth", PermaplannerWeb do
    pipe_through :oauth_browser
    get "/authorize", OAuthController, :authorize
    post "/authorize", OAuthController, :approve
    get "/connections", OAuthController, :connections
    post "/connections/revoke", OAuthController, :disconnect
  end

  scope "/api", PermaplannerWeb do
    pipe_through :api

    get "/auth/session", AuthController, :session
    post "/auth/register", AuthController, :register
    post "/auth/login", AuthController, :login
    post "/auth/logout", AuthController, :logout
    post "/auth/github", AuthController, :github
  end

  scope "/api", PermaplannerWeb do
    pipe_through [:api, :require_pending_user]

    post "/auth/register/totp", AuthController, :register_totp
    post "/auth/login/totp", AuthController, :login_totp
  end

  scope "/api", PermaplannerWeb do
    pipe_through [:api, :require_authenticated, :require_totp_confirmed]

    resources "/gardens", GardenController, only: [:index, :create, :show, :update, :delete]
    get "/gardens/:garden_id/shares", GardenShareController, :index
    post "/gardens/:garden_id/shares", GardenShareController, :create
    delete "/gardens/:garden_id/shares/:id", GardenShareController, :delete
    post "/legacy-import/local", LegacyImportController, :local
  end

  scope "/", PermaplannerWeb do
    get "/share/:id", GardenShareController, :show
  end

  scope "/", PermaplannerWeb do
    pipe_through :spa

    match :*, "/*path", SpaController, :show
  end
end
