defmodule PermaplannerWeb.GardenShareJSON do
  @moduledoc false

  alias Permaplanner.Gardens.Share
  alias PermaplannerWeb.GardenShareHTML

  def show(%{garden_name: garden_name, guilds: guilds}) do
    %{
      gardenName: garden_name,
      guilds: guilds,
      summary: GardenShareHTML.guild_content(guilds)
    }
  end

  def index(%{shares: shares}) do
    %{shares: Enum.map(shares, &share_metadata/1)}
  end

  def create(%{share: share}) do
    %{share: share_metadata(share)}
  end

  def not_found(_assigns) do
    %{error: "not_found"}
  end

  defp share_metadata(%Share{} = share) do
    %{
      id: share.id,
      url: share_url(share.id),
      createdAt: share.inserted_at
    }
  end

  defp share_url(share_id) do
    "/share/" <> share_id
  end
end
