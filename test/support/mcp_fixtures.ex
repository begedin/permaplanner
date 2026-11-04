defmodule Permaplanner.MCPFixtures do
  alias Permaplanner.{Accounts, Repo}
  alias Permaplanner.MCP.OAuth

  def user! do
    {:ok, user} =
      Accounts.register_user(%{
        email: "mcp-#{System.unique_integer([:positive])}@example.com",
        password: "valid_password_12"
      })

    user |> Ecto.Changeset.change(totp_confirmed_at: DateTime.utc_now()) |> Repo.update!()
  end

  def configure_oauth do
    previous = Application.get_env(:permaplanner, :mcp_clients)

    Application.put_env(
      :permaplanner,
      :mcp_clients,
      Permaplanner.MCP.Config.parse_clients!(%{
        "test-client" => %{
          "name" => "Garden assistant",
          "redirect_uris" => ["https://client.example/callback"]
        },
        "other-client" => %{
          "redirect_uris" => ["https://other.example/callback"],
          "client_secret" => String.duplicate("s", 32)
        }
      })
    )

    ExUnit.Callbacks.on_exit(fn ->
      if previous,
        do: Application.put_env(:permaplanner, :mcp_clients, previous),
        else: Application.delete_env(:permaplanner, :mcp_clients)
    end)
  end

  def authorization_params do
    verifier = String.duplicate("v", 43)

    %{
      "client_id" => "test-client",
      "redirect_uri" => "https://client.example/callback",
      "response_type" => "code",
      "resource" => OAuth.resource(),
      "scope" => "gardens:read",
      "code_challenge_method" => "S256",
      "code_challenge" => :crypto.hash(:sha256, verifier) |> Base.url_encode64(padding: false),
      "state" => "client-state"
    }
  end

  def code_params(user, overrides \\ %{}) do
    params = Map.merge(authorization_params(), overrides)
    {:ok, location} = OAuth.authorize(user, params)

    code =
      location |> URI.parse() |> Map.fetch!(:query) |> URI.decode_query() |> Map.fetch!("code")

    Map.merge(params, %{
      "grant_type" => "authorization_code",
      "code" => code,
      "code_verifier" => String.duplicate("v", 43)
    })
  end

  def refresh_params(token) do
    %{
      "grant_type" => "refresh_token",
      "client_id" => "test-client",
      "resource" => OAuth.resource(),
      "refresh_token" => token
    }
  end

  def tokens(user) do
    {:ok, tokens} = OAuth.exchange(code_params(user))
    tokens
  end
end
