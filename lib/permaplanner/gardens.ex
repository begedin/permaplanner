defmodule Permaplanner.Gardens do
  @moduledoc false

  import Ecto.Query, warn: false

  alias Permaplanner.Accounts.User
  alias Permaplanner.Gardens.BackgroundImage
  alias Permaplanner.Gardens.Garden
  alias Permaplanner.Gardens.GardenBackgroundImage
  alias Permaplanner.Repo

  def list_gardens(%User{id: user_id}) do
    from(g in Garden, where: g.user_id == ^user_id, order_by: [asc: g.inserted_at])
    |> Repo.all()
  end

  def get_garden!(%User{id: user_id}, id) do
    Garden
    |> Repo.get_by!(id: id, user_id: user_id)
    |> Repo.preload(:background_image)
  end

  def create_garden(%User{id: user_id}, attrs) do
    name = attrs["name"] || "My garden"
    document = attrs["document"] || default_document()
    {stored_document, background_action} = BackgroundImage.split_from_document(document)

    Repo.transaction(fn ->
      with {:ok, garden} <-
             %Garden{}
             |> Ecto.Changeset.change(
               user_id: user_id,
               name: name,
               document: stored_document,
               sync_revision: stored_document["syncRevision"] || 0,
               file_version: Garden.current_file_version()
             )
             |> Repo.insert(),
           :ok <- apply_background_action(garden.id, background_action) do
        Repo.preload(garden, :background_image)
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  def update_garden(%User{} = user, id, attrs) do
    garden = get_garden!(user, id)
    document = attrs["document"]

    client_revision =
      attrs["syncRevision"] ||
        if(is_map(document), do: document["syncRevision"], else: nil)

    if client_revision != nil and client_revision < garden.sync_revision do
      {:error, :stale}
    else
      if document do
        {stored_document, background_action} = BackgroundImage.split_from_document(document)
        new_revision = garden.sync_revision + 1

        stored_document =
          stored_document
          |> Map.put("syncRevision", new_revision)

        changes = %{
          document: stored_document,
          sync_revision: new_revision,
          file_version: stored_document["version"] || Garden.current_file_version()
        }

        Repo.transaction(fn ->
          with {:ok, garden} <-
                 garden
                 |> Ecto.Changeset.change(changes)
                 |> Repo.update(),
               :ok <- apply_background_action(garden.id, background_action) do
            Repo.preload(garden, :background_image)
          else
            {:error, reason} -> Repo.rollback(reason)
          end
        end)
      else
        {:ok, garden}
      end
    end
  end

  def delete_garden(%User{} = user, id) do
    garden = get_garden!(user, id)
    Repo.delete(garden)
  end

  def garden_summary(%Garden{} = garden) do
    %{
      id: garden.id,
      name: garden.name,
      syncRevision: garden.sync_revision,
      updatedAt: garden.updated_at
    }
  end

  def garden_json(%Garden{} = garden) do
    document = BackgroundImage.merge_into_document(garden.document, garden.background_image)

    %{
      id: garden.id,
      name: garden.name,
      syncRevision: garden.sync_revision,
      fileVersion: garden.file_version,
      document: document,
      updatedAt: garden.updated_at,
      insertedAt: garden.inserted_at
    }
  end

  def default_document do
    %{
      "version" => Garden.current_file_version(),
      "syncRevision" => 0,
      "plants" => [],
      "guilds" => [],
      "mapScale" => %{
        "start" => %{"x" => 20, "y" => 20},
        "end" => %{"x" => 150, "y" => 20},
        "linePhysicalLength" => 1
      },
      "backgroundOpacity" => 0.4,
      "onboardingState" => "done"
    }
  end

  defp apply_background_action(_garden_id, :unchanged), do: :ok

  defp apply_background_action(garden_id, :clear) do
    from(b in GardenBackgroundImage, where: b.id == ^garden_id)
    |> Repo.delete_all()

    :ok
  end

  defp apply_background_action(garden_id, {:set, content_type, bytes}) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    Repo.insert_all(
      GardenBackgroundImage,
      [
        %{
          id: garden_id,
          content_type: content_type,
          data: bytes,
          inserted_at: now,
          updated_at: now
        }
      ],
      on_conflict: {:replace, [:content_type, :data, :updated_at]},
      conflict_target: [:id]
    )

    :ok
  end
end
