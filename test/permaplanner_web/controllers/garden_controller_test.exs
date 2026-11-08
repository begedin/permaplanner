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

    assert %{"garden" => %{"name" => "Backyard", "document" => document}} =
             json_response(conn, 201)

    assert document["version"] == Garden.current_file_version()
    refute Map.has_key?(document, "guildLocations")
  end

  test "updates garden with conflict on stale revision", %{conn: conn, user: user} do
    {:ok, garden} = Gardens.create_garden(user, %{"name" => "Plot"})
    stale_doc = Map.put(garden.document, "syncRevision", 0)

    {:ok, garden} =
      Gardens.update_garden(user, garden.id, %{
        "document" => Map.put(garden.document, "syncRevision", 0)
      })

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

  test "round-trips merged guild content and geometry", %{conn: conn, user: user} do
    {:ok, garden} = Gardens.create_garden(user, %{"name" => "Plot"})

    document =
      Map.put(Gardens.default_document(), "guilds", [
        %{
          "id" => "g1",
          "name" => "Herbs",
          "mulchLevel" => 3,
          "note" => "North bed",
          "path" => [%{"x" => 10, "y" => 20}],
          "plants" => [
            %{
              "id" => "t1",
              "plantId" => "p1",
              "nameOrCultivar" => "Herb",
              "growthPhase" => "young",
              "vigor" => 4,
              "x" => 5,
              "y" => 6,
              "width" => 7,
              "height" => 8
            }
          ]
        }
      ])

    conn = put(conn, "/api/gardens/#{garden.id}", %{"document" => document, "syncRevision" => 0})
    assert %{"syncRevision" => 1} = json_response(conn, 200)
    conn = get(conn, "/api/gardens/#{garden.id}")
    assert %{"garden" => %{"document" => saved}} = json_response(conn, 200)
    assert saved == Map.put(document, "syncRevision", 1)
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

  test "saves a replacement background larger than the default request limit", %{
    conn: conn,
    user: user
  } do
    document = Map.put(Gardens.default_document(), "backgroundImage", @png_data_url)
    {:ok, garden} = Gardens.create_garden(user, %{"document" => document})
    bytes = :binary.copy(<<0>>, 6_000_000)
    image = "data:image/png;base64," <> Base.encode64(bytes)
    document = Map.put(garden.document, "backgroundImage", image)

    conn =
      conn
      |> put_req_header("content-type", "application/json")
      |> put("/api/gardens/#{garden.id}", Jason.encode!(%{"document" => document}))

    assert %{"syncRevision" => 1} = json_response(conn, 200)

    assert %GardenBackgroundImage{content_type: "image/png", data: ^bytes} =
             Repo.get!(GardenBackgroundImage, garden.id)

    conn = get(conn, "/api/gardens/#{garden.id}")
    assert %{"garden" => %{"document" => saved}} = json_response(conn, 200)
    assert saved["backgroundImage"] == image
  end

  test "streams a background upload and saves it atomically with the document", %{
    conn: conn,
    user: user
  } do
    {:ok, garden} = Gardens.create_garden(user, %{})
    bytes = :crypto.strong_rand_bytes(4_100_000)
    document = Map.put(garden.document, "backgroundOpacity", 0.7)
    boundary = "garden-upload-boundary"

    body =
      IO.iodata_to_binary([
        "--#{boundary}\r\nContent-Disposition: form-data; name=\"document\"\r\n\r\n",
        Jason.encode!(document),
        "\r\n--#{boundary}\r\nContent-Disposition: form-data; name=\"backgroundImage\"; filename=\"map.png\"\r\nContent-Type: image/png\r\n\r\n",
        bytes,
        "\r\n--#{boundary}--\r\n"
      ])

    saved_conn =
      conn
      |> put_req_header("content-type", "multipart/form-data; boundary=#{boundary}")
      |> put("/api/gardens/#{garden.id}", body)

    assert %{"syncRevision" => 1} = json_response(saved_conn, 200)

    assert %GardenBackgroundImage{content_type: "image/png", data: ^bytes} =
             Repo.get!(GardenBackgroundImage, garden.id)

    assert Repo.get!(Garden, garden.id).document == Map.put(document, "syncRevision", 1)

    stale_conn =
      conn
      |> put_req_header("content-type", "multipart/form-data; boundary=#{boundary}")
      |> put("/api/gardens/#{garden.id}", body)

    assert %{"error" => "stale_revision"} = json_response(stale_conn, 409)
    assert %GardenBackgroundImage{data: ^bytes} = Repo.get!(GardenBackgroundImage, garden.id)
  end

  test "rejects malformed multipart documents before reading the image", %{conn: conn, user: user} do
    {:ok, garden} = Gardens.create_garden(user, %{})

    conn =
      put(conn, "/api/gardens/#{garden.id}", %{
        "document" => "invalid JSON",
        "backgroundImage" => %Plug.Upload{
          path: "/missing-image",
          content_type: "image/png",
          filename: "map.png"
        }
      })

    assert %{"error" => "update_failed"} = json_response(conn, 422)
    assert Repo.get!(Garden, garden.id).sync_revision == 0
    refute Repo.get(GardenBackgroundImage, garden.id)
  end

  test "returns a JSON error when a save exceeds the request limit", %{conn: conn, user: user} do
    {:ok, garden} = Gardens.create_garden(user, %{})
    body = Jason.encode!(%{"document" => garden.document}) <> :binary.copy(" ", 16_000_000)

    {413, _headers, response} =
      assert_error_sent 413, fn ->
        conn
        |> put_req_header("content-type", "application/json")
        |> put("/api/gardens/#{garden.id}", body)
      end

    assert Jason.decode!(response) == %{"errors" => %{"detail" => "Request Too Large"}}
    assert Gardens.get_garden!(user, garden.id).document == garden.document
  end

  test "update without backgroundImage leaves stored background unchanged", %{
    conn: conn,
    user: user
  } do
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

  test "rejects invalid documents on every write path without changing stored data", %{
    conn: conn,
    user: user
  } do
    {:ok, garden} = Gardens.create_garden(user, %{})
    invalid = Map.put(garden.document, "mapScale", nil)

    assert conn |> post("/api/gardens", %{"document" => invalid}) |> json_response(422)

    assert conn
           |> put("/api/gardens/#{garden.id}", %{"document" => invalid})
           |> json_response(422)

    assert %{"error" => "invalid_document"} =
             conn
             |> post("/api/legacy-import/local", %{"document" => invalid})
             |> json_response(422)

    assert Gardens.get_garden!(user, garden.id).document == garden.document
    assert length(Gardens.list_gardens(user)) == 1
  end

  test "rejects future revisions and preserves the image on a rejected save", %{
    conn: conn,
    user: user
  } do
    document = Map.put(Gardens.default_document(), "backgroundImage", @png_data_url)
    {:ok, garden} = Gardens.create_garden(user, %{"document" => document})
    update = garden.document |> Map.put("backgroundImage", nil) |> Map.put("syncRevision", 10)

    assert %{"error" => "stale_revision"} =
             conn
             |> put("/api/gardens/#{garden.id}", %{"document" => update})
             |> json_response(409)

    assert Gardens.garden_json(Gardens.get_garden!(user, garden.id)).document == document
  end

  defp registered_user! do
    {:ok, user} =
      Accounts.register_user(%{email: "garden@example.com", password: "valid_password_12"})

    {:ok, totp} = Accounts.totp_setup_for_user(user)
    code = NimbleTOTP.verification_code(Base.decode32!(totp.secret, padding: false))
    {:ok, user, _} = Accounts.confirm_totp_registration(user, code)
    user
  end
end
