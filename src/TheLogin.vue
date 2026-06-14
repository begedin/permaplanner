<script setup lang="ts">
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';

  import { useAuthStore } from './stores/useAuthStore';
  import { routeNames } from './router';

  const auth = useAuthStore();
  const router = useRouter();

  const email = ref('');
  const password = ref('');
  const totpCode = ref('');
  const error = ref<string | undefined>();
  const step = ref<'credentials' | 'totp'>('credentials');

  const submitCredentials = async () => {
    error.value = undefined;
    try {
      await auth.login(email.value, password.value);
      step.value = 'totp';
    } catch {
      error.value = 'Invalid email or password.';
    }
  };

  const submitTotp = async () => {
    error.value = undefined;
    try {
      await auth.confirmLoginTotp(totpCode.value);
      await router.replace({ name: routeNames.guilds });
    } catch {
      error.value = 'Invalid authentication code.';
    }
  };
</script>

<template>
  <div class="min-h-full flex items-center justify-center p-6 bg-parchment-100">
    <div class="w-full max-w-md rounded-2xl border border-parchment-300/55 paper-surface shadow-parchment-lg p-8">
      <h1 class="text-xl font-semibold text-ink-800">Sign in</h1>

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

      <form
        v-else
        class="mt-6 space-y-4"
        @submit.prevent="submitTotp"
      >
        <p class="text-sm text-ink-600">Enter the code from your authenticator app.</p>
        <label class="block text-sm text-ink-700">
          Authentication code
          <input
            v-model="totpCode"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            required
            class="mt-1 w-full rounded-lg border border-parchment-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          class="w-full btn-soft-primary py-2.5 font-medium"
        >
          Sign in
        </button>
      </form>

      <p
        v-if="error"
        class="mt-4 text-sm text-red-700"
        role="alert"
      >
        {{ error }}
      </p>

      <p class="mt-6 text-center text-sm text-ink-600">
        <RouterLink
          :to="{ name: routeNames.register }"
          class="underline"
        >
          Create an account
        </RouterLink>
      </p>
    </div>
  </div>
</template>
