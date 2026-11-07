defmodule Permaplanner.Admin do
  @moduledoc "Read-only inventory of existing users and gardens."
  import Ecto.Query
  alias Permaplanner.Accounts.User
  alias Permaplanner.Gardens.Garden
  alias Permaplanner.Repo

  def overview do
    %{
      users: Repo.aggregate(User, :count),
      gardens: Repo.aggregate(Garden, :count),
      without_gardens:
        Repo.one(
          from(u in User,
            left_join: g in Garden,
            on: g.user_id == u.id,
            where: is_nil(g.id),
            select: count(u.id)
          )
        )
    }
  end

  def list(tab, search, requested_page) do
    pattern =
      "%" <>
        (search
         |> String.replace("\\", "\\\\")
         |> String.replace("%", "\\%")
         |> String.replace("_", "\\_")) <> "%"

    query =
      case tab do
        "gardens" ->
          from(g in Garden,
            join: u in User,
            on: u.id == g.user_id,
            where: ilike(g.name, ^pattern) or ilike(u.email, ^pattern),
            order_by: [desc: g.inserted_at, asc: g.id],
            select: %{
              id: g.id,
              name: g.name,
              email: u.email,
              inserted_at: g.inserted_at,
              updated_at: g.updated_at
            }
          )

        "users" ->
          counts =
            from(g in Garden,
              group_by: g.user_id,
              select: %{user_id: g.user_id, count: count(g.id)}
            )

          from(u in User,
            left_join: g in subquery(counts),
            on: g.user_id == u.id,
            where: ilike(u.email, ^pattern),
            order_by: [desc: u.inserted_at, asc: u.id],
            select: %{
              id: u.id,
              email: u.email,
              inserted_at: u.inserted_at,
              garden_count: coalesce(g.count, 0)
            }
          )
      end

    total = Repo.aggregate(query, :count)
    pages = max(1, ceil(total / 25))
    page = min(max(requested_page, 1), pages)
    rows = Repo.all(from(row in query, limit: 25, offset: ^((page - 1) * 25)))
    %{rows: rows, total: total, page: page, pages: pages}
  end
end
