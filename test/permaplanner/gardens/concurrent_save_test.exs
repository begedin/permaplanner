defmodule Permaplanner.Gardens.ConcurrentSaveTest do
  use ExUnit.Case, async: false

  alias Ecto.Adapters.SQL.Sandbox
  alias Permaplanner.{Accounts, Gardens, Repo}

  setup do
    # Separate connections let each caller see commits from the other callers.
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
    %{user: user, garden: garden}
  end

  test "only one competing save commits the document and image", %{user: user, garden: garden} do
    parent = self()

    tasks =
      for index <- 1..4 do
        Task.async(fn ->
          Sandbox.unboxed_run(Repo, fn ->
            send(parent, {:ready, self()})
            receive do: (:save -> :ok)

            document = revised_document(garden, index)
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

    assert read_document(user, garden) == Map.put(winning_document, "syncRevision", 1)
  end

  test "a read keeps its original revision during a save", %{user: user, garden: garden} do
    parent = self()
    handler = make_ref()
    on_exit(fn -> :telemetry.detach(handler) end)

    pause_after_layout = fn _, _, query, reader ->
      if self() == reader and query.source == "gardens" do
        send(parent, :layout_read)
        receive do: (:saved -> :ok)
      end
    end

    reader =
      Task.async(fn ->
        :ok =
          :telemetry.attach(handler, [:permaplanner, :repo, :query], pause_after_layout, self())

        read_document(user, garden)
      end)

    assert_receive :layout_read, 5000

    assert {:ok, %{sync_revision: 1}} =
             Sandbox.unboxed_run(Repo, fn ->
               Gardens.update_garden(user, garden.id, %{"document" => revised_document(garden, 1)})
             end)

    send(reader.pid, :saved)
    assert Task.await(reader) == garden.document
  end

  defp read_document(user, garden) do
    Sandbox.unboxed_run(Repo, fn ->
      Gardens.garden_json(Gardens.get_garden!(user, garden.id)).document
    end)
  end

  defp revised_document(garden, index) do
    Map.merge(garden.document, %{
      "backgroundOpacity" => index / 10,
      "backgroundImage" => "data:image/png;base64," <> Base.encode64("image #{index}")
    })
  end
end
