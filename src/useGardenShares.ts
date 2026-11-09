import { reactive, shallowRef, watch, onScopeDispose, type Ref } from 'vue';
import {
  listGardenShares,
  createGardenShare,
  revokeGardenShare,
  type GardenShare,
} from './api/gardenShares';

const createShareState = (gardenId: string | undefined) =>
  reactive({
    gardenId,
    shares: [] as GardenShare[],
    error: undefined as string | undefined,
    sharing: false,
    revoking: new Set<string>(),
    loaded: Promise.resolve(),
  });

export const useGardenShares = (gardenId: Ref<string | undefined>) => {
  const state = shallowRef(createShareState(gardenId.value));
  onScopeDispose(() => {
    state.value = createShareState(undefined);
  });
  watch(
    gardenId,
    (id) => {
      const current = createShareState(id);
      state.value = current;
      current.loaded = (async () => {
        if (!id) return;
        try {
          current.shares = await listGardenShares(id);
        } catch (error) {
          current.error = error instanceof Error ? error.message : String(error);
        }
      })();
    },
    { immediate: true, flush: 'sync' },
  );

  const generateShareLink = async () => {
    const current = state.value;
    if (!current.gardenId || current.sharing) return;
    current.sharing = true;
    current.error = undefined;
    // The initial list must settle before mutations can change its contents.
    await current.loaded;
    if (current !== state.value) return;
    current.error = undefined;
    try {
      const share = await createGardenShare(current.gardenId);
      current.shares = [share, ...current.shares];
    } catch (error) {
      current.error = error instanceof Error ? error.message : String(error);
    } finally {
      current.sharing = false;
    }
  };

  const revokeShare = async (id: string) => {
    const current = state.value;
    if (!current.gardenId || current.revoking.has(id)) return;
    current.revoking.add(id);
    current.error = undefined;
    try {
      await revokeGardenShare(current.gardenId, id);
      current.shares = current.shares.filter((share) => share.id !== id);
    } catch (error) {
      current.error = error instanceof Error ? error.message : String(error);
    } finally {
      current.revoking.delete(id);
    }
  };
  return { state, generateShareLink, revokeShare };
};
