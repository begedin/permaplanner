defmodule PermaplannerWeb.AuthControllerTest do
  use PermaplannerWeb.ConnCase, async: true

  alias Permaplanner.Accounts
  alias Permaplanner.Accounts.User

  @password "valid_password_12"

  test "register, confirm totp, and session", %{conn: conn} do
    conn =
      post(conn, "/api/auth/register", %{
        "email" => "user@example.com",
        "password" => @password
      })

    assert %{"totp" => %{"uri" => uri, "secret" => secret, "qrSvg" => qr_svg}} = json_response(conn, 201)
    assert uri =~ "otpauth://"
    assert secret != ""
    assert qr_svg =~ "<svg"

    user = Accounts.get_user_by_email("user@example.com")
  code = NimbleTOTP.verification_code(Base.decode32!(secret, padding: false))

    conn =
      build_conn()
      |> Plug.Test.init_test_session(%{})
      |> Plug.Conn.put_session("pending_user_id", user.id)
      |> post("/api/auth/register/totp", %{"code" => code})

    assert %{"user" => %{"email" => "user@example.com"}, "recoveryCodes" => codes} =
             json_response(conn, 200)

    assert length(codes) == 8

    session_conn = get(conn, "/api/auth/session")
    assert %{"user" => %{"email" => "user@example.com"}} = json_response(session_conn, 200)
  end

  test "register succeeds when session has stale pending user id", %{conn: conn} do
    stale_id = Ecto.UUID.generate()

    conn =
      conn
      |> Plug.Test.init_test_session(%{})
      |> Plug.Conn.put_session("pending_user_id", stale_id)
      |> post("/api/auth/register", %{
        "email" => "stale-session@example.com",
        "password" => @password
      })

    assert %{"totp" => %{"uri" => uri}} = json_response(conn, 201)
    assert uri =~ "otpauth://"
  end

  test "login requires totp", %{conn: conn} do
    {:ok, user} = Accounts.register_user(%{email: "login@example.com", password: @password})
    {:ok, user, _codes} = Accounts.confirm_totp_registration(user, totp_code_for(user))

    conn =
      post(conn, "/api/auth/login", %{
        "email" => "login@example.com",
        "password" => @password
      })

    response = json_response(conn, 200)
    assert %{"requiresTotp" => true} = response
    refute response["requiresTotpSetup"]

    conn =
      build_conn()
      |> Plug.Test.init_test_session(%{})
      |> Plug.Conn.put_session("pending_user_id", user.id)
      |> post("/api/auth/login/totp", %{"code" => totp_code_for(user)})

    assert %{"user" => %{"email" => "login@example.com"}} = json_response(conn, 200)
  end

  test "login returns totp setup when 2fa is not confirmed", %{conn: conn} do
    {:ok, user} = Accounts.register_user(%{email: "setup@example.com", password: @password})

    conn =
      post(conn, "/api/auth/login", %{
        "email" => "setup@example.com",
        "password" => @password
      })

    assert %{
             "requiresTotp" => true,
             "requiresTotpSetup" => true,
             "totp" => %{"uri" => uri, "secret" => secret, "qrSvg" => qr_svg}
           } = json_response(conn, 200)

    assert uri =~ "otpauth://"
    assert secret != ""
    assert qr_svg =~ "<svg"

    code = NimbleTOTP.verification_code(Base.decode32!(secret, padding: false))

    conn =
      build_conn()
      |> Plug.Test.init_test_session(%{})
      |> Plug.Conn.put_session("pending_user_id", user.id)
      |> post("/api/auth/login/totp", %{"code" => code})

    assert %{"user" => %{"email" => "setup@example.com", "totpConfirmed" => true}, "recoveryCodes" => codes} =
             json_response(conn, 200)

    assert length(codes) == 8
  end

  defp totp_code_for(%User{} = user) do
    {:ok, totp} = Accounts.totp_setup_for_user(user)
    NimbleTOTP.verification_code(Base.decode32!(totp.secret, padding: false))
  end
end
