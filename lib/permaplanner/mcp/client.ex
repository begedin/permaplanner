defmodule Permaplanner.MCP.Client do
  @moduledoc "A validated, explicitly registered OAuth client."
  @enforce_keys [:id, :name, :redirect_uris, :secret]
  defstruct [:id, :name, :redirect_uris, :secret]
end
