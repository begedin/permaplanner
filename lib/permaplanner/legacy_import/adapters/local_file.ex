defmodule Permaplanner.LegacyImport.Adapters.LocalFile do
  @moduledoc false

  alias Permaplanner.Accounts.User
  alias Permaplanner.Gardens
  alias Permaplanner.Gardens.Garden

  @required_keys ~w(version syncRevision plants guilds mapScale backgroundOpacity onboardingState)

  def import_document(%User{} = user, attrs) do
    document = attrs["document"]

    with :ok <- validate_document(document) do
      Gardens.create_garden(user, %{
        "name" => attrs["name"] || "Imported garden",
        "document" => document
      })
    end
  end

  defp validate_document(document) when is_map(document) do
    cond do
      document["version"] != Garden.current_file_version() ->
        {:error, :invalid_version}

      not Enum.all?(@required_keys, &Map.has_key?(document, &1)) or
          Map.has_key?(document, "guildLocations") ->
        {:error, :invalid_document}

      not (is_list(document["plants"]) and Enum.all?(document["plants"], &is_map/1) and
             is_list(document["guilds"]) and Enum.all?(document["guilds"], &is_map/1)) ->
        {:error, :invalid_document}

      true ->
        :ok
    end
  end

  defp validate_document(_), do: {:error, :invalid_document}
end
