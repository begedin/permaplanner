defmodule Permaplanner.Gardens.Document do
  @moduledoc false

  alias Permaplanner.Gardens.{BackgroundImage, Garden}

  @functions ~w(nitrogen_fixer dynamic_accumulator pollinator_attractor pest_repellent ground_cover wildfire_suppressor mulcher edible medicinal)
  @layers ~w(overstory understory shrub ground_cover vine herb root)
  @phases ~w(sown germinated transplanted young established producing post_production)
  @onboarding ~w(initial movingFirst movedFirst movingSecond movedSecond settingLength done)

  def prepare(document) when is_map(document) do
    cond do
      document["version"] != Garden.current_file_version() ->
        {:error, :invalid_version}

      valid_document?(document) ->
        BackgroundImage.split_from_document(document)

      true ->
        {:error, :invalid_document}
    end
  end

  def prepare(_), do: {:error, :invalid_document}

  defp valid_document?(doc) do
    not Map.has_key?(doc, "guildLocations") and
      is_integer(doc["syncRevision"]) and doc["syncRevision"] >= 0 and
      rows?(doc["plants"], &plant?/1) and rows?(doc["guilds"], &guild?/1) and
      rows?(doc["landmarks"], &landmark?/1) and
      plot_border?(doc["plotBorder"]) and
      scale?(doc["mapScale"]) and is_number(doc["backgroundOpacity"]) and
      doc["backgroundOpacity"] >= 0 and doc["backgroundOpacity"] <= 1 and
      doc["onboardingState"] in @onboarding
  end

  defp scale?(%{
         "start" => start,
         "end" => ending,
         "linePhysicalLength" => length,
         "unit" => unit
       }) do
    point?(start) and point?(ending) and is_number(length) and length > 0 and
      unit in ~w(unspecified m ft cm in yd)
  end

  defp scale?(_), do: false
  defp point?(%{"x" => x, "y" => y}), do: is_number(x) and is_number(y)
  defp point?(_), do: false

  defp plot_border?([]), do: true

  defp plot_border?([first | rest] = points) when length(points) >= 3 do
    if Enum.all?(points, &point?/1) do
      # Twice the signed area; keep aligned with usePlotBorderStore.save.
      area =
        Enum.zip(points, rest ++ [first])
        |> Enum.reduce(0, fn {point, next}, sum ->
          sum + point["x"] * next["y"] - next["x"] * point["y"]
        end)

      abs(area) > 0.001
    else
      false
    end
  rescue
    ArithmeticError -> false
  end

  defp plot_border?(_), do: false

  defp landmark?(landmark) when is_map(landmark) do
    is_binary(landmark["id"]) and is_binary(landmark["name"]) and point?(landmark) and
      is_number(landmark["width"]) and landmark["width"] > 0 and
      is_number(landmark["height"]) and landmark["height"] > 0 and
      is_number(landmark["rotation"]) and landmark["rotation"] >= 0 and landmark["rotation"] < 360
  end

  defp landmark?(_), do: false

  defp plant?(plant) when is_map(plant) do
    is_binary(plant["id"]) and is_binary(plant["speciesId"]) and
      (is_nil(plant["cultivarId"]) or is_binary(plant["cultivarId"])) and
      optional?(plant, "speciesOverride", &override?/1) and
      optional?(plant, "cultivarOverride", &override?/1)
  end

  defp plant?(_), do: false

  defp override?(override) when is_map(override) do
    optional?(override, "name", &is_binary/1) and
      optional?(override, "iconId", &is_binary/1) and
      optional?(override, "functions", &rows?(&1, fn value -> value in @functions end)) and
      optional?(override, "layers", &rows?(&1, fn value -> value in @layers end))
  end

  defp override?(_), do: false

  defp guild?(guild) when is_map(guild) do
    is_binary(guild["id"]) and is_binary(guild["name"]) and
      rows?(guild["path"], &point?/1) and rows?(guild["plants"], &thing?/1) and
      guild["mulchLevel"] in 1..5 and optional?(guild, "note", &is_binary/1)
  end

  defp guild?(_), do: false

  defp thing?(thing) when is_map(thing) do
    is_binary(thing["id"]) and is_binary(thing["plantId"]) and
      is_binary(thing["nameOrCultivar"]) and point?(thing) and
      is_number(thing["width"]) and is_number(thing["height"]) and
      optional?(thing, "note", &is_binary/1) and
      optional?(thing, "growthPhase", &(&1 in @phases)) and
      optional?(thing, "vigor", &(&1 in 1..5))
  end

  defp thing?(_), do: false

  defp rows?(rows, valid?), do: is_list(rows) and Enum.all?(rows, valid?)

  defp optional?(map, key, valid?) do
    case Map.fetch(map, key) do
      :error -> true
      {:ok, value} -> valid?.(value)
    end
  end
end
