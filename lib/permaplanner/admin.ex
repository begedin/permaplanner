defmodule Permaplanner.Admin do
  @moduledoc "Read-only inventory of existing users and gardens."
  import Ecto.Query
  alias Permaplanner.Accounts.User
  alias Permaplanner.Gardens.Garden
  alias Permaplanner.{PlantCatalog, Repo}

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

  def garden_names!(id) do
    with {:ok, uuid} <- Ecto.UUID.cast(id),
         %Garden{} = garden <- Repo.get(Garden, uuid) do
      names_by_id =
        Map.new(garden.document["plants"], fn plant ->
          resolved = PlantCatalog.resolve(plant)

          name =
            [resolved["name"], resolved["cultivar"]]
            |> Enum.reject(&(&1 in [nil, ""]))
            |> Enum.join(" — ")

          {plant["id"], name}
        end)

      guilds =
        Enum.map(garden.document["guilds"], fn guild ->
          plants =
            guild["plants"]
            |> Enum.map(fn plant ->
              case String.trim(plant["nameOrCultivar"]) do
                "" -> Map.get(names_by_id, plant["plantId"], "Unknown plant")
                name -> name
              end
            end)
            |> Enum.uniq()

          %{name: guild["name"], plants: plants}
        end)

      %{name: garden.name, guilds: guilds}
    else
      _ -> raise Ecto.NoResultsError, queryable: Garden
    end
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
