defmodule Permaplanner.MixProject do
  use Mix.Project

  def project do
    [
      app: :permaplanner,
      version: "0.41.0",
      elixir: "~> 1.20",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps(),
      releases: releases()
    ]
  end

  def application do
    [
      mod: {Permaplanner.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  defp aliases do
    [
      setup: ["deps.get", "ecto.setup"],
      "ecto.setup": ["ecto.create", "ecto.migrate"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      test: ["ecto.create --quiet", "ecto.migrate --quiet", "test"]
    ]
  end

  defp deps do
    [
      {:phoenix, "~> 1.8.17"},
      {:phoenix_html, "~> 4.4"},
      {:phoenix_live_view, "~> 1.2"},
      {:phoenix_ecto, "~> 4.7"},
      {:ecto_sql, "~> 3.14"},
      {:postgrex, "~> 0.23.0"},
      {:plug_cowboy, "~> 2.9"},
      {:jason, "~> 1.4"},
      {:bcrypt_elixir, "~> 4.0"},
      {:nimble_totp, "~> 1.0"},
      {:eqrcode, "~> 0.3"},
      {:phoenix_live_reload, "~> 1.7", only: :dev},
      {:lazy_html, "~> 0.1.16", only: :test}
    ]
  end

  defp releases do
    [
      permaplanner: [
        include_executables: true,
        steps: [:assemble, :tar]
      ]
    ]
  end
end
