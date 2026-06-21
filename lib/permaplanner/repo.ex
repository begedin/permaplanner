defmodule Permaplanner.Repo do
  use Ecto.Repo,
    otp_app: :permaplanner,
    adapter: Ecto.Adapters.Postgres
end
