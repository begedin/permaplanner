defmodule Permaplanner.Gardens do
  @moduledoc false

  import Ecto.Query, warn: false

  alias Permaplanner.Accounts.User
  alias Permaplanner.Gardens.Garden
  alias Permaplanner.Repo

  def list_gardens(%User{id: user_id}) do
    from(g in Garden, where: g.user_id == ^user_id, order_by: [asc: g.inserted_at])
    |> Repo.all()
  end

  def get_garden!(%User{id: user_id}, id) do
    Repo.get_by!(Garden, id: id, user_id: user_id)
  end

  def create_garden(%User{id: user_id}, attrs) do
    name = attrs["name"] || "My garden"
    document = attrs["document"] || default_document()

    %Garden{}
    |> Ecto.Changeset.change(
      user_id: user_id,
      name: name,
      document: document,
      sync_revision: document["syncRevision"] || 0,
      file_version: Garden.current_file_version(),
      import_source: attrs["import_source"]
    )
    |> Repo.insert()
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
      changes =
        if document do
          new_revision = garden.sync_revision + 1

          %{
            document: Map.put(document, "syncRevision", new_revision),
            sync_revision: new_revision,
            file_version: document["version"] || Garden.current_file_version()
          }
        else
          %{}
        end

      garden
      |> Ecto.Changeset.change(changes)
      |> Repo.update()
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
    %{
      id: garden.id,
      name: garden.name,
      syncRevision: garden.sync_revision,
      fileVersion: garden.file_version,
      importSource: garden.import_source,
      document: garden.document,
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
end
