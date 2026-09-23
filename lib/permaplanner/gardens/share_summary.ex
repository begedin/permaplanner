defmodule Permaplanner.Gardens.ShareSummary do
  @moduledoc "Plain-text share summary of guilds in the current garden document format."

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

  def build([]), do: "(no guilds)"
  def build(guilds), do: Enum.map_join(guilds, "\n\n---\n\n", &guild_block/1)

  defp guild_block(guild) do
    [
      display_text(guild["name"], "(unnamed guild)"),
      "",
      "- id: #{display_text(guild["id"], "n/a")}",
      "- plants:",
      plant_lines(guild["plants"]),
      "- mulch level: #{guild["mulchLevel"]}/5",
      "- note: #{display_text(guild["note"], "(none)")}"
    ]
    |> Enum.join("\n")
  end

  defp plant_lines([]), do: "  - (none)"

  defp plant_lines(plants) do
    Enum.map_join(plants, "\n", fn plant ->
      name =
        display_text(plant["nameOrCultivar"], display_text(plant["plantId"], "(unknown plant)"))

      condition =
        case plant["vigor"] do
          nil -> "unknown"
          vigor -> "#{Map.fetch!(@vigor_labels, vigor)} (#{vigor}/5)"
        end

      stage =
        case plant["growthPhase"] do
          nil -> "unknown"
          phase -> Map.fetch!(@phase_labels, phase)
        end

      "  - #{name}\n    - condition: #{condition}\n    - stage: #{stage}"
    end)
  end

  defp display_text(nil, fallback), do: fallback

  defp display_text(value, fallback) do
    case String.trim(value) do
      "" -> fallback
      text -> text
    end
  end
end
