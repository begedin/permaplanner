defmodule PermaplannerWeb.AdminComponents do
  use Phoenix.Component

  slot :inner_block, required: true

  def shell(assigns) do
    ~H"""
    <div>
      <header class="admin-banner">
        <div><strong>Permaplanner</strong><span class="admin-badge">Admin · Read only</span></div>
        <a href="/">Back to app ↗</a>
      </header>
      <main>
        <p class="eyebrow">ADMIN / APP INVENTORY</p>
        <div class="connection-warning" role="status">
          Connecting to admin… Data may be out of date while disconnected.
        </div>
        {render_slot(@inner_block)}
        <footer>Admin · Read-only inventory. Refresh the page for current data.</footer>
      </main>
    </div>
    """
  end

  attr :result, :map, required: true

  def users_table(assigns) do
    ~H"""
    <div class="table-scroll" tabindex="0" role="region" aria-label="users table">
      <table>
        <caption>{@result.total} matching users · Dates shown in UTC</caption>
        <thead>
          <tr>
            <th scope="col">Email / User ID</th><th scope="col">Gardens</th><th scope="col">
              Created
            </th>
          </tr>
        </thead>
        <tbody>
          <tr :for={user <- @result.rows}>
            <td><strong>{user.email}</strong><small>{user.id}</small></td>
            <td>{user.garden_count}</td><td>{date(user.inserted_at)}</td>
          </tr>
          <tr :if={@result.rows == []}>
            <td colspan="3" class="empty">No users found.</td>
          </tr>
        </tbody>
      </table>
    </div>
    """
  end

  attr :result, :map, required: true

  def gardens_table(assigns) do
    ~H"""
    <div class="table-scroll" tabindex="0" role="region" aria-label="gardens table">
      <table>
        <caption>{@result.total} matching gardens · Dates shown in UTC</caption>
        <thead>
          <tr>
            <th scope="col">Garden / Garden ID</th><th scope="col">Owner</th><th scope="col">
              Created
            </th><th scope="col">Last updated</th>
          </tr>
        </thead>
        <tbody>
          <tr :for={garden <- @result.rows}>
            <td>
              <strong><.link navigate={"/admin/gardens/#{garden.id}"}>{garden.name}</.link></strong><small>{garden.id}</small>
            </td>
            <td>{garden.email}</td><td>{date(garden.inserted_at)}</td><td>
              {date(garden.updated_at)}
            </td>
          </tr>
          <tr :if={@result.rows == []}>
            <td colspan="4" class="empty">No gardens found.</td>
          </tr>
        </tbody>
      </table>
    </div>
    """
  end

  defp date(value), do: Calendar.strftime(value, "%Y-%m-%d %H:%M UTC")
end
