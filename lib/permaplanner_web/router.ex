defmodule PermaplannerWeb.Router do
  use PermaplannerWeb, :router

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

  pipeline :spa do
    plug PermaplannerWeb.Plugs.SpaStatic
  end

  scope "/api", PermaplannerWeb do
    pipe_through :api

    get "/auth/session", AuthController, :session
    post "/auth/register", AuthController, :register
    post "/auth/login", AuthController, :login
    post "/auth/logout", AuthController, :logout
    post "/auth/github", AuthController, :github
    post "/github/oauth/access_token", GithubOAuthController, :create
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
