defmodule PermaplannerWeb.ConnCase do
  use ExUnit.CaseTemplate

  using do
    quote do
      import Plug.Conn
      import Phoenix.ConnTest

      alias PermaplannerWeb.Router.Helpers, as: Routes

      @endpoint PermaplannerWeb.Endpoint
    end
  end

  setup tags do
    Permaplanner.DataCase.setup_sandbox(tags)
    {:ok, conn: Phoenix.ConnTest.build_conn()}
  end
end
