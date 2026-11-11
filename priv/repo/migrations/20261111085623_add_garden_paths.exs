defmodule Permaplanner.Repo.Migrations.AddGardenPaths do
  use Ecto.Migration
  import Ecto.Query

  def up do
    from(g in "gardens",
      where: g.file_version == 9,
      select: %{id: g.id, document: g.document},
      lock: "FOR UPDATE"
    )
    |> repo().stream(prefix: prefix())
    |> Enum.each(fn garden ->
      document = garden.document |> Map.put("version", 10) |> Map.put("paths", [])

      from(g in "gardens", where: g.id == ^garden.id)
      |> repo().update_all([set: [document: document, file_version: 10]], prefix: prefix())
    end)
  end

  def down do
    raise "Garden paths cannot be removed without losing geometry"
  end
end
