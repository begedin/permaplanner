<script setup lang="ts">
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';

  import TotpQrCode from './TotpQrCode.vue';
  import { useAuthStore } from './stores/useAuthStore';
  import { routeNames } from './router';

  const auth = useAuthStore();
  const router = useRouter();

  const email = ref('');
  const password = ref('');
  const totpCode = ref('');
  const totpUri = ref('');
  const totpSecret = ref('');
  const totpQrSvg = ref('');
  const recoveryCodes = ref<string[]>([]);
  const error = ref<string | undefined>();
  const step = ref<'credentials' | 'totp' | 'recovery'>('credentials');

  const submitCredentials = async () => {
    error.value = undefined;
    try {
      const totp = await auth.register(email.value, password.value);
      totpUri.value = totp.uri;
      totpSecret.value = totp.secret;
      totpQrSvg.value = totp.qrSvg;
      step.value = 'totp';
    } catch {
      error.value = 'Could not create account. Check your email and password.';
    }
  };

  const submitTotp = async () => {
    error.value = undefined;
    try {
      recoveryCodes.value = await auth.confirmRegisterTotp(totpCode.value);
      step.value = 'recovery';
    } catch {
      error.value = 'Invalid authentication code.';
    }
  };

  const finish = async () => {
    await router.replace({ name: routeNames.import });
  };
</script>

<template>
  <div class="min-h-full flex items-center justify-center p-6 bg-parchment-100">
    <div class="w-full max-w-md rounded-2xl border border-parchment-300/55 paper-surface shadow-parchment-lg p-8">
      <h1 class="text-xl font-semibold text-ink-800">Create account</h1>

      <form
        v-if="step === 'credentials'"
        class="mt-6 space-y-4"
        @submit.prevent="submitCredentials"
      >
        <label class="block text-sm text-ink-700">
          Email
          <input
            v-model="email"
            type="email"
            required
            class="mt-1 w-full rounded-lg border border-parchment-300 px-3 py-2"
          />
        </label>
        <label class="block text-sm text-ink-700">
          Password
          <input
            v-model="password"
            type="password"
            required
            minlength="12"
            class="mt-1 w-full rounded-lg border border-parchment-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          class="w-full btn-soft-primary py-2.5 font-medium"
        >
          Continue
        </button>
      </form>

      <div
        v-else-if="step === 'totp'"
        class="mt-6 space-y-4"
      >
        <p class="text-sm text-ink-600">
          Scan this QR code in your authenticator app, or enter the secret manually.
        </p>
        <TotpQrCode
          v-if="totpQrSvg"
          :svg="totpQrSvg"
        />
        <details class="text-sm text-ink-600">
          <summary class="cursor-pointer text-ink-700">Can't scan the code?</summary>
          <p class="mt-2 text-xs font-mono break-all bg-parchment-50 p-2 rounded">
            {{ totpSecret }}
          </p>
          <a
            :href="totpUri"
            class="mt-2 inline-block text-sm underline text-ink-700"
          >
            Open in authenticator
          </a>
        </details>
        <form @submit.prevent="submitTotp">
          <label class="block text-sm text-ink-700">
            Confirm with a code
            <input
              v-model="totpCode"
              type="text"
              inputmode="numeric"
              required
              class="mt-1 w-full rounded-lg border border-parchment-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            class="mt-4 w-full btn-soft-primary py-2.5 font-medium"
          >
            Verify 2FA
          </button>
        </form>
      </div>

      <div
        v-else
        class="mt-6 space-y-4"
      >
        <p class="text-sm text-ink-700 font-medium">Save these recovery codes</p>
        <ul class="text-sm font-mono bg-parchment-50 p-3 rounded space-y-1">
          <li
            v-for="code in recoveryCodes"
            :key="code"
          >
            {{ code }}
          </li>
        </ul>
        <button
          type="button"
          class="w-full btn-soft-primary py-2.5 font-medium"
          @click="finish"
        >
          Continue to import
        </button>
      </div>

      <p
        v-if="error"
        class="mt-4 text-sm text-red-700"
        role="alert"
      >
        {{ error }}
      </p>

      <p class="mt-6 text-center text-sm text-ink-600">
        <RouterLink
          :to="{ name: routeNames.login }"
          class="underline"
        >
          Sign in
        </RouterLink>
      </p>
    </div>
  </div>
</template>
