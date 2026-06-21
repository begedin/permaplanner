defmodule Permaplanner.Accounts.UserToken do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Query

  alias Permaplanner.Accounts.User

  @hash_algorithm :sha256
  @rand_size 32
  @session_validity_in_days 60

  @primary_key {:id, :id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "users_tokens" do
    field :token, :binary
    field :context, :string
    field :sent_to, :string
    belongs_to :user, User

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def build_session_token(user) do
    token = :crypto.strong_rand_bytes(@rand_size)
    hashed_token = :crypto.hash(@hash_algorithm, token)

    {Base.url_encode64(token, padding: false),
     %__MODULE__{
       token: hashed_token,
       context: "session",
       user_id: user.id,
       sent_to: user.email
     }}
  end

  def verify_session_token_query(token) when is_binary(token) do
    case Base.url_decode64(token, padding: false) do
      {:ok, decoded} ->
        hashed = :crypto.hash(@hash_algorithm, decoded)
        days = @session_validity_in_days
        dt = DateTime.add(DateTime.utc_now(), -days, :day)

        from t in __MODULE__,
          join: u in assoc(t, :user),
          where: t.context == "session",
          where: t.token == ^hashed,
          where: t.inserted_at > ^dt,
          select: {u, t}

      :error ->
        nil
    end
  end

  def session_user_query(user_id) do
    from u in User, where: u.id == ^user_id
  end
end
