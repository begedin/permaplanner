defmodule PermaplannerWeb.GardenShareController do
  use Phoenix.Controller,
    formats: [:html, :json]

  import Plug.Conn

  alias Permaplanner.GardenShares
  alias Permaplanner.Gardens
  alias PermaplannerWeb.GardenShareHTML
  alias PermaplannerWeb.GardenShareJSON

  plug :put_view, html: GardenShareHTML, json: GardenShareJSON
  plug :put_layout, false
  plug :put_root_layout, false

  def show(conn, %{"id" => id}) do
    case parse_share_id(id) do
      {:json, share_id} ->
        render_public_share(conn, :json, share_id)

      {:html, share_id} ->
        render_public_share(conn, :html, share_id)

      :invalid ->
        conn |> put_status(:not_found) |> text("Not Found")
    end
  end

  def index(conn, %{"garden_id" => garden_id}) do
    garden = Gardens.get_garden!(conn.assigns.current_user, garden_id)
    shares = GardenShares.list_shares(garden)
    render(conn, :index, shares: shares)
  end

  def create(conn, %{"garden_id" => garden_id}) do
    garden = Gardens.get_garden!(conn.assigns.current_user, garden_id)

    case GardenShares.create_share(garden) do
      {:ok, share} ->
        conn
        |> put_status(:created)
        |> render(:create, share: share)

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

  defp render_public_share(conn, format, share_id) do
    case load_share_guilds(share_id) do
      :not_found ->
        render_share_not_found(conn, format)

      {:ok, garden_name, guilds} ->
        conn
        |> put_format(format)
        |> render(:show, garden_name: garden_name, guilds: guilds)
    end
  end

  defp render_share_not_found(conn, :html) do
    conn |> put_status(:not_found) |> text("Not Found")
  end

  defp render_share_not_found(conn, :json) do
    conn
    |> put_status(:not_found)
    |> put_format(:json)
    |> render(:not_found)
  end

  defp load_share_guilds(id) do
    case GardenShares.get_share(id) do
      nil ->
        :not_found

      share ->
        garden = share.garden
        guilds = Map.get(garden.document, "guilds", [])
        {:ok, garden.name, guilds}
    end
  end

  defp parse_share_id(id) when is_binary(id) do
    case String.split(id, ".", parts: 2) do
      [share_id, "json"] when share_id != "" -> {:json, share_id}
      [_share_id, _unsupported] -> :invalid
      [share_id] when share_id != "" -> {:html, share_id}
      _ -> :invalid
    end
  end

  defp parse_share_id(_), do: :invalid
end
