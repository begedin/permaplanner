defmodule PermaplannerWeb.OAuthControllerTest do
  use PermaplannerWeb.ConnCase, async: false
  import Ecto.Query
  import Permaplanner.MCPFixtures
  alias Permaplanner.{Accounts, Repo}
  alias Permaplanner.MCP.{Credential, Grant, OAuth}

  setup do
    configure_oauth()
    user = user!()

    conn =
      build_conn()
      |> init_test_session(%{"user_token" => Accounts.generate_user_session_token(user)})

    %{user: user, conn: conn}
  end

  test "publishes discovery metadata and requires sign-in and explicit consent", %{conn: conn} do
    assert %{
             "code_challenge_methods_supported" => ["S256"],
             "scopes_supported" => ["gardens:read"]
           } =
             build_conn() |> get("/.well-known/oauth-authorization-server") |> json_response(200)

    assert %{"resource" => resource} =
             build_conn()
             |> get("/.well-known/oauth-protected-resource/mcp")
             |> json_response(200)

    assert resource == OAuth.resource()

    assert build_conn() |> get("/oauth/authorize", authorization_params()) |> html_response(200) =~
             "Sign in"

    assert conn |> get("/oauth/authorize", authorization_params()) |> html_response(200) =~
             "Allow read access"

    assert Repo.aggregate(Grant, :count) == 0

    response =
      post(conn, "/oauth/authorize", Map.put(authorization_params(), "decision", "allow"))

    query = response |> redirected_to() |> URI.parse() |> Map.fetch!(:query) |> URI.decode_query()
    assert %{"code" => _, "state" => "client-state", "iss" => issuer} = query
    assert issuer == OAuth.base_url()
    assert Repo.aggregate(Grant, :count) == 1
  end

  test "rejects invalid authorization requests and returns denial to a validated callback", %{
    conn: conn
  } do
    for changes <- [
          %{"redirect_uri" => "https://evil.example"},
          %{"client_id" => "unknown"},
          %{"code_challenge_method" => "plain"},
          %{"scope" => "gardens:write"},
          %{"resource" => "https://other.example/mcp"}
        ] do
      assert conn
             |> get("/oauth/authorize", Map.merge(authorization_params(), changes))
             |> json_response(400)
    end

    denied =
      conn
      |> post("/oauth/authorize", Map.put(authorization_params(), "decision", "deny"))
      |> redirected_to()

    assert denied =~ "error=access_denied"
    assert Repo.aggregate(Grant, :count) == 0

    assert build_conn()
           |> post("/oauth/authorize", Map.put(authorization_params(), "decision", "allow"))
           |> json_response(401)
  end

  test "browser consent enforces CSRF", %{conn: conn} do
    page = get(conn, "/oauth/authorize", authorization_params())
    [_, csrf] = Regex.run(~r/name="_csrf_token" value="([^"]+)"/, html_response(page, 200))

    conn =
      page
      |> recycle()
      |> Plug.Conn.put_private(:plug_skip_csrf_protection, false)

    approved =
      post(
        conn,
        "/oauth/authorize",
        Map.merge(authorization_params(), %{"decision" => "allow", "_csrf_token" => csrf})
      )

    assert redirected_to(approved) =~ "code="

    assert_raise Plug.CSRFProtection.InvalidCSRFTokenError, fn ->
      post(conn, "/oauth/authorize", Map.put(authorization_params(), "decision", "allow"))
    end
  end

  test "exchanges a bound single-use code, rotates tokens and revokes access", %{user: user} do
    params = code_params(user)

    for changes <- [
          %{"code_verifier" => String.duplicate("x", 43)},
          %{"redirect_uri" => "https://evil.example"},
          %{"resource" => "https://other.example/mcp"},
          %{"client_id" => "other-client", "client_secret" => String.duplicate("s", 32)}
        ] do
      assert build_conn()
             |> post("/oauth/token", Map.merge(params, changes))
             |> json_response(400)
    end

    response = build_conn() |> post("/oauth/token", params)

    assert %{
             "access_token" => access,
             "refresh_token" => refresh,
             "scope" => "gardens:read",
             "expires_in" => 3600
           } = json_response(response, 200)

    assert get_resp_header(response, "cache-control") == ["no-store"]
    assert OAuth.user_for_token(access).id == user.id

    assert %{"error" => "invalid_grant"} =
             build_conn() |> post("/oauth/token", params) |> json_response(400)

    refresh_params = refresh_params(refresh)

    assert %{"access_token" => next_access, "refresh_token" => next_refresh} =
             build_conn() |> post("/oauth/token", refresh_params) |> json_response(200)

    refute OAuth.user_for_token(access)
    assert OAuth.user_for_token(next_access).id == user.id
    refute refresh == next_refresh

    assert %{"error" => "invalid_grant"} =
             build_conn() |> post("/oauth/token", refresh_params) |> json_response(400)

    refute OAuth.user_for_token(next_access)
    fresh = tokens(user)

    assert build_conn()
           |> post("/oauth/revoke", %{
             "client_id" => "test-client",
             "token" => fresh.refresh_token
           })
           |> response(200) == ""

    refute OAuth.user_for_token(fresh.access_token)
  end

  test "rejects expired codes, access tokens and refresh tokens", %{user: user} do
    params = code_params(user)
    past = DateTime.add(DateTime.utc_now(), -3600)
    Repo.update_all(from(c in Credential, where: c.kind == :code), set: [expires_at: past])
    assert {:error, "invalid_grant"} = OAuth.exchange(params)
    tokens = tokens(user)
    Repo.update_all(from(c in Credential, where: c.kind == :access), set: [expires_at: past])
    refute OAuth.user_for_token(tokens.access_token)
    Repo.update_all(Grant, set: [expires_at: past])

    assert {:error, "invalid_grant"} =
             OAuth.exchange(refresh_params(tokens.refresh_token))
  end

  test "confidential clients must authenticate and management revocation is user-scoped", %{
    user: user,
    conn: conn
  } do
    exchange =
      code_params(user, %{
        "client_id" => "other-client",
        "redirect_uri" => "https://other.example/callback"
      })

    assert %{"error" => "invalid_client"} =
             build_conn() |> post("/oauth/token", exchange) |> json_response(400)

    basic = Base.encode64("other-client:" <> String.duplicate("s", 32))

    assert %{"access_token" => access} =
             build_conn()
             |> put_req_header("authorization", "Basic " <> basic)
             |> post("/oauth/token", exchange)
             |> json_response(200)

    [grant] = OAuth.connections(user)
    other = user!()
    OAuth.revoke_connection(other, grant.id)
    assert OAuth.user_for_token(access)
    assert conn |> get("/oauth/connections") |> html_response(200) =~ "other-client"

    assert conn
           |> post("/oauth/connections/revoke", %{"connection_id" => grant.id})
           |> redirected_to() == "/oauth/connections"

    refute OAuth.user_for_token(access)
  end
end
