defmodule PermaplannerWeb.OAuthHTML do
  use PermaplannerWeb, :html

  def page(assigns) do
    ~H"""
    <!doctype html>
    <html lang="en">
      <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Permaplanner connections</title></head>
      <body>
        <main>
          <h1>Permaplanner connections</h1>
          <%= if @user do %>
            <p>Signed in as {@user.email}</p>
            <%= if @client do %>
              <h2>Connect {@client.name}?</h2>
              <p>This connection can read all your saved gardens, guilds, plants, notes and layouts, and search the plant catalog. It cannot change your gardens.</p>
              <form action="/oauth/authorize" method="post">
                <input type="hidden" name="_csrf_token" value={get_csrf_token()} />
                <input :for={{key, value} <- @params} type="hidden" name={key} value={value} />
                <button name="decision" value="allow">Allow read access</button>
                <button name="decision" value="deny">Cancel</button>
              </form>
            <% else %>
              <p :if={@connections == []}>No active connections.</p>
              <ul>
                <li :for={connection <- @connections}>
                  {connection.client_id} — connected {Calendar.strftime(connection.inserted_at, "%Y-%m-%d")}
                  <form action="/oauth/connections/revoke" method="post">
                    <input type="hidden" name="_csrf_token" value={get_csrf_token()} />
                    <input type="hidden" name="connection_id" value={connection.id} />
                    <button>Revoke access</button>
                  </form>
                </li>
              </ul>
            <% end %>
          <% else %>
            <p>Sign in to Permaplanner, including two-factor authentication, then return here.</p>
            <p><a href="/login" target="_blank" rel="noopener">Sign in</a></p>
            <p><a href={@return_to}>I've signed in — continue</a></p>
          <% end %>
          <p><a href="/oauth/connections">Manage connections</a></p>
        </main>
      </body>
    </html>
    """
  end
end
