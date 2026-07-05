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
      <p class="mt-2 text-sm text-ink-500">Last updated: 31 May 2026</p>
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
          Permaplanner is a local-first garden planner. Your plan content (plants, guilds,
          map layout, notes, and background images) is stored on your device and, if you
          choose GitHub sync, in your private GitHub repository. The hosted app at
          <strong>permaplanner.fly.dev</strong> does not store your garden plans on our
          servers.
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
            If you use GitHub sync: your chosen repo name, sync metadata, and a GitHub
            access token in session storage (cleared when you disconnect or close the
            browser session, depending on your browser).
          </li>
        </ul>
        <p class="mt-2">
          This data stays under your control on your device. We do not receive it when you
          save locally.
        </p>
      </section>

      <section aria-labelledby="privacy-github">
        <h2
          id="privacy-github"
          class="text-base font-semibold text-ink-900"
        >
          GitHub sync (optional)
        </h2>
        <p class="mt-2">
          If you connect GitHub, the app talks directly to GitHub’s API from your browser
          to read and write plan files in a private repository on your account. GitHub
          processes that data under
          <a
            class="underline decoration-parchment-400 underline-offset-2 hover:text-ink-900"
            href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub’s privacy statement
          </a>
          . We do not copy your synced plans onto our servers.
        </p>
        <p class="mt-2">
          Signing in uses GitHub OAuth. Our server forwards the authorization exchange to
          GitHub and returns an access token to your browser. We do not persist that token
          on our servers.
        </p>
      </section>

      <section aria-labelledby="privacy-hosted">
        <h2
          id="privacy-hosted"
          class="text-base font-semibold text-ink-900"
        >
          What the hosted service processes
        </h2>
        <p class="mt-2">
          When you load the public app, our infrastructure may process a small amount of
          technical data needed to deliver the site:
        </p>
        <ul class="mt-2 list-disc space-y-1 pl-5">
          <li>
            Static assets (HTML, JavaScript, CSS) served to your browser, including the
            plant catalog bundled with the app.
          </li>
          <li>
            Standard web server and proxy logs (for example IP address, request URL, user
            agent, and timestamps) for security and troubleshooting.
          </li>
          <li>
            Transient OAuth token exchange requests when you connect GitHub (authorization
            code forwarded to GitHub; token returned to your browser, not stored by us).
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
          process the technical data described above.
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
          (serving static files, OAuth proxy, and infrastructure logs). If you use GitHub
          sync, your relationship with GitHub for stored plan data is separate from this
          hosted app.
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
          Because we do not hold your garden plans on our servers, most plan data is
          already under your control (local file or your GitHub repo). For personal data
          processed when you use the hosted site (such as access logs), you may have
          rights to access, rectify, erase, restrict, or object, and to lodge a complaint
          with your supervisory authority.
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
          <li>Plan content: retained on your device or GitHub until you delete it.</li>
          <li>
            OAuth tokens in your browser: until you disconnect GitHub or clear site data.
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
