defmodule PermaplannerWeb.Plugs.SpaStaticTest do
  use PermaplannerWeb.ConnCase, async: true

  test "serves static files and falls back to index.html", %{conn: conn} do
    conn = get(conn, "/app.js")
    assert conn.status == 200
    assert conn.resp_body == "console.log('app');\n"
    assert get_resp_header(conn, "content-type") == ["application/javascript; charset=utf-8"]

    conn = build_conn() |> get("/missing-route")
    assert conn.status == 200
    assert conn.resp_body == "<!doctype html><title>Permaplanner</title>\n"
  end

  test "serves the home-screen icons at their declared sizes", %{conn: conn} do
    html = "index.html" |> File.read!() |> LazyHTML.from_document()

    [manifest_path] =
      html |> LazyHTML.query(~s(link[rel="manifest"])) |> LazyHTML.attribute("href")

    manifest = get(conn, manifest_path)
    assert get_resp_header(manifest, "content-type") == ["application/manifest+json"]
    assert %{"icons" => [_ | _] = icons} = json_response(manifest, 200)

    Enum.each(icons, fn %{"src" => path, "sizes" => size} ->
      assert_png(get(conn, path), size)
    end)

    apple_icon = LazyHTML.query(html, ~s(link[rel="apple-touch-icon"]))
    [path] = LazyHTML.attribute(apple_icon, "href")
    [size] = LazyHTML.attribute(apple_icon, "sizes")
    assert_png(get(conn, path), size)
  end

  test "rejects non-GET methods" do
    conn =
      build_conn()
      |> put_req_header("content-type", "text/plain")
      |> put("/app.js", "nope")

    assert conn.status == 405
  end

  defp assert_png(conn, size) do
    assert get_resp_header(conn, "content-type") == ["image/png"],
           "Expected a PNG at #{conn.request_path}"

    assert <<0x89, "PNG\r\n\x1A\n", 13::32, "IHDR", width::32, height::32, _::binary>> =
             response(conn, 200)

    assert "#{width}x#{height}" == size,
           "#{conn.request_path} is #{width}x#{height}, declared #{size}"
  end
end
