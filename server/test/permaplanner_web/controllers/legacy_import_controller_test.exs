defmodule PermaplannerWeb.LegacyImportControllerTest do
  use PermaplannerWeb.ConnCase, async: true

  alias Permaplanner.Accounts
  alias Permaplanner.Gardens

  setup %{conn: conn} do
    user = registered_user!()
    token = Accounts.generate_user_session_token(user)

    conn =
      conn
      |> Phoenix.ConnTest.init_test_session(%{})
      |> Plug.Conn.put_session("user_token", token)

    %{conn: conn, user: user}
  end

  test "imports valid v5 document", %{conn: conn} do
    document = Gardens.default_document()

    conn =
      post(conn, "/api/legacy-import/local", %{
        "document" => document,
        "name" => "Imported",
        "import_source" => "local"
      })

    assert %{"garden" => %{"name" => "Imported", "importSource" => "local"}} =
             json_response(conn, 201)
  end

  test "rejects old document version", %{conn: conn} do
    document = Map.put(Gardens.default_document(), "version", 4)

    conn = post(conn, "/api/legacy-import/local", %{"document" => document})

    assert %{"error" => "invalid_version"} = json_response(conn, 422)
  end

  defp registered_user! do
    {:ok, user} =
      Accounts.register_user(%{email: "import@example.com", password: "valid_password_12"})

    {:ok, totp} = Accounts.totp_setup_for_user(user)
    code = NimbleTOTP.verification_code(Base.decode32!(totp.secret, padding: false))
    {:ok, user, _} = Accounts.confirm_totp_registration(user, code)
    user
  end
end
