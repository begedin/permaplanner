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

  test "rejects non-GET methods" do
    conn =
      build_conn()
      |> put_req_header("content-type", "text/plain")
      |> put("/app.js", "nope")

    assert conn.status == 405
  end
end
