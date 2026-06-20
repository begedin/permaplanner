defmodule PermaplannerWeb.GardenShareController do
  use PermaplannerWeb, :controller

  alias Permaplanner.GardenShares
  alias Permaplanner.Gardens
  alias PermaplannerWeb.GardenShareHTML

  def show(conn, %{"id" => id}) do
    case GardenShares.get_share(id) do
      nil ->
        conn |> put_status(:not_found) |> text("Not Found")

      share ->
        garden = share.garden
        guilds = Map.get(garden.document, "guilds", [])

        conn
        |> put_resp_content_type("text/html")
        |> send_resp(200, GardenShareHTML.render(garden.name, guilds))
    end
  end

  def index(conn, %{"garden_id" => garden_id}) do
    garden = Gardens.get_garden!(conn.assigns.current_user, garden_id)

    shares =
      garden
      |> GardenShares.list_shares()
      |> Enum.map(&share_json(conn, &1))

    json(conn, %{shares: shares})
  end

  def create(conn, %{"garden_id" => garden_id}) do
    garden = Gardens.get_garden!(conn.assigns.current_user, garden_id)

    case GardenShares.create_share(garden) do
      {:ok, share} ->
        conn
        |> put_status(:created)
        |> json(%{share: share_json(conn, share)})

      {:error, _} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "create_failed"})
    end
  end

  def delete(conn, %{"garden_id" => garden_id, "id" => share_id}) do
    case GardenShares.revoke_share(conn.assigns.current_user, garden_id, share_id) do
      {:ok, _} ->
        send_resp(conn, :no_content, "")

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "not_found"})

      {:error, _} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "delete_failed"})
    end
  end

  defp share_json(conn, share) do
    %{
      id: share.id,
      url: share_url(conn, share.id),
      createdAt: share.inserted_at
    }
  end

  defp share_url(_conn, share_id) do
    PermaplannerWeb.Endpoint.url() <> "/share/" <> share_id
  end
end
