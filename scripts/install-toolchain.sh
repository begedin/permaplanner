#!/usr/bin/env bash
# Install Erlang/Elixir/Node versions from .tool-versions.
#
# On macOS, uses the erlef prebuilt Erlang plugin so installs download binaries
# instead of compiling from source (avoids kerl/openssl@1.1 build failures).
#
# Usage: ./scripts/install-toolchain.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ERLANG_PREBUILT_PLUGIN="https://github.com/michallepicki/asdf-erlang-prebuilt-macos.git"

ensure_erlang_prebuilt_plugin() {
  if [[ "${OSTYPE:-}" != darwin* ]]; then
    return
  fi

  local current_url
  current_url="$(asdf plugin list --urls 2>/dev/null | awk '/^erlang[[:space:]]/{print $2}')"

  if [[ "$current_url" == "$ERLANG_PREBUILT_PLUGIN" ]]; then
    return
  fi

  echo "Switching asdf erlang plugin to erlef prebuilt builds for macOS..."
  asdf plugin remove erlang 2>/dev/null || true
  asdf plugin add erlang "$ERLANG_PREBUILT_PLUGIN"
}

clean_failed_kerl_builds() {
  local version
  version="$(awk '/^erlang /{print $2}' .tool-versions)"
  local kerl_home="${KERL_HOME:-$HOME/.asdf/plugins/erlang/kerl-home}"

  rm -rf "${kerl_home}/builds/asdf_${version}" "${kerl_home}/installs/asdf_${version}" 2>/dev/null || true
}

ensure_erlang_prebuilt_plugin
clean_failed_kerl_builds

# Homebrew's ICU and OpenSSL are keg-only; PostgreSQL's configure step needs
# their pkg-config files, and the asdf plugin uses ICU's uconv executable.
if [[ "${OSTYPE:-}" == darwin* ]] && command -v brew >/dev/null 2>&1; then
  icu_prefix="$(brew --prefix icu4c)"
  openssl_prefix="$(brew --prefix openssl@3)"
  export PATH="${icu_prefix}/bin:${PATH}"
  export PKG_CONFIG_PATH="${icu_prefix}/lib/pkgconfig:${openssl_prefix}/lib/pkgconfig${PKG_CONFIG_PATH:+:${PKG_CONFIG_PATH}}"
  # Avoid mixing OpenSSL 3 headers with other installed OpenSSL libraries.
  export POSTGRES_CONFIGURE_OPTIONS="${POSTGRES_CONFIGURE_OPTIONS:---with-uuid=e2fs --with-openssl --with-zlib --with-includes=${openssl_prefix}/include --with-libraries=${openssl_prefix}/lib}"
fi

asdf install

if [[ -f mix.exs ]]; then
  echo "Bootstrapping Hex/Rebar..."
  mix local.hex --force && mix local.rebar --force
fi

echo
echo "Toolchain ready:"
asdf current erlang elixir nodejs
