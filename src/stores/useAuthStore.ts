import { defineStore } from 'pinia';
import { ref } from 'vue';

import * as authApi from '../api/auth';
import type { AuthUser } from '../api/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const bootstrapping = ref(true);

  let generation = 0;
  let bootstrapInFlight: Promise<void> | undefined;

  const setUser = (next: AuthUser | null) => {
    generation += 1;
    bootstrapInFlight = undefined;
    bootstrapping.value = false;
    user.value = next;
  };

  const bootstrap = () => {
    if (bootstrapInFlight) return bootstrapInFlight;
    if (!bootstrapping.value) return Promise.resolve();
    const request = generation;
    const operation = (async () => {
      try {
        const session = await authApi.fetchSession();
        if (request === generation) user.value = session;
      } catch {
        if (request === generation) user.value = null;
      } finally {
        if (request === generation) {
          bootstrapping.value = false;
          bootstrapInFlight = undefined;
        }
      }
    })();
    bootstrapInFlight = operation;
    return operation;
  };

  const register = (email: string, password: string) => authApi.register(email, password);

  const confirmRegisterTotp = async (code: string) => {
    const { user: registered, recoveryCodes } = await authApi.confirmRegisterTotp(code);
    setUser(registered);
    return recoveryCodes;
  };

  const login = (email: string, password: string) => authApi.login(email, password);

  const confirmLoginTotp = async (code: string) => {
    const { user: loggedIn, recoveryCodes } = await authApi.confirmLoginTotp(code);
    setUser(loggedIn);
    return recoveryCodes;
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  return {
    user,
    bootstrapping,
    bootstrap,
    setUser,
    register,
    confirmRegisterTotp,
    login,
    confirmLoginTotp,
    logout,
  };
});
