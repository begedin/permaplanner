defmodule PermaplannerWeb.AdminLive do
  use Phoenix.LiveView, layout: false
  alias Permaplanner.Admin
  alias PermaplannerWeb.AdminAuth

  def mount(_params, session, socket) do
    token = session["user_token"]

    case AdminAuth.authenticate(token) do
      nil -> {:ok, redirect(socket, to: "/admin")}
      user -> {:ok, assign(socket, token: token, admin_email: user.email)}
    end
  end

  def handle_params(params, _uri, socket) do
    if AdminAuth.authenticate(socket.assigns.token) do
      tab = if params["tab"] == "gardens", do: "gardens", else: "users"
      search = String.slice(params["q"] || "", 0, 160)

      page =
        case Integer.parse(params["page"] || "1") do
          {number, ""} -> number
          _ -> 1
        end

      {:noreply,
       assign(socket,
         tab: tab,
         search: search,
         overview: Admin.overview(),
         result: Admin.list(tab, search, page)
       )}
    else
      {:noreply, redirect(socket, to: "/admin")}
    end
  end

  def handle_event("search", %{"q" => search}, socket) do
    if AdminAuth.authenticate(socket.assigns.token) do
      {:noreply,
       push_patch(socket, to: path(socket.assigns.tab, String.slice(search, 0, 160), 1))}
    else
      {:noreply, redirect(socket, to: "/admin")}
    end
  end

  defp path(tab, search, page),
    do: "/admin?" <> URI.encode_query(%{tab: tab, q: search, page: page})

  defp date(value), do: Calendar.strftime(value, "%Y-%m-%d %H:%M UTC")

  def render(assigns) do
    ~H"""
    <div>
      <header class="admin-banner">
        <div><strong>Permaplanner</strong><span class="admin-badge">Admin · Read only</span></div>
        <a href="/">Back to app ↗</a>
      </header>
      <main>
        <p class="eyebrow">ADMIN / APP INVENTORY</p>
        <h1>Users &amp; gardens</h1>
        <p>Existing accounts and saved gardens. Signed in as <strong>{@admin_email}</strong>.</p>
        <div class="connection-warning" role="status">
          Connecting to admin… Data may be out of date while disconnected.
        </div>
        <noscript>Enable JavaScript to use live search. You can still browse with the links below.</noscript>
        <section class="stats" aria-label="App totals">
          <article><span>Total users</span><strong>{@overview.users}</strong></article>
          <article><span>Total gardens</span><strong>{@overview.gardens}</strong></article>
          <article>
            <span>Users without gardens</span><strong>{@overview.without_gardens}</strong>
          </article>
        </section>
        <section class="inventory" aria-label="Inventory">
          <nav class="tabs" aria-label="Admin tables">
            <.link patch={path("users", "", 1)} aria-current={if @tab == "users", do: "page"}>Users</.link>
            <.link patch={path("gardens", "", 1)} aria-current={if @tab == "gardens", do: "page"}>Gardens</.link>
          </nav>
          <form id="admin-search" phx-change="search" phx-submit="search" action="/admin" method="get">
            <input type="hidden" name="tab" value={@tab} />
            <label for="search">{if @tab == "users",
              do: "Search by email",
              else: "Search by garden name or owner email"}</label>
            <div class="search-controls">
              <input
                id="search"
                type="search"
                name="q"
                value={@search}
                maxlength="160"
                phx-debounce="300"
              /><button type="submit">Search</button>
            </div>
          </form>
          <div class="table-scroll" tabindex="0" role="region" aria-label={@tab <> " table"}>
            <table>
              <caption>{@result.total} matching {@tab} · Dates shown in UTC</caption>
              <thead>
                <tr>
                  <th scope="col">
                    {if @tab == "users", do: "Email / User ID", else: "Garden / Garden ID"}
                  </th>
                  <th scope="col">{if @tab == "users", do: "Gardens", else: "Owner"}</th>
                  <th scope="col">Created</th>
                  <th :if={@tab == "gardens"} scope="col">Last updated</th>
                </tr>
              </thead>
              <tbody>
                <tr :for={row <- @result.rows}>
                  <td>
                    <strong>{if @tab == "users", do: row.email, else: row.name}</strong><small>{row.id}</small>
                  </td>
                  <td>
                    <%= if @tab == "users" do %>
                      {row.garden_count}
                    <% else %>
                      {row.email}
                    <% end %>
                  </td>
                  <td>{date(row.inserted_at)}</td>
                  <td :if={@tab == "gardens"}>{date(row.updated_at)}</td>
                </tr>
                <tr :if={@result.rows == []}>
                  <td colspan={if @tab == "users", do: 3, else: 4} class="empty">No {@tab} found.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <nav class="pagination" aria-label="Pagination">
            <.link :if={@result.page > 1} patch={path(@tab, @search, @result.page - 1)}>← Previous</.link>
            <span>Page {@result.page} of {@result.pages}</span>
            <.link :if={@result.page < @result.pages} patch={path(@tab, @search, @result.page + 1)}>Next →</.link>
          </nav>
        </section>
        <footer>Admin · Read-only inventory. Refresh the page for current totals.</footer>
      </main>
    </div>
    """
  end
end
