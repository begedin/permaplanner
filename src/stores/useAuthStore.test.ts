import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, expect, it, vi } from 'vitest';
import * as api from '../api/auth';
import { useAuthStore } from './useAuthStore';

vi.mock('../api/auth');
const user = { id: 'user', email: 'user@example.com', totpConfirmed: true };
beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
});

it('shares bootstrap work and does not refetch a settled session', async () => {
  let resolve!: (value: typeof user) => void;
  vi.mocked(api.fetchSession).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const auth = useAuthStore();
  const first = auth.bootstrap();
  const second = auth.bootstrap();
  resolve(user);
  await Promise.all([first, second]);
  await auth.bootstrap();
  expect(api.fetchSession).toHaveBeenCalledTimes(1);
  expect(auth).toMatchObject({ user, bootstrapping: false });
});

it.each(['login', 'logout', 'login after failed bootstrap'])(
  'ignores stale bootstrap results after %s',
  async (action) => {
    let resolve!: (value: typeof user | null) => void;
    let reject!: (error: Error) => void;
    vi.mocked(api.fetchSession).mockReturnValue(
      new Promise((done, fail) => {
        resolve = done;
        reject = fail;
      }),
    );
    const auth = useAuthStore();
    const boot = auth.bootstrap();
    if (action === 'logout') await auth.logout();
    else {
      vi.mocked(api.confirmLoginTotp).mockResolvedValue({ user });
      await auth.confirmLoginTotp('123456');
    }
    if (action === 'login after failed bootstrap') reject(new Error('Unavailable'));
    else resolve(action === 'logout' ? user : null);
    await boot;
    expect(auth).toMatchObject({
      user: action === 'logout' ? null : user,
      bootstrapping: false,
    });
  },
);
