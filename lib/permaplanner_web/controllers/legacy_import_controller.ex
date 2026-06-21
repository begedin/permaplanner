defmodule PermaplannerWeb.LegacyImportController do
  use PermaplannerWeb, :controller

  alias Permaplanner.Gardens
  alias Permaplanner.LegacyImport

  def local(conn, params) do
    case LegacyImport.import_local(conn.assigns.current_user, params) do
      {:ok, garden} ->
        conn |> put_status(:created) |> json(%{garden: Gardens.garden_json(garden)})

      {:error, :invalid_version} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "invalid_version"})

      {:error, :invalid_document} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "invalid_document"})

      {:error, _} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "import_failed"})
    end
  end
end
