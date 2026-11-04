defmodule Permaplanner.MCP.Credentials do
  @moduledoc "Atomic OAuth credential issuance, consumption, rotation and revocation."
  import Ecto.Query
  alias Permaplanner.Repo
  alias Permaplanner.MCP.{Credential, Grant}

  def authorize(user, params) do
    prune_expired()

    Repo.transaction(fn ->
      expires_at = DateTime.add(DateTime.utc_now(), 300)

      grant =
        Repo.insert!(%Grant{
          user_id: user.id,
          client_id: params["client_id"],
          resource: params["resource"],
          expires_at: expires_at
        })

      insert_token(grant, :code, expires_at,
        redirect_uri: params["redirect_uri"],
        code_challenge: params["code_challenge"]
      )
    end)
  end

  def exchange(kind, token, params) do
    Repo.transaction(fn ->
      credential = Repo.get_by(Credential, token_hash: hash(token), kind: kind)
      unless credential, do: Repo.rollback("invalid_grant")

      # Serialize every credential transition on the connection, including revocation.
      grant =
        Repo.one(
          from(g in Grant,
            where:
              g.id == ^credential.grant_id and g.client_id == ^params["client_id"] and
                g.resource == ^params["resource"],
            lock: "FOR UPDATE"
          )
        )

      unless grant && future?(grant.expires_at), do: Repo.rollback("invalid_grant")
      credential = Repo.get(Credential, credential.id)
      unless credential && future?(credential.expires_at), do: Repo.rollback("invalid_grant")

      consume(grant, credential, params)
    end)
    |> case do
      {:ok, result} -> result
      {:error, _} = error -> error
    end
  end

  defp consume(grant, %Credential{kind: :refresh, consumed_at: used}, _params)
       when not is_nil(used) do
    # Return an error while committing revocation, rather than rolling it back.
    Repo.delete!(grant)
    {:error, "invalid_grant"}
  end

  defp consume(grant, %Credential{kind: :code} = credential, params) do
    verifier = params["code_verifier"]

    unless is_nil(credential.consumed_at) && credential.redirect_uri == params["redirect_uri"] &&
             is_binary(verifier) && Regex.match?(~r/\A[A-Za-z0-9._~-]{43,128}\z/, verifier) &&
             Plug.Crypto.secure_compare(
               Base.url_encode64(hash(verifier), padding: false),
               credential.code_challenge
             ),
           do: Repo.rollback("invalid_grant")

    now = DateTime.utc_now()

    grant =
      grant
      |> Ecto.Changeset.change(activated_at: now, expires_at: DateTime.add(now, 30, :day))
      |> Repo.update!()

    issue_tokens(grant, credential)
  end

  defp consume(grant, %Credential{kind: :refresh} = credential, _params),
    do: issue_tokens(grant, credential)

  defp issue_tokens(grant, credential) do
    now = DateTime.utc_now()
    expires_in = min(3600, DateTime.diff(grant.expires_at, now))
    if expires_in <= 0, do: Repo.rollback("invalid_grant")
    credential |> Ecto.Changeset.change(consumed_at: now) |> Repo.update!()

    from(c in Credential, where: c.grant_id == ^grant.id and c.kind == :access)
    |> Repo.delete_all()

    access = insert_token(grant, :access, DateTime.add(now, expires_in))
    refresh = insert_token(grant, :refresh, grant.expires_at)

    {:ok,
     %{
       access_token: access,
       token_type: "Bearer",
       expires_in: expires_in,
       refresh_token: refresh,
       scope: "gardens:read"
     }}
  end

  defp insert_token(grant, kind, expires_at, attrs \\ []) do
    token = :crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false)

    %Credential{grant_id: grant.id, kind: kind, token_hash: hash(token), expires_at: expires_at}
    |> Ecto.Changeset.change(attrs)
    |> Repo.insert!()

    token
  end

  def user_for_token(token, resource) do
    now = DateTime.utc_now()

    Repo.one(
      from(c in Credential,
        join: g in assoc(c, :grant),
        join: u in assoc(g, :user),
        where:
          c.token_hash == ^hash(token) and c.kind == :access and is_nil(c.consumed_at) and
            c.expires_at > ^now and g.expires_at > ^now and g.resource == ^resource and
            not is_nil(u.totp_confirmed_at),
        select: u
      )
    )
  end

  def revoke_token(client_id, token) do
    grants =
      from(c in Credential,
        join: g in assoc(c, :grant),
        where:
          c.token_hash == ^hash(token) and c.kind in [:access, :refresh] and
            g.client_id == ^client_id,
        select: g.id
      )

    from(g in Grant, where: g.id in subquery(grants)) |> Repo.delete_all()
    :ok
  end

  @doc "Prune expired connections and credentials. Called on authorization; also usable from a release RPC."
  def prune_expired do
    now = DateTime.utc_now()

    Repo.transaction(fn ->
      {connections, _} = from(g in Grant, where: g.expires_at <= ^now) |> Repo.delete_all()
      {credentials, _} = from(c in Credential, where: c.expires_at <= ^now) |> Repo.delete_all()
      %{connections: connections, credentials: credentials}
    end)
  end

  defp hash(value), do: :crypto.hash(:sha256, value)
  defp future?(date), do: DateTime.compare(date, DateTime.utc_now()) == :gt
end
