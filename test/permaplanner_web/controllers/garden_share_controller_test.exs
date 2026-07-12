defmodule PermaplannerWeb.GardenShareControllerTest do
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

    {:ok, garden} =
      Gardens.create_garden(user, %{
        "name" => "Backyard",
        "document" =>
          Map.merge(Gardens.default_document(), %{
            "guilds" => [
              %{
                "id" => "g1",
                "name" => "Edge guild",
                "mulchLevel" => 3,
                "note" => "North bed",
                "plants" => [%{"name" => "Thai Basil", "growthPhase" => "young", "vigor" => 4}]
              }
            ]
          })
      })

    %{conn: conn, user: user, garden: garden}
  end

  test "creates a share and serves it publicly from the garden document", %{
    conn: conn,
    garden: garden
  } do
    assert %{"share" => %{"id" => share_id, "url" => url, "createdAt" => _}} =
             conn |> post("/api/gardens/#{garden.id}/shares") |> json_response(201)

    assert url =~ "/share/#{share_id}"

    html = build_conn() |> get("/share/#{share_id}") |> html_response(200)
    assert html =~ "Edge guild"
    assert html =~ "Thai Basil"
    assert html =~ "Garden: Backyard"

    assert %{
             "gardenName" => "Backyard",
             "guilds" => [
               %{
                 "id" => "g1",
                 "name" => "Edge guild",
                 "mulchLevel" => 3,
                 "note" => "North bed",
                 "plants" => [%{"name" => "Thai Basil", "growthPhase" => "young", "vigor" => 4}]
               }
             ],
             "summary" => summary
           } =
             build_conn() |> get("/share/#{share_id}.json") |> json_response(200)

    assert summary =~ "Edge guild"
    assert summary =~ "Thai Basil"
  end

  test "share page reflects the current garden document", %{
    conn: conn,
    user: user,
    garden: garden
  } do
    assert %{"share" => %{"id" => share_id}} =
             conn |> post("/api/gardens/#{garden.id}/shares") |> json_response(201)

    updated_document =
      Map.put(garden.document, "guilds", [
        %{
          "id" => "g2",
          "name" => "Updated guild",
          "mulchLevel" => 2,
          "note" => "Changed",
          "plants" => [%{"name" => "Mint", "growthPhase" => "established", "vigor" => 5}]
        }
      ])

    {:ok, _garden} = Gardens.update_garden(user, garden.id, %{"document" => updated_document})

    html = build_conn() |> get("/share/#{share_id}") |> html_response(200)
    assert html =~ "Updated guild"
    assert html =~ "Mint"
    refute html =~ "Edge guild"

    assert %{"gardenName" => "Backyard", "guilds" => guilds, "summary" => summary} =
             build_conn() |> get("/share/#{share_id}.json") |> json_response(200)

    assert guilds == [
             %{
               "id" => "g2",
               "name" => "Updated guild",
               "mulchLevel" => 2,
               "note" => "Changed",
               "plants" => [%{"name" => "Mint", "growthPhase" => "established", "vigor" => 5}]
             }
           ]

    assert summary =~ "Updated guild"
    assert summary =~ "Mint"
    refute summary =~ "Edge guild"
  end

  test "lists and revokes shares for a garden", %{conn: auth_conn, garden: garden} do
    assert %{"share" => %{"id" => share_id}} =
             auth_conn |> post("/api/gardens/#{garden.id}/shares") |> json_response(201)

    assert %{"shares" => [%{"id" => ^share_id, "url" => url, "createdAt" => _}]} =
             auth_conn |> get("/api/gardens/#{garden.id}/shares") |> json_response(200)

    assert url =~ "/share/#{share_id}"

    assert delete(auth_conn, "/api/gardens/#{garden.id}/shares/#{share_id}") |> response(204) ==
             ""

    assert build_conn() |> get("/share/#{share_id}") |> response(404) == "Not Found"

    assert %{"error" => "not_found"} =
             build_conn() |> get("/share/#{share_id}.json") |> json_response(404)

    assert %{"shares" => []} =
             auth_conn |> get("/api/gardens/#{garden.id}/shares") |> json_response(200)
  end

  test "revoking another user's share returns not found", %{conn: conn, garden: garden} do
    assert %{"share" => %{"id" => share_id}} =
             conn |> post("/api/gardens/#{garden.id}/shares") |> json_response(201)

    other = registered_user!("other@example.com")
    other_token = Accounts.generate_user_session_token(other)

    other_conn =
      build_conn()
      |> Phoenix.ConnTest.init_test_session(%{})
      |> Plug.Conn.put_session("user_token", other_token)

    assert %{"error" => "not_found"} =
             other_conn
             |> delete("/api/gardens/#{garden.id}/shares/#{share_id}")
             |> json_response(404)
  end

  test "returns 404 for unknown share" do
    unknown_id = Ecto.UUID.generate()

    assert build_conn() |> get("/share/#{unknown_id}") |> response(404) == "Not Found"

    assert %{"error" => "not_found"} =
             build_conn() |> get("/share/#{unknown_id}.json") |> json_response(404)
  end

  test "returns 404 for unsupported share format" do
    share_id = Ecto.UUID.generate()

    assert build_conn() |> get("/share/#{share_id}.xml") |> response(404) == "Not Found"
  end

  defp registered_user!(email \\ "share@example.com") do
    {:ok, user} = Accounts.register_user(%{email: email, password: "valid_password_12"})
    {:ok, totp} = Accounts.totp_setup_for_user(user)
    code = NimbleTOTP.verification_code(Base.decode32!(totp.secret, padding: false))
    {:ok, user, _} = Accounts.confirm_totp_registration(user, code)
    user
  end
end
