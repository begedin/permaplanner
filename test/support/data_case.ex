defmodule Permaplanner.DataCase do
  use ExUnit.CaseTemplate

  using do
    quote do
      alias Permaplanner.Repo

      import Ecto
      import Ecto.Changeset
      import Ecto.Query
      import Permaplanner.DataCase
    end
  end

  setup tags do
    Permaplanner.DataCase.setup_sandbox(tags)
    :ok
  end

  def setup_sandbox(tags) do
    pid = Ecto.Adapters.SQL.Sandbox.start_owner!(Permaplanner.Repo, shared: not tags[:async])
    on_exit(fn -> Ecto.Adapters.SQL.Sandbox.stop_owner(pid) end)
  end

  def errors_on(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
