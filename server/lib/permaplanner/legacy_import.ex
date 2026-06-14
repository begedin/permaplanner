defmodule Permaplanner.LegacyImport do
  @moduledoc false

  alias Permaplanner.Accounts.User
  alias Permaplanner.LegacyImport.Adapters.LocalFile

  def import_local(%User{} = user, attrs) do
    LocalFile.import_document(user, attrs)
  end
end
