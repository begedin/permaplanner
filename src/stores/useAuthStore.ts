import { defineStore } from 'pinia';
import { ref } from 'vue';

import * as authApi from '../api/auth';
import type { AuthUser } from '../api/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const bootstrapping = ref(true);

  const setUser = (next: AuthUser | null) => {
    user.value = next;
  };

  const bootstrap = async () => {
    bootstrapping.value = true;
    try {
      user.value = await authApi.fetchSession();
    } catch {
      user.value = null;
    } finally {
      bootstrapping.value = false;
    }
  };

  const register = (email: string, password: string) => authApi.register(email, password);

  const confirmRegisterTotp = async (code: string) => {
    const { user: registered, recoveryCodes } = await authApi.confirmRegisterTotp(code);
    user.value = registered;
    return recoveryCodes;
  };

  const login = (email: string, password: string) => authApi.login(email, password);

  const confirmLoginTotp = async (code: string) => {
    user.value = await authApi.confirmLoginTotp(code);
  };

  const logout = async () => {
    await authApi.logout();
    user.value = null;
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
