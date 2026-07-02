defmodule Permaplanner.Repo.Migrations.ExtractGardenBackgroundImages do
  use Ecto.Migration

  import Ecto.Query

  alias Permaplanner.Gardens.BackgroundImage

  def up do
    create table(:garden_background_images, primary_key: false) do
      add :id, references(:gardens, type: :binary_id, on_delete: :delete_all),
        primary_key: true

      add :content_type, :string, null: false
      add :data, :binary, null: false

      timestamps(type: :utc_datetime_usec)
    end

    flush()

    migrate_background_images_from_documents()

    execute("""
    UPDATE gardens g
    SET document = g.document - 'backgroundImage'
    FROM garden_background_images b
    WHERE g.id = b.id
    """)
  end

  def down do
    restore_background_images_to_documents()
    drop table(:garden_background_images)
  end

  defp migrate_background_images_from_documents do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    from(g in "gardens", select: {g.id, g.document})
    |> repo().all()
    |> Enum.each(fn {garden_id, document} ->
      with true <- is_map(document),
           data_url when is_binary(data_url) <- document["backgroundImage"],
           {:ok, content_type, bytes} <- BackgroundImage.parse_data_url(data_url) do
        repo().insert_all("garden_background_images", [
          %{
            id: garden_id,
            content_type: content_type,
            data: bytes,
            inserted_at: now,
            updated_at: now
          }
        ])
      else
        _ -> :ok
      end
    end)
  end

  defp restore_background_images_to_documents do
    from(b in "garden_background_images", select: {b.id, b.content_type, b.data})
    |> repo().all()
    |> Enum.each(fn {garden_id, content_type, data} ->
      data_url = "data:#{content_type};base64,#{Base.encode64(data)}"

      repo().query!(
        """
        UPDATE gardens
        SET document = jsonb_set(document, '{backgroundImage}', to_jsonb($1::text))
        WHERE id = $2
        """,
        [data_url, garden_id]
      )
    end)
  end
end
