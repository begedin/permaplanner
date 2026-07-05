defmodule Permaplanner.LegacyImport.Adapters.LocalFile do
  @moduledoc false

  alias Permaplanner.Accounts.User
  alias Permaplanner.Gardens
  alias Permaplanner.Gardens.Garden

  @required_keys ~w(version syncRevision plants guilds mapScale backgroundOpacity onboardingState)

  @spec import_document(User.t(), map()) :: {:ok, Gardens.Garden.t()} | {:error, term()}
  def import_document(%User{} = user, attrs) do
    document = attrs["document"]
    name = attrs["name"]

    with :ok <- validate_document(document),
         {:ok, garden} <-
           Gardens.create_garden(user, %{
             "name" => name || default_name(document),
             "document" => document
           }) do
      {:ok, garden}
    else
      {:error, _} = err -> err
      :error -> {:error, :invalid_document}
    end
  end

  defp validate_document(document) when is_map(document) do
    version = document["version"]

    cond do
      version != Garden.current_file_version() ->
        {:error, :invalid_version}

      not Enum.all?(@required_keys, &Map.has_key?(document, &1)) ->
        {:error, :invalid_document}

      true ->
        :ok
    end
  end

  defp validate_document(_), do: {:error, :invalid_document}

  defp default_name(document) do
    case document["syncRevision"] do
      n when is_integer(n) -> "Imported garden"
      _ -> "Imported garden"
    end
  end
end
