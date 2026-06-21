defmodule PermaplannerWeb.GithubOAuthControllerTest do
  use PermaplannerWeb.ConnCase, async: false

  setup do
    bypass = Bypass.open()
    original = Application.get_env(:permaplanner, :github_token_url)

    Application.put_env(
      :permaplanner,
      :github_token_url,
      "http://localhost:#{bypass.port}/login/oauth/access_token"
    )

    on_exit(fn ->
      case original do
        nil -> Application.delete_env(:permaplanner, :github_token_url)
        value -> Application.put_env(:permaplanner, :github_token_url, value)
      end
    end)

    System.put_env("GITHUB_CLIENT_SECRET", "test-secret")
    on_exit(fn -> System.delete_env("GITHUB_CLIENT_SECRET") end)

    {:ok, bypass: bypass}
  end

  test "forwards token exchange to GitHub with client_secret", %{conn: conn, bypass: bypass} do
    Bypass.expect_once(bypass, "POST", "/login/oauth/access_token", fn conn ->
      assert conn.query_string == ""

      {:ok, body, _} = Plug.Conn.read_body(conn)
      params = URI.decode_query(body)

      assert params == %{
               "client_id" => "cid",
               "code" => "abc",
               "redirect_uri" => "http://localhost/guilds",
               "code_verifier" => "verifier",
               "client_secret" => "test-secret"
             }

      conn
      |> Plug.Conn.put_resp_header("content-type", "application/json; charset=utf-8")
      |> Plug.Conn.resp(200, ~s({"access_token":"tok","token_type":"bearer"}))
    end)

    conn =
      post(conn, "/api/github/oauth/access_token", %{
        "client_id" => "cid",
        "code" => "abc",
        "redirect_uri" => "http://localhost/guilds",
        "code_verifier" => "verifier"
      })

    assert json_response(conn, 200) == %{
             "access_token" => "tok",
             "token_type" => "bearer"
           }

    assert get_resp_header(conn, "content-type") == ["application/json; charset=utf-8"]
  end
end
