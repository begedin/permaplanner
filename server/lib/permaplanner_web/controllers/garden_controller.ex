defmodule PermaplannerWeb.GardenController do
  use PermaplannerWeb, :controller

  alias Permaplanner.Gardens

  def index(conn, _params) do
    gardens =
      conn.assigns.current_user
      |> Gardens.list_gardens()
      |> Enum.map(&Gardens.garden_summary/1)

    json(conn, %{gardens: gardens})
  end

  def create(conn, params) do
    case Gardens.create_garden(conn.assigns.current_user, params) do
      {:ok, garden} ->
        conn |> put_status(:created) |> json(%{garden: Gardens.garden_json(garden)})

      {:error, _} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "create_failed"})
    end
  end

  def show(conn, %{"id" => id}) do
    garden = Gardens.get_garden!(conn.assigns.current_user, id)
    json(conn, %{garden: Gardens.garden_json(garden)})
  end

  def update(conn, %{"id" => id} = params) do
    case Gardens.update_garden(conn.assigns.current_user, id, params) do
      {:ok, garden} ->
        json(conn, %{syncRevision: garden.sync_revision})

      {:error, :stale} ->
        conn |> put_status(:conflict) |> json(%{error: "stale_revision"})

      {:error, _} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "update_failed"})
    end
  end

  def delete(conn, %{"id" => id}) do
    Gardens.delete_garden(conn.assigns.current_user, id)
    send_resp(conn, :no_content, "")
  end
end
