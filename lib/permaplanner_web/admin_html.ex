defmodule PermaplannerWeb.AdminHTML do
  use PermaplannerWeb, :html

  def root(assigns) do
    ~H"""
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="csrf-token" content={get_csrf_token()} />
        <title>Admin · Permaplanner</title>
        <link rel="stylesheet" href="/admin-assets/admin.css" />
        <script defer src="/admin-assets/phoenix/phoenix.min.js">
        </script>
        <script defer src="/admin-assets/live-view/phoenix_live_view.min.js">
        </script>
        <script defer src="/admin-assets/admin.js">
        </script>
      </head>
      <body>{@inner_content}</body>
    </html>
    """
  end
end
