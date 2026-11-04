defmodule Permaplanner.Repo.Migrations.CreateMcpGrants do
  use Ecto.Migration

  def change do
    create table(:mcp_grants, primary_key: false) do
      add(:id, :binary_id, primary_key: true)
      add(:user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false)
      add(:client_id, :text, null: false)
      add(:resource, :text, null: false)
      add(:activated_at, :utc_datetime_usec)
      add(:expires_at, :utc_datetime_usec, null: false)
      timestamps(type: :utc_datetime_usec)
    end

    create(index(:mcp_grants, [:user_id]))
    create(index(:mcp_grants, [:expires_at]))

    create table(:mcp_credentials, primary_key: false) do
      add(:id, :binary_id, primary_key: true)

      add(:grant_id, references(:mcp_grants, type: :binary_id, on_delete: :delete_all),
        null: false
      )

      add(:kind, :text, null: false)
      add(:token_hash, :binary, null: false)
      add(:expires_at, :utc_datetime_usec, null: false)
      add(:consumed_at, :utc_datetime_usec)
      add(:redirect_uri, :text)
      add(:code_challenge, :text)
    end

    create(unique_index(:mcp_credentials, [:token_hash]))
    create(index(:mcp_credentials, [:grant_id]))
    create(index(:mcp_credentials, [:expires_at]))

    create(
      constraint(:mcp_credentials, :valid_kind, check: "kind IN ('code', 'access', 'refresh')")
    )

    create(
      constraint(:mcp_credentials, :code_binding,
        check:
          "(kind = 'code' AND redirect_uri IS NOT NULL AND code_challenge IS NOT NULL) OR (kind != 'code' AND redirect_uri IS NULL AND code_challenge IS NULL)"
      )
    )
  end
end
