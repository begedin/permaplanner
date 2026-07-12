defmodule PermaplannerWeb.GardenShareHTML do
  @moduledoc false

  use PermaplannerWeb, :html

  @phase_labels %{
    "sown" => "Sown",
    "germinated" => "Germinated",
    "transplanted" => "Transplanted",
    "young" => "Young",
    "established" => "Established",
    "producing" => "Producing",
    "post_production" => "Post-production"
  }

  @vigor_labels %{
    1 => "Struggling",
    2 => "Stressed",
    3 => "Fair",
    4 => "Healthy",
    5 => "Thriving"
  }

  def show(%{garden_name: garden_name, guilds: guilds}) do
    normalized = normalize_guilds(guilds)

    show_template(%{
      garden_name: garden_name,
      guild_count: length(normalized),
      guild_content: guild_content(normalized)
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

  def guild_content(guilds) do
    guilds
    |> normalize_guilds()
    |> Enum.map(&guild_block/1)
    |> Enum.join("\n\n---\n\n")
    |> case do
      "" -> "(no guilds)"
      content -> content
    end
  end

  defp normalize_guilds(guilds) when is_list(guilds), do: guilds
  defp normalize_guilds(_), do: []

  defp guild_block(guild) when is_map(guild) do
    name =
      case guild["name"] do
        name when is_binary(name) ->
          trimmed = String.trim(name)
          if trimmed == "", do: "(unnamed guild)", else: trimmed

        _ ->
          "(unnamed guild)"
      end

    mulch =
      case Integer.parse(to_string(guild["mulchLevel"] || "")) do
        {level, _} when level in 1..5 -> level
        _ -> 1
      end

    note =
      case guild["note"] do
        note when is_binary(note) ->
          trimmed = String.trim(note)
          if trimmed == "", do: "(none)", else: trimmed

        _ ->
          "(none)"
      end

    id =
      case guild["id"] do
        id when is_binary(id) ->
          trimmed = String.trim(id)
          if trimmed == "", do: "n/a", else: trimmed

        _ ->
          "n/a"
      end

    [
      name,
      "",
      "- id: #{id}",
      "- plants:",
      plants_plain_text(guild["plants"]),
      "- mulch level: #{mulch}/5",
      "- note: #{note}"
    ]
    |> Enum.join("\n")
  end

  defp guild_block(_), do: ""

  defp plants_plain_text(plants) when is_list(plants) and plants != [] do
    plants
    |> Enum.map(&plant_line/1)
    |> Enum.join("\n")
  end

  defp plants_plain_text(_), do: "  - (none)"

  defp plant_line(plant) when is_map(plant) do
    name = plant_name(plant)
    condition = plant_condition(plant)
    stage = plant_stage(plant)

    [
      "  - #{name}",
      "    - condition: #{condition}",
      "    - stage: #{stage}"
    ]
    |> Enum.join("\n")
  end

  defp plant_line(_), do: "  - (unknown plant)"

  defp plant_name(plant) do
    case plant["name"] do
      name when is_binary(name) ->
        trimmed = String.trim(name)
        if trimmed != "", do: trimmed, else: nil

      _ ->
        nil
    end
    |> case do
      nil ->
        case plant["nameOrCultivar"] do
          name when is_binary(name) ->
            trimmed = String.trim(name)
            if trimmed != "", do: trimmed, else: nil

          _ ->
            nil
        end

      name ->
        name
    end
    |> case do
      nil ->
        case plant["plantId"] do
          id when is_binary(id) ->
            trimmed = String.trim(id)
            if trimmed != "", do: trimmed, else: "(unknown plant)"

          _ ->
            "(unknown plant)"
        end

      name ->
        name
    end
  end

  defp plant_condition(plant) do
    case Integer.parse(to_string(plant["vigor"] || "")) do
      {vigor, _} when vigor in 1..5 ->
        rounded = vigor
        label = Map.get(@vigor_labels, rounded, "unknown")
        "#{label} (#{rounded}/5)"

      _ ->
        case plant["condition"] do
          condition when is_binary(condition) ->
            trimmed = String.trim(condition)
            if trimmed == "", do: "unknown", else: trimmed

          _ ->
            "unknown"
        end
    end
  end

  defp plant_stage(plant) do
    case plant["growthPhase"] do
      phase when is_binary(phase) ->
        Map.get(@phase_labels, phase, phase)

      _ ->
        case plant["stage"] do
          stage when is_binary(stage) ->
            trimmed = String.trim(stage)
            if trimmed == "", do: "unknown", else: trimmed

          _ ->
            "unknown"
        end
    end
  end
end
