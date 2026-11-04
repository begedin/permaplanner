defmodule Permaplanner.MCP.CredentialsTest do
  use Permaplanner.DataCase, async: false
  import Permaplanner.MCPFixtures
  alias Permaplanner.MCP.{Credential, Credentials, Grant, OAuth}

  setup do
    configure_oauth()
    %{user: user!()}
  end

  test "token lifetime is capped at the connection's remaining lifetime", %{user: user} do
    tokens = tokens(user)
    expires_at = DateTime.add(DateTime.utc_now(), 120)
    Repo.update_all(Grant, set: [expires_at: expires_at])

    assert {:ok, %{expires_in: lifetime, access_token: access}} =
             OAuth.exchange(refresh_params(tokens.refresh_token))

    assert lifetime in 119..120
    credential = Repo.get_by!(Credential, token_hash: :crypto.hash(:sha256, access))
    assert DateTime.compare(credential.expires_at, expires_at) in [:lt, :eq]
  end

  test "pruning removes expired connections and credentials while preserving replay evidence", %{
    user: user
  } do
    tokens = tokens(user)

    assert {:ok, next} =
             OAuth.exchange(refresh_params(tokens.refresh_token))

    past = DateTime.add(DateTime.utc_now(), -1)
    Repo.update_all(from(c in Credential, where: c.kind == :code), set: [expires_at: past])
    assert {:ok, %{connections: 0, credentials: 1}} = Credentials.prune_expired()

    assert %Credential{consumed_at: used} =
             Repo.get_by!(Credential, token_hash: :crypto.hash(:sha256, tokens.refresh_token))

    refute is_nil(used)
    assert OAuth.user_for_token(next.access_token)
    Repo.update_all(Grant, set: [expires_at: past])
    assert {:ok, %{connections: 1}} = Credentials.prune_expired()
    assert Repo.aggregate(Credential, :count) == 0
    refute OAuth.user_for_token(next.access_token)
  end

  test "abandoned authorizations expire with their code", %{user: user} do
    code_params(user)
    [grant] = Repo.all(Grant)
    assert is_nil(grant.activated_at)
    assert DateTime.diff(grant.expires_at, DateTime.utc_now()) in 299..300
  end
end
