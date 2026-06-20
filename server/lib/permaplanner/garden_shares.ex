defmodule Permaplanner.GardenShares do
  @moduledoc false

  import Ecto.Query, warn: false

  alias Permaplanner.Accounts.User
  alias Permaplanner.Gardens.Garden
  alias Permaplanner.Gardens.Share
  alias Permaplanner.Repo

  def get_share!(id) do
    Repo.get!(Share, id)
  end

  def get_share(id) do
    case Repo.get(Share, id) do
      nil -> nil
      share -> Repo.preload(share, :garden)
    end
  end

  def list_shares(%Garden{} = garden) do
    from(s in Share,
      where: s.garden_id == ^garden.id,
      order_by: [desc: s.inserted_at]
    )
    |> Repo.all()
  end

  def create_share(%Garden{} = garden) do
    %Share{}
    |> Ecto.Changeset.change(garden_id: garden.id)
    |> Repo.insert()
  end

  def revoke_share(%User{id: user_id}, garden_id, share_id) do
    case Repo.one(
           from(s in Share,
             join: g in Garden,
             on: s.garden_id == g.id,
             where: s.id == ^share_id and g.id == ^garden_id and g.user_id == ^user_id
           )
         ) do
      nil -> {:error, :not_found}
      share -> Repo.delete(share)
    end
  end
end
