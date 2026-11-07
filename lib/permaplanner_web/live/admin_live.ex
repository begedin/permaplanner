defmodule PermaplannerWeb.AdminLive do
  use Phoenix.LiveView, layout: false
  alias Permaplanner.Admin
  alias PermaplannerWeb.AdminComponents

  # Preserve bookmarks from the original query-based detail view.
  def handle_params(%{"garden" => id}, _uri, socket) when is_binary(id) do
    case Ecto.UUID.cast(id) do
      {:ok, uuid} -> {:noreply, push_navigate(socket, to: "/admin/gardens/#{uuid}")}
      :error -> raise Ecto.NoResultsError, queryable: Permaplanner.Gardens.Garden
    end
  end

  def handle_params(params, _uri, socket) do
    tab = if params["tab"] == "gardens", do: "gardens", else: "users"
    search = search_text(params["q"])

    page =
      case params["page"] do
        value when is_binary(value) ->
          case Integer.parse(value) do
            {number, ""} -> max(number, 1)
            _ -> 1
          end

        _ ->
          1
      end

    {:noreply,
     assign(socket,
       tab: tab,
       search: search,
       overview: Admin.overview(),
       result: Admin.list(tab, search, page)
     )}
  end

  def handle_event("search", params, socket) do
    {:noreply, push_patch(socket, to: path(socket.assigns.tab, search_text(params["q"]), 1))}
  end

  defp search_text(value) when is_binary(value), do: String.slice(value, 0, 160)
  defp search_text(_), do: ""

  defp path(tab, search, page),
    do: "/admin?" <> URI.encode_query(%{tab: tab, q: search, page: page})

  def render(assigns) do
    ~H"""
    <AdminComponents.shell>
      <h1>Users &amp; gardens</h1>
      <p>Existing accounts and saved gardens. Signed in as <strong>{@admin_email}</strong>.</p>
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
        <form
          id="admin-search"
          phx-change="search"
          phx-submit="search"
          action="/admin"
          method="get"
        >
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
        <%= if @tab == "users" do %>
          <AdminComponents.users_table result={@result} />
        <% else %>
          <AdminComponents.gardens_table result={@result} />
        <% end %>
        <nav class="pagination" aria-label="Pagination">
          <.link :if={@result.page > 1} patch={path(@tab, @search, @result.page - 1)}>← Previous</.link>
          <span>Page {@result.page} of {@result.pages}</span>
          <.link :if={@result.page < @result.pages} patch={path(@tab, @search, @result.page + 1)}>Next →</.link>
        </nav>
      </section>
    </AdminComponents.shell>
    """
  end
end
