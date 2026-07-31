defmodule Permaplanner.Application do
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      Permaplanner.Repo,
      {Phoenix.PubSub, name: Permaplanner.PubSub},
      PermaplannerWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: Permaplanner.Supervisor]
    {:ok, _pid} = result = Supervisor.start_link(children, opts)

    if Application.get_env(:permaplanner, :sql_sandbox) do
      Ecto.Adapters.SQL.Sandbox.mode(Permaplanner.Repo, :manual)
    end

    result
  end

  @impl true
  def config_change(changed, _new, removed) do
    PermaplannerWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
