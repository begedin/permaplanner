defmodule PermaplannerWeb.GardenShareHTML do
  @moduledoc false

  use PermaplannerWeb, :html

  alias Permaplanner.Gardens.ShareSummary

  def show(%{garden_name: garden_name, guilds: guilds}) do
    show_template(%{
      garden_name: garden_name,
      guild_count: length(guilds),
      guild_content: ShareSummary.build(guilds)
    })
  end

  defp show_template(assigns) do
    ~H"""
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Permaplanner Guilds ({@garden_name})</title>
        <style>
          body {
            margin: 0;
            padding: 1rem;
            font-family:
              ui-sans-serif,
              system-ui,
              -apple-system,
              Segoe UI,
              Roboto,
              Helvetica,
              Arial,
              sans-serif;
            color: #111827;
            background: #f9fafb;
          }
          main {
            max-width: 980px;
            margin: 0 auto;
          }
          pre {
            white-space: pre-wrap;
            word-break: break-word;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 0.85rem;
            line-height: 1.45;
            color: #1f2937;
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 0.5rem;
            padding: 0.75rem;
          }
          .meta {
            color: #4b5563;
            margin-bottom: 0.75rem;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>Permaplanner Guilds</h1>
          <p class="meta">Garden: {@garden_name} · Guilds: {@guild_count}</p>
          <pre>{@guild_content}</pre>
        </main>
      </body>
    </html>
    """
  end
end
