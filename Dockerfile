# syntax = docker/dockerfile:1

ARG NODE_VERSION=22.2.0
ARG ELIXIR_IMAGE=elixir:1.18-otp-27

FROM node:${NODE_VERSION}-slim AS frontend

WORKDIR /app

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

COPY --link package-lock.json package.json ./
RUN npm ci --include=dev

COPY --link . .

ARG VITE_GITHUB_CLIENT_ID
ENV VITE_GITHUB_CLIENT_ID=$VITE_GITHUB_CLIENT_ID

RUN npm run build

FROM ${ELIXIR_IMAGE} AS build

WORKDIR /app/server

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git && \
    mix local.hex --force && \
    mix local.rebar --force

ENV MIX_ENV=prod

COPY server/mix.exs server/mix.lock ./
RUN mix deps.get --only prod

COPY server/config ./config
COPY server/lib ./lib
COPY --from=frontend /app/dist ./priv/static

RUN mix release

FROM debian:bookworm-slim AS final

WORKDIR /app

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y libstdc++6 openssl libncurses6 locales ca-certificates && \
    apt-get clean && \
    rm -f /var/lib/apt/lists/*/*

ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8
ENV MIX_ENV=prod
ENV PORT=8080

COPY --from=build /app/server/_build/prod/rel/permaplanner ./

RUN chown -R nobody:root /app && \
    chmod -R ug+rwx /app

USER nobody

EXPOSE 8080

CMD ["bin/permaplanner", "start"]
