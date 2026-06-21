defmodule Permaplanner.LegacyImport.Adapters.Github do
  @moduledoc """
  GitHub legacy import runs on the client in v1. Server accepts merged documents via LocalFile.
  """

  @spec import_from_github(term) :: {:error, :not_implemented}
  def import_from_github(_attrs), do: {:error, :not_implemented}
end
