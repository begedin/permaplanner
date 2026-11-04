---
name: ship-it
description: >-
  Release the current permaplanner changes when the user asks to ship them:
  bump the version, update the changelog, commit, push, and deploy to Fly.
---

# Ship it

Invoking this skill authorizes the release workflow below, including commit, push,
and deployment. Follow any narrower instructions from the user.

1. **Bump the version.** Use a revision/patch bump for bugfixes or minor tweaks;
   use a minor bump otherwise. Use a major bump only when explicitly instructed.
   Keep `package.json`, `package-lock.json` (including its root package entry),
   and `mix.exs` aligned. Reuse an appropriate uncommitted release bump rather
   than bumping twice. Do not change the garden document format version for a release.
2. **Update `CHANGELOG.md`.** Move relevant `Unreleased` entries into the new
   version section, adding any missing user-visible changes. Follow the existing
   `[FIX]`, `[CHANGE]`, and `[DB]` conventions.
3. **Verify and commit.** Follow `AGENTS.md` and the applicable repo skills. Run
   the checks required by the changes; reuse successful checks from this session
   when the relevant code has not changed. Review and stage the intended release
   files, preserving unrelated work. Commit with a concise release message.
4. **Push.** Push the release commit to the current branch's configured upstream,
   unless the user specified another destination. Do not force-push. If the remote
   rejects the push, resolve the cause before proceeding to deployment.
5. **Deploy.** From the repo root, run `npm run deploy:fly`, which invokes
   `scripts/fly-deploy-op.sh` and uses `fly.toml`. This deploys the Vite frontend
   and Phoenix release; migrations run through Fly's configured `release_command`.
   Deploy the committed release, without unrelated local changes entering the build.
   Confirm deployment success and inspect `fly status -a permaplanner`.

Stop on a failed check, push, or deployment; diagnose it before retrying. If blocked
by missing credentials or access, report the blocker and the last completed step.
Do not report a successful release until deployment is verified.

Finish with the released version, commit, pushed branch, and deployment result.
