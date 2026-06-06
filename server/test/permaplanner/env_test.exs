defmodule Permaplanner.EnvTest do
  use ExUnit.Case, async: true

  alias Permaplanner.Env

  test "strip_quotes removes wrapping quotes" do
    assert Env.strip_quotes(~s("secret")) == "secret"
    assert Env.strip_quotes(~s('secret')) == "secret"
    assert Env.strip_quotes("  \"secret\"  ") == "secret"
  end

  test "strip_quotes returns nil for blank values" do
    assert Env.strip_quotes(nil) == nil
    assert Env.strip_quotes("") == nil
    assert Env.strip_quotes("   ") == nil
  end
end
