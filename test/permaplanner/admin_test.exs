defmodule Permaplanner.AdminTest do
  use Permaplanner.DataCase, async: true
  alias Permaplanner.{Admin, Gardens}
  alias Permaplanner.Accounts.User

  test "deduplicates references before resolving names, preserving distinct identities and fallbacks" do
    owner = Repo.insert!(%User{email: "names@example.com", password_hash: "unused"})

    definitions = [
      %{"id" => "basil", "speciesId" => "basil", "cultivarId" => nil},
      %{"id" => "apple", "speciesId" => "apple", "cultivarId" => "fuji"},
      %{
        "id" => "custom",
        "speciesId" => "unknown",
        "cultivarId" => nil,
        "speciesOverride" => %{"name" => "Basil"}
      }
    ]

    instances =
      [
        {"basil", "Basil (Ocimum basilicum)"},
        {"basil", ""},
        {"apple", "stale label"},
        {"custom", ""},
        {"missing", ""},
        {"missing", "Legacy herb"},
        {"unknown", ""}
      ]
      |> Enum.with_index()
      |> Enum.map(fn {{plant_id, label}, index} ->
        %{
          "id" => "instance-#{index}",
          "plantId" => plant_id,
          "nameOrCultivar" => label,
          "x" => 0,
          "y" => 0,
          "width" => 1,
          "height" => 1
        }
      end)

    document =
      Gardens.default_document()
      |> Map.put("plants", definitions)
      |> Map.put("guilds", [
        %{
          "id" => "herbs",
          "name" => "Herbs",
          "path" => [],
          "mulchLevel" => 1,
          "plants" => instances
        }
      ])

    {:ok, garden} = Gardens.create_garden(owner, %{"name" => "Names", "document" => document})

    assert Admin.garden_names!(garden.id) == %{
             name: "Names",
             guilds: [
               %{
                 name: "Herbs",
                 plants: ["Basil", "Apple — Fuji", "Basil", "Legacy herb", "Unknown plant"]
               }
             ]
           }
  end
end
