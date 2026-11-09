import { effectScope, ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import * as api from './api/gardenShares';
import { useGardenShares } from './useGardenShares';

vi.mock('./api/gardenShares');
const share = { id: 'share-a', url: '/share/a', createdAt: '2026-01-01' };
let active: ReturnType<typeof effectScope>;
afterEach(() => {
  active.stop();
  vi.resetAllMocks();
});
const setup = () => {
  active = effectScope();
  const id = ref<string | undefined>('a');
  return { id, ...active.run(() => useGardenShares(id))! };
};

it('discards an old list when switching gardens, even when switching back', async () => {
  let resolve!: (rows: (typeof share)[]) => void;
  vi.mocked(api.listGardenShares)
    .mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    )
    .mockResolvedValue([]);
  const { id, state } = setup();
  id.value = 'b';
  id.value = 'a';
  await flushPromises();
  resolve([share]);
  await flushPromises();
  expect(state.value.shares).toEqual([]);
});

it('settles the list before creating so a delayed list cannot erase the new link', async () => {
  let resolve!: (rows: (typeof share)[]) => void;
  vi.mocked(api.listGardenShares).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  vi.mocked(api.createGardenShare).mockResolvedValue(share);
  const { state, generateShareLink } = setup();
  const creating = generateShareLink();
  expect(api.createGardenShare).not.toHaveBeenCalled();
  resolve([]);
  await creating;
  expect(state.value.shares).toEqual([share]);
});

it.each(['success', 'failure'])(
  'ignores an old create %s after switching gardens',
  async (result) => {
    vi.mocked(api.listGardenShares).mockResolvedValue([]);
    let resolve!: (value: typeof share) => void;
    let reject!: (error: Error) => void;
    vi.mocked(api.createGardenShare).mockReturnValue(
      new Promise((done, fail) => {
        resolve = done;
        reject = fail;
      }),
    );
    const { id, state, generateShareLink } = setup();
    const creating = generateShareLink();
    await flushPromises();
    id.value = 'b';
    if (result === 'success') resolve(share);
    else reject(new Error('Old failure'));
    await creating;
    await flushPromises();
    expect({
      shares: state.value.shares,
      error: state.value.error,
      sharing: state.value.sharing,
    }).toEqual({ shares: [], error: undefined, sharing: false });
  },
);

it('does not publish a previous garden revoke failure into the current garden', async () => {
  vi.mocked(api.listGardenShares).mockResolvedValue([share]);
  let reject!: (error: Error) => void;
  vi.mocked(api.revokeGardenShare).mockReturnValue(
    new Promise((_done, fail) => {
      reject = fail;
    }),
  );
  const { id, state, revokeShare } = setup();
  await flushPromises();
  const revoking = revokeShare(share.id);
  await flushPromises();
  id.value = 'b';
  reject(new Error('Old revoke failed'));
  await revoking;
  await flushPromises();
  expect({
    rows: state.value.shares,
    error: state.value.error,
    revoking: [...state.value.revoking],
  }).toEqual({ rows: [share], error: undefined, revoking: [] });
  expect(api.revokeGardenShare).toHaveBeenCalledWith('a', share.id);
});

it('revokes different links concurrently and ignores repeated clicks on the same link', async () => {
  const other = { ...share, id: 'share-b', url: '/share/b' };
  vi.mocked(api.listGardenShares).mockResolvedValue([share, other]);
  let finishFirst!: () => void;
  let finishSecond!: () => void;
  vi.mocked(api.revokeGardenShare)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        finishFirst = resolve;
      }),
    )
    .mockReturnValueOnce(
      new Promise((resolve) => {
        finishSecond = resolve;
      }),
    );
  const { state, revokeShare } = setup();
  await flushPromises();
  const first = revokeShare(share.id);
  const second = revokeShare(other.id);
  await revokeShare(share.id);
  expect(vi.mocked(api.revokeGardenShare).mock.calls).toEqual([
    ['a', share.id],
    ['a', other.id],
  ]);
  expect([...state.value.revoking]).toEqual([share.id, other.id]);
  finishSecond();
  await second;
  expect(state.value.shares).toEqual([share]);
  expect([...state.value.revoking]).toEqual([share.id]);
  finishFirst();
  await first;
  expect(state.value.shares).toEqual([]);
  expect([...state.value.revoking]).toEqual([]);
});
