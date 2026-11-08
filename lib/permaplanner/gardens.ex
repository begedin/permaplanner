defmodule Permaplanner.Gardens do
  @moduledoc false

  import Ecto.Query, warn: false

  alias Permaplanner.Accounts.User
  alias Permaplanner.Gardens.BackgroundImage
  alias Permaplanner.Gardens.Garden
  alias Permaplanner.Gardens.Document
  alias Permaplanner.Gardens.GardenBackgroundImage
  alias Permaplanner.Repo

  def list_gardens(%User{id: user_id}) do
    from(g in Garden, where: g.user_id == ^user_id, order_by: [asc: g.inserted_at])
    |> Repo.all()
  end

  def fetch_garden(%User{id: user_id}, id) do
    with {:ok, id} <- Ecto.UUID.cast(id),
         %Garden{} = garden <- Repo.get_by(Garden, id: id, user_id: user_id) do
      {:ok, garden}
    else
      _ -> {:error, :not_found}
    end
  end

  def get_garden!(%User{} = user, id) do
    case fetch_garden(user, id) do
      {:ok, garden} -> Repo.preload(garden, :background_image)
      {:error, :not_found} -> raise Ecto.NoResultsError, queryable: Garden
    end
  end

  def garden_context(user, id) do
    with {:ok, garden} <- fetch_garden(user, id) do
      {:ok, Permaplanner.Gardens.Snapshot.build(garden)}
    end
  end

  def guild_context(user, garden_id, guild_id) do
    with {:ok, garden} <- fetch_garden(user, garden_id),
         guild when not is_nil(guild) <-
           Enum.find(garden.document["guilds"], &(&1["id"] == guild_id)) do
      %{guilds: [resolved]} = snapshot = Permaplanner.Gardens.Snapshot.build(garden, [guild])
      {:ok, snapshot |> Map.drop([:guilds, :plants]) |> Map.put(:guild, resolved)}
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def create_garden(%User{id: user_id}, attrs) do
    name = attrs["name"] || "My garden"
    document = Map.get(attrs, "document", default_document())

    with {:ok, stored_document, background_action} <- Document.prepare(document) do
      Repo.transaction(fn ->
        with {:ok, garden} <-
               %Garden{}
               |> Ecto.Changeset.change(
                 user_id: user_id,
                 name: name,
                 document: stored_document,
                 sync_revision: stored_document["syncRevision"],
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
  end

  def update_garden(%User{id: user_id}, id, attrs) do
    document = attrs["document"]

    with {:ok, stored_document, background_action} <- Document.prepare(document) do
      client_revision = Map.get(attrs, "syncRevision", document["syncRevision"])

      Repo.transaction(fn ->
        garden =
          from(g in Garden, where: g.id == ^id and g.user_id == ^user_id, lock: "FOR UPDATE")
          |> Repo.one!()

        if client_revision != garden.sync_revision do
          Repo.rollback(:stale)
        end

        new_revision = garden.sync_revision + 1

        changes = %{
          document: Map.put(stored_document, "syncRevision", new_revision),
          sync_revision: new_revision,
          file_version: stored_document["version"]
        }

        with {:ok, garden} <- garden |> Ecto.Changeset.change(changes) |> Repo.update(),
             :ok <- apply_background_action(garden.id, background_action) do
          garden
        else
          {:error, reason} -> Repo.rollback(reason)
        end
      end)
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
      "landmarks" => [],
      "plotBorder" => [],
      "mapScale" => %{
        "start" => %{"x" => 20, "y" => 20},
        "end" => %{"x" => 150, "y" => 20},
        "linePhysicalLength" => 1,
        "unit" => "m"
      },
      "backgroundOpacity" => 0.4,
      "onboardingState" => "initial"
    }
  end

  defp apply_background_action(_garden_id, :unchanged), do: :ok

  defp apply_background_action(garden_id, {:upload, upload}) do
    with {:ok, bytes} <- File.read(upload.path) do
      apply_background_action(garden_id, {:set, upload.content_type, bytes})
    end
  end

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
