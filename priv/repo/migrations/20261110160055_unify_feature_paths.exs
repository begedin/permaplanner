defmodule Permaplanner.Repo.Migrations.UnifyFeaturePaths do
  use Ecto.Migration
  import Ecto.Query

  def up do
    rectangle = [
      [
        [
          %{"x" => -0.5, "y" => -0.5},
          %{"x" => 0.5, "y" => -0.5},
          %{"x" => 0.5, "y" => 0.5},
          %{"x" => -0.5, "y" => 0.5},
          %{"x" => -0.5, "y" => -0.5}
        ]
      ]
    ]

    from(g in "gardens",
      where: g.file_version == 8,
      select: %{id: g.id, document: g.document},
      lock: "FOR UPDATE"
    )
    |> repo().stream(prefix: prefix())
    |> Enum.each(fn garden ->
      document =
        garden.document
        |> Map.put("version", 9)
        |> Map.update!("landmarks", fn landmarks ->
          Enum.map(landmarks, &Map.put(&1, "path", rectangle))
        end)
        |> Map.update!("plotBorder", fn
          [] -> []
          [first | _] = points -> [[points ++ [first]]]
        end)

      from(g in "gardens", where: g.id == ^garden.id)
      |> repo().update_all([set: [document: document, file_version: 9]], prefix: prefix())
    end)
  end

  def down do
    raise "Feature paths cannot be converted back to rectangles without losing geometry"
  end
end
