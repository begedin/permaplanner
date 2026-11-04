defmodule Permaplanner.MCP.ConcurrentRefreshTest do
  use ExUnit.Case, async: false
  import Permaplanner.MCPFixtures
  alias Ecto.Adapters.SQL.Sandbox
  alias Permaplanner.Repo
  alias Permaplanner.MCP.OAuth

  test "competing refreshes issue once and replay revokes the resulting connection" do
    configure_oauth()

    {user, tokens} =
      Sandbox.unboxed_run(Repo, fn ->
        user = user!()
        {user, tokens(user)}
      end)

    on_exit(fn -> Sandbox.unboxed_run(Repo, fn -> Repo.delete!(user) end) end)

    params = refresh_params(tokens.refresh_token)

    parent = self()

    tasks =
      for _ <- 1..2 do
        Task.async(fn ->
          Sandbox.unboxed_run(Repo, fn ->
            send(parent, {:ready, self()})
            receive do: (:refresh -> :ok)
            OAuth.exchange(params)
          end)
        end)
      end

    workers =
      for _ <- tasks do
        assert_receive {:ready, pid}, 5000
        pid
      end

    Enum.each(workers, &send(&1, :refresh))
    results = Enum.map(tasks, &Task.await(&1, 5000))
    assert [{:ok, issued}] = Enum.filter(results, &match?({:ok, _}, &1))
    assert [{:error, "invalid_grant"}] = Enum.filter(results, &match?({:error, _}, &1))
    refute Sandbox.unboxed_run(Repo, fn -> OAuth.user_for_token(issued.access_token) end)
  end
end
