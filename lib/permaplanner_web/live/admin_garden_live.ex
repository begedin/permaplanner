defmodule PermaplannerWeb.AdminGardenLive do
  use Phoenix.LiveView, layout: false
  alias Permaplanner.Admin
  alias PermaplannerWeb.AdminComponents

  def handle_params(%{"id" => id}, _uri, socket) do
    {:noreply, assign(socket, garden: Admin.garden_names!(id))}
  end

  # Ignore stale inventory events arriving during navigation to this read-only screen.
  def handle_event(_event, _params, socket), do: {:noreply, socket}

  def render(assigns) do
    ~H"""
    <AdminComponents.shell>
      <p><.link navigate="/admin?tab=gardens">← Back to gardens</.link></p>
      <h1>{@garden.name}</h1>
      <p>Guild and plant names only.</p>
      <p :if={@garden.guilds == []}>No guilds in this garden.</p>
      <section :for={guild <- @garden.guilds} class="inventory guild-names">
        <h2>{if String.trim(guild.name) == "", do: "Unnamed guild", else: guild.name}</h2>
        <p :if={guild.plants == []}>No plants in this guild.</p>
        <ul>
          <li :for={plant <- guild.plants}>{plant}</li>
        </ul>
      </section>
    </AdminComponents.shell>
    """
  end
end
