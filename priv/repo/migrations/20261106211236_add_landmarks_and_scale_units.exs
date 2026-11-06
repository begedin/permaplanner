defmodule Permaplanner.Repo.Migrations.AddLandmarksAndScaleUnits do
  use Ecto.Migration
  import Ecto.Query

  def up do
    # PostgreSQL evaluates this against the current row after any concurrent writer
    # commits, rather than replacing it with an earlier application-side snapshot.
    from(g in "gardens",
      where: g.file_version == 5,
      update: [
        set: [
          document:
            fragment(
              "jsonb_set(? || '{\"version\":6,\"landmarks\":[]}'::jsonb, '{mapScale,unit}', '\"unspecified\"'::jsonb)",
              g.document
            ),
          file_version: 6
        ]
      ]
    )
    |> repo().update_all([], prefix: prefix())
  end

  def down do
    from(g in "gardens",
      where: g.file_version == 6,
      update: [
        set: [
          document:
            fragment(
              "(? - 'landmarks' #- '{mapScale,unit}') || '{\"version\":5}'::jsonb",
              g.document
            ),
          file_version: 5
        ]
      ]
    )
    |> repo().update_all([], prefix: prefix())
  end
end
