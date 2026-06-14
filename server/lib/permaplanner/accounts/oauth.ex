defmodule Permaplanner.Accounts.OAuth do
  @moduledoc """
  Glue for future GitHub login. Not implemented in v1.
  """

  @spec link_github_identity(term, term) :: {:error, :not_implemented}
  def link_github_identity(_user, _attrs), do: {:error, :not_implemented}

  @spec find_user_by_github_id(term) :: {:error, :not_implemented}
  def find_user_by_github_id(_github_id), do: {:error, :not_implemented}
end
