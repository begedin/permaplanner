<script setup lang="ts">
  import { routeNames } from './router';
</script>

<template>
  <article
    class="mx-auto w-full max-w-2xl px-4 py-8 sm:py-10 text-ink-700"
    aria-labelledby="privacy-heading"
  >
    <header class="mb-8">
      <p class="text-sm text-ink-500">
        <RouterLink
          class="underline decoration-parchment-400 underline-offset-2 hover:text-ink-800"
          :to="{ name: routeNames.guilds }"
        >
          Back to Permaplanner
        </RouterLink>
      </p>
      <h1
        id="privacy-heading"
        class="mt-4 text-2xl font-semibold text-ink-900"
      >
        Privacy
      </h1>
      <p class="mt-2 text-sm text-ink-500">Last updated: 31 July 2026</p>
    </header>

    <div class="space-y-8 text-sm leading-relaxed">
      <section aria-labelledby="privacy-summary">
        <h2
          id="privacy-summary"
          class="text-base font-semibold text-ink-900"
        >
          Summary
        </h2>
        <p class="mt-2">
          Permaplanner is a garden planner. When you sign in, your garden plans (plants,
          guilds, map layout, notes, and background images) are stored on the hosted
          service so you can reopen them across devices. You can also download and import
          plan JSON files on your own device. The public app is at
          <strong>permaplanner.fly.dev</strong>.
        </p>
      </section>

      <section aria-labelledby="privacy-account">
        <h2
          id="privacy-account"
          class="text-base font-semibold text-ink-900"
        >
          Account data
        </h2>
        <p class="mt-2">
          If you create an account, we store your email address, password credentials
          (hashed), and authenticator (TOTP) setup needed to sign you in securely. Session
          cookies keep you signed in while you use the app.
        </p>
      </section>

      <section aria-labelledby="privacy-device">
        <h2
          id="privacy-device"
          class="text-base font-semibold text-ink-900"
        >
          Data on your device
        </h2>
        <p class="mt-2">When you use the app, your browser may store:</p>
        <ul class="mt-2 list-disc space-y-1 pl-5">
          <li>
            Your active garden id in local storage so the app can reopen the same garden
            after a reload.
          </li>
          <li>Onboarding progress in local storage.</li>
          <li>
            Plan JSON files you choose to download or import (these stay under your
            control on your device).
          </li>
        </ul>
      </section>

      <section aria-labelledby="privacy-hosted">
        <h2
          id="privacy-hosted"
          class="text-base font-semibold text-ink-900"
        >
          What the hosted service processes
        </h2>
        <p class="mt-2">When you use the public app, our infrastructure may process:</p>
        <ul class="mt-2 list-disc space-y-1 pl-5">
          <li>
            Static assets (HTML, JavaScript, CSS) served to your browser, including the
            plant catalog bundled with the app.
          </li>
          <li>
            Your garden plan documents when you are signed in (saved to our database so
            autosave and multi-device access work).
          </li>
          <li>
            Optional share links you create for a garden (a public read-only page for that
            plan until you revoke the link).
          </li>
          <li>
            Standard web server and proxy logs (for example IP address, request URL, user
            agent, and timestamps) for security and troubleshooting.
          </li>
        </ul>
        <p class="mt-2">
          We do not use advertising trackers, analytics cookies, or third-party marketing
          pixels in the app.
        </p>
      </section>

      <section aria-labelledby="privacy-hosting">
        <h2
          id="privacy-hosting"
          class="text-base font-semibold text-ink-900"
        >
          Hosting
        </h2>
        <p class="mt-2">
          The public instance is hosted on
          <a
            class="underline decoration-parchment-400 underline-offset-2 hover:text-ink-900"
            href="https://fly.io/legal/privacy-policy/"
            rel="noopener noreferrer"
            target="_blank"
          >
            Fly.io
          </a>
          with primary compute in Amsterdam (<code class="text-xs">ams</code> region).
          Fly.io acts as a hosting provider (processor) when delivering the app and may
          process the technical data described above. Plan documents are stored in the
          Fly-managed Postgres database attached to the app.
        </p>
      </section>

      <section aria-labelledby="privacy-legal-basis">
        <h2
          id="privacy-legal-basis"
          class="text-base font-semibold text-ink-900"
        >
          Legal basis (EEA / UK)
        </h2>
        <p class="mt-2">
          Where GDPR or UK GDPR applies, we rely on
          <strong>legitimate interests</strong> to operate and secure the hosted app
          (serving the app, storing signed-in garden data you create, and infrastructure
          logs), and on <strong>contract</strong> / steps needed to provide the account
          and save features you request when you register and use the service.
        </p>
      </section>

      <section aria-labelledby="privacy-rights">
        <h2
          id="privacy-rights"
          class="text-base font-semibold text-ink-900"
        >
          Your rights
        </h2>
        <p class="mt-2">
          For personal data and garden content we hold when you use a signed-in account,
          you may have rights to access, rectify, erase, restrict, or object, and to lodge
          a complaint with your supervisory authority. You can delete gardens from the app
          and download a JSON copy of a plan before deleting it.
        </p>
        <p class="mt-2">
          To exercise these rights or ask questions, contact us via
          <a
            class="underline decoration-parchment-400 underline-offset-2 hover:text-ink-900"
            href="https://github.com/begedin/permaplanner/issues"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub issues
          </a>
          on the project repository.
        </p>
      </section>

      <section aria-labelledby="privacy-retention">
        <h2
          id="privacy-retention"
          class="text-base font-semibold text-ink-900"
        >
          Retention
        </h2>
        <ul class="mt-2 list-disc space-y-1 pl-5">
          <li>
            Account and garden data: until you delete the garden or account, or ask us to
            erase it.
          </li>
          <li>
            Downloaded plan files on your device: under your control until you delete
            them.
          </li>
          <li>
            Server and proxy logs: retained only as long as needed for security and
            operations, per our hosting provider’s defaults.
          </li>
        </ul>
      </section>

      <section aria-labelledby="privacy-changes">
        <h2
          id="privacy-changes"
          class="text-base font-semibold text-ink-900"
        >
          Changes
        </h2>
        <p class="mt-2">
          We may update this page when the app or hosting changes. The “Last updated” date
          at the top reflects the latest revision.
        </p>
      </section>

      <section aria-labelledby="privacy-self-host">
        <h2
          id="privacy-self-host"
          class="text-base font-semibold text-ink-900"
        >
          Self-hosting
        </h2>
        <p class="mt-2">
          Permaplanner is open source. If you run your own copy, you (not the public
          Fly.io instance) are responsible for privacy practices on that deployment.
        </p>
      </section>
    </div>
  </article>
</template>
