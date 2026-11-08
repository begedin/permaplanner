defmodule PermaplannerWeb.ErrorJSON do
  @moduledoc false

  def render("400.json", _assigns), do: %{errors: %{detail: "Bad Request"}}
  def render("403.json", _assigns), do: %{errors: %{detail: "Forbidden"}}

  def render("404.json", _assigns), do: %{errors: %{detail: "Not Found"}}
  def render("413.json", _assigns), do: %{errors: %{detail: "Request Too Large"}}
  def render("500.json", _assigns), do: %{errors: %{detail: "Internal Server Error"}}
end
