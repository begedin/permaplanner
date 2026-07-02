defmodule PermaplannerWeb.GardenControllerTest do
  use PermaplannerWeb.ConnCase, async: true

  alias Permaplanner.Accounts
  alias Permaplanner.Gardens
  alias Permaplanner.Gardens.Garden
  alias Permaplanner.Gardens.GardenBackgroundImage
  alias Permaplanner.Repo

  @png_data_url "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

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

  test "stores background image in a separate table", %{conn: conn, user: user} do
    document =
      Gardens.default_document()
      |> Map.put("backgroundImage", @png_data_url)

    {:ok, garden} = Gardens.create_garden(user, %{"name" => "With bg", "document" => document})

    stored = Repo.get!(Garden, garden.id)
    refute Map.has_key?(stored.document, "backgroundImage")

    background = Repo.get!(GardenBackgroundImage, garden.id)
    assert background.content_type == "image/png"
    assert byte_size(background.data) > 0

    conn = get(conn, "/api/gardens/#{garden.id}")
    assert %{"garden" => %{"document" => response_document}} = json_response(conn, 200)
    assert response_document["backgroundImage"] == @png_data_url
  end

  test "update without backgroundImage leaves stored background unchanged", %{conn: conn, user: user} do
    document =
      Gardens.default_document()
      |> Map.put("backgroundImage", @png_data_url)

    {:ok, garden} = Gardens.create_garden(user, %{"name" => "With bg", "document" => document})

    update_doc =
      garden.document
      |> Map.put("syncRevision", 0)
      |> Map.put("plants", [%{"id" => "p1", "speciesId" => "comfrey", "cultivarId" => nil}])

    conn =
      put(conn, "/api/gardens/#{garden.id}", %{
        "document" => update_doc,
        "syncRevision" => 0
      })

    assert %{"syncRevision" => 1} = json_response(conn, 200)
    assert Repo.get!(GardenBackgroundImage, garden.id)

    conn = get(conn, "/api/gardens/#{garden.id}")
    assert %{"garden" => %{"document" => response_document}} = json_response(conn, 200)
    assert response_document["backgroundImage"] == @png_data_url
  end

  test "update with null backgroundImage clears stored background", %{conn: conn, user: user} do
    document =
      Gardens.default_document()
      |> Map.put("backgroundImage", @png_data_url)

    {:ok, garden} = Gardens.create_garden(user, %{"name" => "With bg", "document" => document})

    update_doc =
      garden.document
      |> Map.put("syncRevision", 0)
      |> Map.put("backgroundImage", nil)

    conn =
      put(conn, "/api/gardens/#{garden.id}", %{
        "document" => update_doc,
        "syncRevision" => 0
      })

    assert %{"syncRevision" => 1} = json_response(conn, 200)
    refute Repo.get(GardenBackgroundImage, garden.id)

    conn = get(conn, "/api/gardens/#{garden.id}")
    assert %{"garden" => %{"document" => response_document}} = json_response(conn, 200)
    refute Map.has_key?(response_document, "backgroundImage")
  end

  defp registered_user! do
    {:ok, user} = Accounts.register_user(%{email: "garden@example.com", password: "valid_password_12"})
    {:ok, totp} = Accounts.totp_setup_for_user(user)
    code = NimbleTOTP.verification_code(Base.decode32!(totp.secret, padding: false))
    {:ok, user, _} = Accounts.confirm_totp_registration(user, code)
    user
  end
end
