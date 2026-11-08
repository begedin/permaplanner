defmodule Permaplanner.Repo.Migrations.AddPlotBorder do
  use Ecto.Migration
  import Ecto.Query

  def up do
    from(g in "gardens",
      where: g.file_version == 6,
      update: [
        set: [
          document: fragment("? || '{\"version\":7,\"plotBorder\":[]}'::jsonb", g.document),
          file_version: 7
        ]
      ]
    )
    |> repo().update_all([], prefix: prefix())
  end

  def down do
    from(g in "gardens",
      where: g.file_version == 7,
      update: [
        set: [
          document: fragment("(? - 'plotBorder') || '{\"version\":6}'::jsonb", g.document),
          file_version: 6
        ]
      ]
    )
    |> repo().update_all([], prefix: prefix())
  end
end
