defmodule Permaplanner.Env do
  @moduledoc false

  @spec strip_quotes(String.t() | nil) :: String.t() | nil
  def strip_quotes(nil), do: nil

  def strip_quotes(value) do
    value
    |> String.trim()
    |> then(&Regex.replace(~r/^["']+|["']+$/u, &1, ""))
    |> case do
      "" -> nil
      trimmed -> trimmed
    end
  end
end
