defmodule Permaplanner.Gardens.ConcurrentSaveTest do
  use ExUnit.Case, async: false

  alias Ecto.Adapters.SQL.Sandbox
  alias Permaplanner.{Accounts, Gardens, Repo}

  test "only one competing save commits its document and background image" do
    # Separate real transactions are required: a shared sandbox connection serializes callers.
    {user, garden} =
      Sandbox.unboxed_run(Repo, fn ->
        {:ok, user} =
          Accounts.register_user(%{
            email: "concurrent-#{System.unique_integer([:positive])}@example.com",
            password: "valid_password_12"
          })

        {:ok, garden} = Gardens.create_garden(user, %{})
        {user, garden}
      end)

    on_exit(fn -> Sandbox.unboxed_run(Repo, fn -> Repo.delete!(user) end) end)

    parent = self()

    tasks =
      for index <- 1..4 do
        Task.async(fn ->
          Sandbox.unboxed_run(Repo, fn ->
            send(parent, {:ready, self()})
            receive do: (:save -> :ok)

            document =
              garden.document
              |> Map.put("backgroundOpacity", index / 10)
              |> Map.put(
                "backgroundImage",
                "data:image/png;base64," <> Base.encode64("image #{index}")
              )

            {document, Gardens.update_garden(user, garden.id, %{"document" => document})}
          end)
        end)
      end

    workers =
      for _ <- tasks do
        assert_receive {:ready, pid}, 5000
        pid
      end

    Enum.each(workers, &send(&1, :save))
    results = Enum.map(tasks, &Task.await(&1, 5000))
    assert [{winning_document, {:ok, saved}}] = Enum.filter(results, &match?({_, {:ok, _}}, &1))
    assert saved.sync_revision == 1
    assert Enum.count(results, &match?({_, {:error, :stale}}, &1)) == 3

    actual =
      Sandbox.unboxed_run(Repo, fn ->
        Gardens.garden_json(Gardens.get_garden!(user, garden.id))
      end)

    assert actual.document == Map.put(winning_document, "syncRevision", 1)
  end
end
