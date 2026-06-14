defmodule Permaplanner.Repo.Migrations.CreateAuthAndGardens do
  use Ecto.Migration

  def change do
    execute("CREATE EXTENSION IF NOT EXISTS citext", "DROP EXTENSION IF EXISTS citext")

    create table(:users, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :email, :citext, null: false
      add :password_hash, :string, null: false
      add :totp_secret, :binary
      add :totp_confirmed_at, :utc_datetime_usec
      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:users, [:email])

    create table(:users_tokens) do
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :token, :binary, null: false
      add :context, :string, null: false
      add :sent_to, :string
      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create unique_index(:users_tokens, [:token])
    create index(:users_tokens, [:user_id])

    create table(:user_recovery_codes) do
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :code_hash, :string, null: false
      add :used_at, :utc_datetime_usec
      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create index(:user_recovery_codes, [:user_id])

    create table(:oauth_identities, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :provider, :string, null: false
      add :provider_user_id, :string, null: false
      add :provider_login, :string
      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create unique_index(:oauth_identities, [:provider, :provider_user_id])

    create table(:gardens, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :name, :string, null: false
      add :document, :map, null: false
      add :sync_revision, :integer, null: false, default: 0
      add :file_version, :integer, null: false, default: 5
      add :import_source, :string
      timestamps(type: :utc_datetime_usec)
    end

    create index(:gardens, [:user_id])
  end
end
