defmodule PermaplannerWeb.Router do
  use PermaplannerWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :spa do
    plug PermaplannerWeb.Plugs.SpaStatic
  end

  scope "/api", PermaplannerWeb do
    pipe_through :api

    post "/github/oauth/access_token", GithubOAuthController, :create
  end

  scope "/", PermaplannerWeb do
    pipe_through :spa

    match :*, "/*path", SpaController, :show
  end
end
