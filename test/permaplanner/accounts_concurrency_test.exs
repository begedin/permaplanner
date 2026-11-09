defmodule Permaplanner.AccountsConcurrencyTest do
  use ExUnit.Case, async: false
  import Ecto.Query
  alias Ecto.Adapters.SQL.Sandbox
  alias Permaplanner.{Accounts, Crypto, Repo}
  alias Permaplanner.Accounts.UserRecoveryCode

  setup do
    user =
      Sandbox.unboxed_run(Repo, fn ->
        {:ok, user} =
          Accounts.register_user(%{
            email: "atomic-#{System.unique_integer([:positive])}@example.com",
            password: "valid_password_12"
          })

        user
      end)

    on_exit(fn -> Sandbox.unboxed_run(Repo, fn -> Repo.delete!(user) end) end)
    %{user: user}
  end

  test "a recovery code can be consumed by only one competing request", %{user: user} do
    Sandbox.unboxed_run(Repo, fn ->
      Repo.insert!(%UserRecoveryCode{
        user_id: user.id,
        code_hash: Bcrypt.hash_pwd_salt("RECOVERY")
      })
    end)

    results = compete(fn -> Accounts.verify_recovery_code(user, "recovery") end)
    assert Enum.sort(results) == Enum.sort([:ok, {:error, :invalid_recovery_code}])
  end

  test "competing confirmations issue a single complete set of recovery codes", %{user: user} do
    {:ok, secret} = Crypto.decrypt(user.totp_secret)
    code = NimbleTOTP.verification_code(secret)
    results = compete(fn -> Accounts.confirm_totp_registration(user, code) end)
    assert [{:ok, _, codes}] = Enum.filter(results, &match?({:ok, _, _}, &1))
    assert length(codes) == 8
    assert [{:error, :already_confirmed}] = Enum.filter(results, &match?({:error, _}, &1))

    assert Sandbox.unboxed_run(Repo, fn ->
             Repo.aggregate(from(c in UserRecoveryCode, where: c.user_id == ^user.id), :count)
           end) == 8
  end

  defp compete(operation) do
    parent = self()

    tasks =
      for _ <- 1..2 do
        Task.async(fn ->
          Sandbox.unboxed_run(Repo, fn ->
            send(parent, {:ready, self()})
            receive do: (:go -> :ok)
            operation.()
          end)
        end)
      end

    workers =
      for _ <- tasks do
        assert_receive {:ready, pid}, 5000
        pid
      end

    Enum.each(workers, &send(&1, :go))
    Enum.map(tasks, &Task.await(&1, 15000))
  end
end
