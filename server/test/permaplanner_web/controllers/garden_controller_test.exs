defmodule PermaplannerWeb.GardenControllerTest do
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

  test "lists and creates gardens", %{conn: conn} do
    conn = get(conn, "/api/gardens")
    assert %{"gardens" => []} = json_response(conn, 200)

    conn = post(conn, "/api/gardens", %{"name" => "Backyard"})
    assert %{"garden" => %{"name" => "Backyard", "document" => document}} = json_response(conn, 201)
    assert document["version"] == 5
  end

  test "updates garden with conflict on stale revision", %{conn: conn, user: user} do
    {:ok, garden} = Gardens.create_garden(user, %{"name" => "Plot"})
    stale_doc = Map.put(garden.document, "syncRevision", 0)
    {:ok, garden} = Gardens.update_garden(user, garden.id, %{"document" => Map.put(garden.document, "syncRevision", 0)})

    conn =
      put(conn, "/api/gardens/#{garden.id}", %{
        "document" => stale_doc
      })

    assert %{"error" => "stale_revision"} = json_response(conn, 409)
  end

  test "increments sync revision on update", %{conn: conn, user: user} do
    {:ok, garden} = Gardens.create_garden(user, %{"name" => "Plot"})
    doc = Map.put(garden.document, "syncRevision", 0)

    conn =
      put(conn, "/api/gardens/#{garden.id}", %{
        "document" => doc,
        "syncRevision" => 0
      })

    assert %{"syncRevision" => 1} = json_response(conn, 200)
  end

  defp registered_user! do
    {:ok, user} = Accounts.register_user(%{email: "garden@example.com", password: "valid_password_12"})
    {:ok, totp} = Accounts.totp_setup_for_user(user)
    code = NimbleTOTP.verification_code(Base.decode32!(totp.secret, padding: false))
    {:ok, user, _} = Accounts.confirm_totp_registration(user, code)
    user
  end
end
