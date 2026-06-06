defmodule Permaplanner.MixProject do
  use Mix.Project

  def project do
    [
      app: :permaplanner,
      version: "0.18.0",
      elixir: "~> 1.15",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
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

  defp deps do
    [
      {:phoenix, "~> 1.7.18"},
      {:plug_cowboy, "~> 2.7"},
      {:jason, "~> 1.4"},
      {:req, "~> 0.5"},
      {:phoenix_live_reload, "~> 1.2", only: :dev},
      {:bypass, "~> 2.1", only: :test}
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
