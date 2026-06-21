defmodule PermaplannerWeb.Plugs.SpaStatic do
  @moduledoc false

  import Plug.Conn

  @behaviour Plug

  @impl Plug
  def init(opts), do: opts

  @impl Plug
  def call(conn, _opts) do
    if conn.method not in ["GET", "HEAD"] do
      conn |> send_resp(405, "") |> halt()
    else
      serve(conn)
    end
  end

  defp serve(conn) do
    static_dir = static_dir()
    pathname = conn.request_path

    file_path =
      case resolve_under(static_dir, pathname) do
        {:ok, path} ->
          if File.regular?(path), do: path, else: Path.join(static_dir, "index.html")

        :forbidden ->
          nil

        :not_found ->
          Path.join(static_dir, "index.html")
      end

    if file_path && File.regular?(file_path) do
      conn
      |> put_resp_header("content-type", content_type(file_path))
      |> respond_file(conn.method, file_path)
      |> halt()
    else
      conn |> send_resp(404, "Not Found") |> halt()
    end
  end

  defp resolve_under(root, "/" <> rel) when rel != "", do: resolve_under(root, rel)
  defp resolve_under(root, ""), do: resolve_under(root, "index.html")
  defp resolve_under(root, "/"), do: resolve_under(root, "index.html")

  defp resolve_under(root, rel) do
    candidate = Path.expand(Path.join(root, rel))
    root_expanded = Path.expand(root)

    cond do
      not within_root?(root_expanded, candidate) ->
        :forbidden

      File.regular?(candidate) ->
        {:ok, candidate}

      true ->
        :not_found
    end
  end

  defp respond_file(conn, "HEAD", file_path) do
    size = File.stat!(file_path).size

    conn
    |> put_resp_header("content-length", Integer.to_string(size))
    |> send_resp(200, "")
  end

  defp respond_file(conn, _method, file_path), do: send_file(conn, 200, file_path)

  defp static_dir do
    case Application.get_env(:permaplanner, :static_dir) do
      nil -> Path.join(:code.priv_dir(:permaplanner), "static")
      dir -> dir
    end
  end

  defp within_root?(root, candidate) do
    candidate == root or String.starts_with?(candidate, root <> "/")
  end

  defp content_type(path) do
    cond do
      String.ends_with?(path, ".html") -> "text/html; charset=utf-8"
      String.ends_with?(path, ".js") -> "application/javascript; charset=utf-8"
      String.ends_with?(path, ".css") -> "text/css; charset=utf-8"
      String.ends_with?(path, ".json") -> "application/json; charset=utf-8"
      String.ends_with?(path, ".svg") -> "image/svg+xml"
      String.ends_with?(path, ".ico") -> "image/x-icon"
      String.ends_with?(path, ".woff2") -> "font/woff2"
      true -> "application/octet-stream"
    end
  end
end
