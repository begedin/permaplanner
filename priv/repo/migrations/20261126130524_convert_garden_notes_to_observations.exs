defmodule Permaplanner.Repo.Migrations.ConvertGardenNotesToObservations do
  use Ecto.Migration
  import Ecto.Query

  def up do
    today = Date.to_iso8601(Date.utc_today())

    from(g in "gardens",
      where: g.file_version == 11,
      select: {g.id, g.document},
      lock: "FOR UPDATE"
    )
    |> repo().stream(prefix: prefix())
    |> Enum.each(fn {id, document} ->
      guilds =
        Enum.map(document["guilds"], fn guild ->
          guild
          |> convert_note(today)
          |> Map.update!("plants", fn plants -> Enum.map(plants, &convert_note(&1, today)) end)
        end)

      upgraded = Map.merge(document, %{"version" => 12, "guilds" => guilds, "observations" => []})

      from(g in "gardens", where: g.id == ^id)
      |> repo().update_all([set: [document: upgraded, file_version: 12]], prefix: prefix())
    end)
  end

  defp convert_note(owner, date) do
    {note, owner} = Map.pop(owner, "note")

    if is_binary(note) and String.trim(note) != "" do
      Map.put(owner, "observations", [
        %{
          "id" => Ecto.UUID.generate(version: 7),
          "date" => date,
          "type" => "note",
          "text" => note
        }
      ])
    else
      owner
    end
  end

  def down, do: raise("Multiple dated observations cannot be restored to a single note")
end
