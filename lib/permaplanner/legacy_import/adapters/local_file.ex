defmodule Permaplanner.LegacyImport.Adapters.LocalFile do
  @moduledoc false

  alias Permaplanner.Accounts.User
  alias Permaplanner.Gardens

  def import_document(%User{} = user, attrs) do
    Gardens.create_garden(user, %{
      "name" => attrs["name"] || "Imported garden",
      "document" => attrs["document"]
    })
  end
end
