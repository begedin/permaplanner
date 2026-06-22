import { apiFetch, expectJson } from './client';

export type AuthUser = {
  id: string;
  email: string;
  totpConfirmed: boolean;
};

export type TotpSetup = {
  uri: string;
  secret: string;
  qrSvg: string;
};

export type LoginResult = {
  requiresTotp: true;
  requiresTotpSetup?: boolean;
  totp?: TotpSetup;
};

export const fetchSession = async (): Promise<AuthUser | null> => {
  const res = await apiFetch('/api/auth/session');
  if (res.status === 401) {
    return null;
  }
  const data = await expectJson<{ user: AuthUser }>(res);
  return data.user;
};

export const register = async (email: string, password: string): Promise<TotpSetup> => {
  const data = await expectJson<{ totp: TotpSetup }>(
    await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  );
  return data.totp;
};

export const confirmRegisterTotp = async (
  code: string,
): Promise<{ user: AuthUser; recoveryCodes: string[] }> => {
  return expectJson(
    await apiFetch('/api/auth/register/totp', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  );
};

export const login = async (email: string, password: string): Promise<LoginResult> => {
  return expectJson(
    await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  );
};

export const confirmLoginTotp = async (
  code: string,
): Promise<{ user: AuthUser; recoveryCodes?: string[] }> => {
  const data = await expectJson<{ user: AuthUser; recoveryCodes?: string[] }>(
    await apiFetch('/api/auth/login/totp', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  );
  return data;
};

export const logout = async (): Promise<void> => {
  await apiFetch('/api/auth/logout', { method: 'POST' });
};
