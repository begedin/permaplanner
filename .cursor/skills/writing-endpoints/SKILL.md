---
name: writing-endpoints
description: >-
  Adds and edits Phoenix JSON API endpoints and HTML responses in this repo:
  controllers, router, *_html modules, ErrorJSON, and ConnCase controller tests.
  Use when writing or changing server/lib/permaplanner_web/**/*_controller.ex,
  *_html.ex, *_json.ex, router.ex, or server/test/**/*_controller_test.exs.
---

# Writing endpoints (permaplanner server)

Phoenix JSON API lives under `server/lib/permaplanner_web/`. Keep controllers thin; business logic belongs in context modules under `server/lib/permaplanner/`.

## Params and JSON keys

HTTP/JSON params arrive with **string keys only**. Atom keys appear only when tests or internal code build maps by hand — do not defend against them in controllers or contexts called from controllers.

**Do:**

```elixir
def create(conn, %{"garden_id" => garden_id, "document" => document, "name" => name}) do
  guilds = document["guilds"]
  ...
end
```

**Don't:**

```elixir
name = Map.get(attrs, "name") || Map.get(attrs, :name)

case params["document"] do
  %{"guilds" => guilds} when is_list(guilds) -> guilds
  _ -> Map.get(garden.document, "guilds", [])
end
```

- Pattern-match required route/body fields in the **function head** when the endpoint always needs them.
- Pass `params` through to context modules when the whole body is consumed (`GardenController.create/2`).
- Context modules (`Permaplanner.Gardens`, import adapters, etc.) use string-key access (`attrs["document"]`), same as controllers.
- When calling context modules from non-HTTP code, build maps with **string keys** to match the HTTP contract.

## Controllers

- `use PermaplannerWeb, :controller`
- Resolve the current user from `conn.assigns.current_user` (set by `UserAuth` plugs).
- Authorize via context functions (`Gardens.get_garden!(user, id)`) — do not query by id alone.
- Return JSON with `json/2`; set status with `put_status/2` or `send_resp/3`.
- Use **camelCase** keys in JSON responses to match the TypeScript client (`createdAt`, `syncRevision`, `importSource`).
- Map domain errors to stable string error codes: `%{"error" => "not_found"}`, `%{"error" => "stale_revision"}`, etc.
- Non-JSON responses (HTML share pages, `204 No Content`) are fine when the route is not under the JSON API contract.

**Error status conventions (follow existing controllers):**

| Situation | Status | Body |
|-----------|--------|------|
| Missing/invalid request shape | `400` | `%{"error" => "invalid_request"}` |
| Auth failure | `401` | `%{"error" => "..."}` |
| Not found / wrong owner | `404` | `%{"error" => "not_found"}` |
| Conflict (stale revision) | `409` | `%{"error" => "stale_revision"}` |
| Validation / domain failure | `422` | `%{"error" => "..."}` |
| Success create | `201` | resource wrapper, e.g. `%{"share" => ...}` |
| Success delete | `204` | empty body |

For endpoints with a fixed required body (auth-style), add a **catch-all clause** that returns `400 invalid_request`:

```elixir
def register(conn, %{"email" => email, "password" => password}), do: ...

def register(conn, _params) do
  conn |> put_status(:bad_request) |> json(%{error: "invalid_request"})
end
```

Keep response shaping in private `*_json/…` helpers on the controller unless a dedicated `*_json.ex` module is warranted.

## HTML responses (`*_html.ex`)

Some routes return HTML (e.g. public `/share/:id`). Do **not** add `.heex` files or `embed_templates` directories under `server/`.

Put markup in a `PermaplannerWeb.*HTML` module using inline `~H"""` functions:

```elixir
defmodule PermaplannerWeb.GardenShareHTML do
  use PermaplannerWeb, :html

  def render(garden_name, guilds) do
    assigns = %{garden_name: garden_name, guild_count: ..., guild_content: ...}

    assigns
    |> show()
    |> Phoenix.HTML.Safe.to_iodata()
    |> IO.iodata_to_binary()
  end

  def show(assigns) do
    ~H"""
    <!doctype html>
  ...
    """
  end
end
```

- **Do:** `use PermaplannerWeb, :html`, template functions with `~H"""`, plain-text/data helpers as regular Elixir functions in the same module.
- **Don't:** `embed_templates "…/*"`, `*.html.heex` files, or separate template folders.
- Controllers call `SomeHTML.render(…)` and `send_resp(conn, 200, html)` — keep HTML assembly out of controllers.
- Test markup via `*_html_test.exs` (unit) and `html_response/2` in controller tests.

## Router (`router.ex`)

- JSON API routes: `scope "/api", PermaplannerWeb` with `pipe_through :api`.
- Pick the **narrowest auth pipeline** that fits:
  - `:api` only — public JSON (session check, register, login, OAuth proxy)
  - `[:api, :require_pending_user]` — mid-registration TOTP steps
  - `[:api, :require_authenticated, :require_totp_confirmed]` — gardens, shares, import
- Use `resources/2` for standard CRUD when paths match (`/gardens`).
- Use explicit routes for nested or non-REST actions (`/gardens/:garden_id/shares`).
- Public non-API routes (e.g. `/share/:id` HTML) live in a separate `scope "/"` without `:api`.
- SPA catch-all stays last with `pipe_through :spa`.

When adding a route, register **method, path, controller action, and pipeline** together; mirror the path the Vue client calls under `/api/…`.

## `*_json.ex` modules

`PermaplannerWeb.ErrorJSON` handles generic Phoenix error templates. Add clauses there only for new **template** names (e.g. `"422.json"`). Prefer controller `%{"error" => atom_string}` bodies for API errors instead of expanding ErrorJSON for each case.

## Controller tests

File: `server/test/permaplanner_web/controllers/<name>_controller_test.exs`

```elixir
defmodule PermaplannerWeb.GardenShareControllerTest do
  use PermaplannerWeb.ConnCase, async: true
  ...
end
```

**Setup for authenticated routes:**

1. Register a user and confirm TOTP (see existing `registered_user!/1` helpers in controller tests).
2. `Accounts.generate_user_session_token(user)`
3. `conn |> init_test_session(%{}) |> put_session("user_token", token)`

**Request bodies:** use string keys, matching what `apiFetch` + `JSON.stringify` send from the client.

**Assertions:** pattern-match `json_response(conn, status)`; use `response/2` for empty bodies; use `html_response/2` for HTML routes.

**Cover at least:**

- Happy path (status + response shape)
- Auth boundary (other user → `404` / `401` as appropriate)
- Missing resource (`404`)
- Domain error the controller maps explicitly (conflict, invalid version, etc.)

**Do not** wrap the entire file in one outer `describe` block.

## Checklist for a new endpoint

1. Context function(s) in `server/lib/permaplanner/` (if not already present)
2. Controller action(s) with string-key params and JSON/error mapping
3. Route in `router.ex` with correct pipeline
4. `server/test/permaplanner_web/controllers/<name>_controller_test.exs` (or extend existing)
5. TypeScript client under `src/api/` if the Vue app calls it
6. For HTML routes: `*_html.ex` with inline `~H"""` (no `.heex` files)
7. Run affected tests:

```bash
cd server && mix test test/permaplanner_web/controllers/<name>_controller_test.exs
```

Run the whole controller suite when touching shared auth or router plumbing:

```bash
cd server && mix test test/permaplanner_web/controllers/
```
