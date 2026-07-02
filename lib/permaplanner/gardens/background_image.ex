defmodule Permaplanner.Gardens.BackgroundImage do
  @moduledoc false

  alias Permaplanner.Gardens.GardenBackgroundImage

  @spec parse_data_url(String.t()) :: {:ok, String.t(), binary()} | :error
  def parse_data_url(data_url) when is_binary(data_url) do
    case String.split(data_url, ",", parts: 2) do
      ["data:" <> header, b64] ->
        content_type =
          case Regex.run(~r/^([^;]+)/, header) do
            [_, mime] -> mime
            _ -> "application/octet-stream"
          end

        case Base.decode64(String.trim(b64)) do
          {:ok, bytes} -> {:ok, content_type, bytes}
          :error -> :error
        end

      _ ->
        :error
    end
  end

  def parse_data_url(_), do: :error

  @spec to_data_url(GardenBackgroundImage.t()) :: String.t()
  def to_data_url(%GardenBackgroundImage{content_type: content_type, data: data}) do
    "data:#{content_type};base64,#{Base.encode64(data)}"
  end

  @spec merge_into_document(map(), GardenBackgroundImage.t() | nil) :: map()
  def merge_into_document(document, nil), do: document

  def merge_into_document(document, %GardenBackgroundImage{} = background_image) do
    Map.put(document, "backgroundImage", to_data_url(background_image))
  end

  @doc """
  Splits a plan document into stored JSON (without inline image) and a background action.

  - `:unchanged` — no `backgroundImage` key in the payload
  - `:clear` — explicit `null`
  - `{:set, content_type, bytes}` — new or updated image bytes
  """
  @spec split_from_document(map()) :: {map(), :unchanged | :clear | {:set, String.t(), binary()}}
  def split_from_document(document) when is_map(document) do
    case Map.fetch(document, "backgroundImage") do
      :error ->
        {document, :unchanged}

      {:ok, nil} ->
        {Map.delete(document, "backgroundImage"), :clear}

      {:ok, data_url} when is_binary(data_url) ->
        case parse_data_url(data_url) do
          {:ok, content_type, bytes} ->
            {Map.delete(document, "backgroundImage"), {:set, content_type, bytes}}

          :error ->
            {Map.delete(document, "backgroundImage"), :unchanged}
        end

      _ ->
        {Map.delete(document, "backgroundImage"), :unchanged}
    end
  end
end
