defmodule PermaplannerWeb.AdminLiveTest do
  use PermaplannerWeb.ConnCase, async: false
  import Phoenix.LiveViewTest
  alias Permaplanner.{Accounts, Admin, Gardens, Repo}
  alias Permaplanner.Accounts.User

  setup %{conn: conn} do
    previous = Application.get_env(:permaplanner, :admin_user_ids)

    on_exit(fn ->
      if previous,
        do: Application.put_env(:permaplanner, :admin_user_ids, previous),
        else: Application.delete_env(:permaplanner, :admin_user_ids)
    end)

    user =
      Repo.insert!(%User{
        password_hash: "unused-test-hash",
        email: "admin@example.com",
        totp_confirmed_at: DateTime.utc_now()
      })

    token = Accounts.generate_user_session_token(user)
    Application.put_env(:permaplanner, :admin_user_ids, [user.id])
    %{conn: init_test_session(conn, %{"user_token" => token}), user: user, token: token}
  end

  test "denies anonymous, ordinary, pending and unconfirmed users", %{conn: conn, user: user} do
    anonymous_conn = get(build_conn(), "/admin")
    assert response(anonymous_conn, 404) == "Not Found"
    assert get_resp_header(anonymous_conn, "location") == []

    assert response(
             get(init_test_session(build_conn(), %{"pending_user_id" => user.id}), "/admin"),
             404
           )

    Application.put_env(:permaplanner, :admin_user_ids, [])
    assert response(get(conn, "/admin"), 404)
    Application.put_env(:permaplanner, :admin_user_ids, [user.id])
    user |> Ecto.Changeset.change(totp_confirmed_at: nil) |> Repo.update!()
    assert response(get(conn, "/admin"), 404)
  end

  test "shows existing inventory, searches across owners, and does not expose private documents",
       %{conn: conn, user: user} do
    other = Repo.insert!(%User{password_hash: "unused-test-hash", email: "gardener@example.com"})

    {:ok, _} =
      Gardens.create_garden(other, %{
        "name" => "Orchard",
        "document" => Map.put(Gardens.default_document(), "private_note", "NEVER-EXPOSE-THIS")
      })

    assert Admin.overview() == %{users: 2, gardens: 1, without_gardens: 1}
    response_conn = get(conn, "/admin")
    assert get_resp_header(response_conn, "cache-control") == ["no-store"]
    assert html_response(response_conn, 200) =~ "Admin · Permaplanner"
    {:ok, view, html} = live(conn, "/admin")
    assert html =~ "Admin · Read only"
    assert html =~ user.email
    assert html =~ other.email
    view |> element(".tabs a", "Gardens") |> render_click()
    assert has_element?(view, "td", "Orchard")
    assert has_element?(view, "td", other.email)
    refute render(view) =~ "NEVER-EXPOSE-THIS"
    view |> form("#admin-search", q: "missing") |> render_change()
    assert has_element?(view, ".empty", "No gardens found")
    view |> form("#admin-search", q: "GARDENER") |> render_change()
    assert has_element?(view, "td", "Orchard")
    assert [%{name: "Orchard"} = row] = Admin.list("gardens", "", 1).rows
    refute Map.has_key?(row, :document)

    assert Enum.all?(
             Admin.list("users", "", 1).rows,
             &(Map.keys(&1) |> Enum.sort() == [:email, :garden_count, :id, :inserted_at])
           )
  end

  test "paginates with stable ordering and bounds invalid pages", %{conn: conn} do
    for number <- 1..26 do
      Repo.insert!(%User{password_hash: "unused-test-hash", email: "user#{number}@example.com"})
    end

    {:ok, view, _} = live(conn, "/admin?page=-1")
    assert has_element?(view, ".pagination", "Page 1 of 2")
    assert length(Admin.list("users", "", 1).rows) == 25
    view |> element(".pagination a", "Next") |> render_click()
    assert has_element?(view, ".pagination", "Page 2 of 2")
    assert length(Admin.list("users", "", 999).rows) == 2
    assert Admin.list("users", "%", 1).total == 0
  end

  test "rechecks authorization on connected mount", %{conn: conn, token: token} do
    conn = get(conn, "/admin")
    Accounts.delete_user_session_token(token)
    assert {:error, {:redirect, %{to: "/admin"}}} = live(conn)
  end

  test "revoked sessions cannot continue searching", %{conn: conn, token: token} do
    {:ok, view, _} = live(conn, "/admin")
    Accounts.delete_user_session_token(token)
    view |> form("#admin-search", q: "admin") |> render_change()
    assert_redirect(view, "/admin")
    assert response(get(conn, "/admin"), 404) == "Not Found"
  end

  test "removed admin access prevents live navigation", %{conn: conn} do
    {:ok, view, _} = live(conn, "/admin")
    Application.put_env(:permaplanner, :admin_user_ids, [])
    view |> element(".tabs a", "Gardens") |> render_click()
    assert_redirect(view, "/admin")
    assert response(get(conn, "/admin"), 404) == "Not Found"
  end

  test "garden details expose only guild and distinct plant names", %{conn: conn} do
    owner =
      Repo.insert!(%User{password_hash: "unused-test-hash", email: "private-owner@example.com"})

    plant = %{
      "id" => "instance",
      "plantId" => "basil",
      "nameOrCultivar" => "Thai basil",
      "x" => 9182,
      "y" => 0,
      "width" => 1,
      "height" => 1,
      "note" => "PRIVATE-PLANT-NOTE",
      "growthPhase" => "producing",
      "vigor" => 2
    }

    guild = %{
      "id" => "guild",
      "name" => "Kitchen herbs",
      "plants" => [plant, Map.put(plant, "id", "duplicate")],
      "path" => [],
      "mulchLevel" => 4,
      "note" => "PRIVATE-GUILD-NOTE"
    }

    document =
      Gardens.default_document()
      |> Map.put("guilds", [
        guild,
        %{guild | "id" => "empty", "name" => "New bed", "plants" => []}
      ])

    {:ok, garden} =
      Gardens.create_garden(owner, %{"name" => "Kitchen garden", "document" => document})

    assert Admin.garden_names!(garden.id) == %{
             name: "Kitchen garden",
             guilds: [
               %{name: "Kitchen herbs", plants: ["Thai basil"]},
               %{name: "New bed", plants: []}
             ]
           }

    {:ok, view, _} = live(conn, "/admin?tab=gardens")
    view |> element("td a", "Kitchen garden") |> render_click()
    assert has_element?(view, "h1", "Kitchen garden")
    assert has_element?(view, "h2", "Kitchen herbs")
    assert has_element?(view, "li", "Thai basil")
    assert has_element?(view, "p", "No plants in this guild.")
    refute has_element?(view, ".stats")
    refute has_element?(view, "table")

    initial_html = html_response(get(conn, "/admin?garden=#{garden.id}"), 200)

    for private <- ["PRIVATE-PLANT-NOTE", "PRIVATE-GUILD-NOTE", "9182", "producing", owner.email] do
      refute render(view) =~ private
      refute initial_html =~ private
    end

    view |> element("a", "Back to gardens") |> render_click()
    assert has_element?(view, "td a", "Kitchen garden")
  end

  test "garden detail handles empty gardens and rejects missing gardens and unauthorized access",
       %{conn: conn, user: user, token: token} do
    {:ok, garden} = Gardens.create_garden(user, %{"name" => "Empty garden"})
    url = "/admin?garden=#{garden.id}"
    {:ok, view, _} = live(conn, url)
    assert has_element?(view, "p", "No guilds in this garden.")

    for id <- [Ecto.UUID.generate(), "invalid"] do
      assert_error_sent 404, fn -> get(conn, "/admin?garden=#{id}") end
    end

    assert response(get(build_conn(), url), 404) == "Not Found"
    Application.put_env(:permaplanner, :admin_user_ids, [])
    assert response(get(conn, url), 404) == "Not Found"
    Application.put_env(:permaplanner, :admin_user_ids, [user.id])
    {:ok, inventory, _} = live(conn, "/admin?tab=gardens")
    Accounts.delete_user_session_token(token)
    inventory |> element("td a", "Empty garden") |> render_click()
    assert_redirect(inventory, "/admin")
  end

  test "serves the LiveView client and dashboard assets", %{conn: conn} do
    for {path, content_type} <- [
          {"/admin-assets/admin.css", "text/css"},
          {"/admin-assets/admin.js", "text/javascript"},
          {"/admin-assets/phoenix/phoenix.min.js", "text/javascript"},
          {"/admin-assets/live-view/phoenix_live_view.min.js", "text/javascript"}
        ] do
      response_conn = get(conn, path)
      assert response(response_conn, 200) != ""
      assert [type] = get_resp_header(response_conn, "content-type")
      assert type =~ content_type
    end
  end
end
