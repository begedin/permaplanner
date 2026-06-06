defmodule PermaplannerWeb.GithubOAuthController do
  use PermaplannerWeb, :controller

  def create(conn, _params) do
    params =
      conn.body_params
      |> Map.new(fn {k, v} -> {to_string(k), to_string(v)} end)
      |> maybe_put_client_secret()

    github_body = URI.encode_query(params)

    case Req.post(github_token_url(),
           body: github_body,
           headers: [
             {"accept", "application/json"},
             {"content-type", "application/x-www-form-urlencoded"}
           ]
         ) do
      {:ok, %{status: status, body: body, headers: headers}} ->
        conn
        |> put_resp_header("content-type", response_content_type(headers))
        |> send_resp(status, encode_body(body))

      {:error, exception} ->
        conn
        |> put_status(:bad_gateway)
        |> json(%{
          error: "oauth_token_proxy_failed",
          error_description: Exception.message(exception)
        })
    end
  end

  defp github_token_url do
    Application.get_env(
      :permaplanner,
      :github_token_url,
      "https://github.com/login/oauth/access_token"
    )
  end

  defp maybe_put_client_secret(params) do
    case Permaplanner.Env.strip_quotes(System.get_env("GITHUB_CLIENT_SECRET")) do
      nil -> params
      secret -> Map.put(params, "client_secret", secret)
    end
  end

  defp response_content_type(headers) do
    headers
    |> Enum.find_value(fn
      {"content-type", value} -> normalize_header_value(value)
      {"Content-Type", value} -> normalize_header_value(value)
      _ -> nil
    end)
    |> case do
      nil -> "application/json; charset=utf-8"
      value -> value
    end
  end

  defp normalize_header_value(value) when is_binary(value), do: value
  defp normalize_header_value([value | _]), do: normalize_header_value(value)
  defp normalize_header_value(_), do: "application/json; charset=utf-8"

  defp encode_body(body) when is_binary(body), do: body
  defp encode_body(body), do: Jason.encode!(body)
end
