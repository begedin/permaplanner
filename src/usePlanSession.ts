/* global FileSystemFileHandle */
import { computed, ref } from 'vue';

import { completeGithubAuthIfNeeded, syncIfRepoLinked } from './githubRepoSync';
import { checkGithubPlanMigration } from './usePlanMigration';
import { useOnboardingStore } from './useOnboardingStore';
import { usePermaplannerStore } from './usePermaplannerStore';
import {
  ensureReadAccess,
  getFileHandle,
  getPersistedBoundFileName,
} from './sessionFileHandle';

export const isRestoringSession = ref(true);
export const awaitingReopenFileClick = ref(false);
const pendingReopenFileHandle = ref<FileSystemFileHandle | null>(null);

let bootstrapStarted = false;

const clearReopenFileUi = () => {
  pendingReopenFileHandle.value = null;
  awaitingReopenFileClick.value = false;
};

const isFilePermissionError = (e: unknown): boolean =>
  e instanceof DOMException &&
  (e.name === 'NotAllowedError' || e.name === 'SecurityError');

export const usePlanSession = () => {
  const permaplannerStore = usePermaplannerStore();
  const onboarding = useOnboardingStore();

  const expectedRelinkName = computed(() => getPersistedBoundFileName());

  const syncRepoAfterLocalSave = () => {
    void syncIfRepoLinked(permaplannerStore.snapshot(), permaplannerStore.fileName);
  };

  const tryRestorePersistedFile = async () => {
    const handle = await getFileHandle();
    if (!handle) {
      if (getPersistedBoundFileName()) {
        permaplannerStore.needsFileRelink = true;
      }
      return;
    }
    try {
      await permaplannerStore.load(handle, { skipBindingPersist: true });
    } catch (e) {
      if (isFilePermissionError(e)) {
        pendingReopenFileHandle.value = handle;
        awaitingReopenFileClick.value = true;
        return;
      }
      console.error('[permaplanner] Could not open restored file handle:', e);
      permaplannerStore.needsFileRelink = true;
    }
  };

  const continueReopenPersistedFile = async () => {
    const h = pendingReopenFileHandle.value ?? (await getFileHandle());
    if (!h) {
      clearReopenFileUi();
      return;
    }
    try {
      if (!(await ensureReadAccess(h))) {
        permaplannerStore.needsFileRelink = true;
        clearReopenFileUi();
        return;
      }
      await permaplannerStore.load(h, { skipBindingPersist: true });
      await checkGithubPlanMigration(permaplannerStore.fileName);
    } catch (e) {
      console.error('[permaplanner] Could not open file after permission grant:', e);
      permaplannerStore.needsFileRelink = true;
    } finally {
      clearReopenFileUi();
    }
  };

  const fileOptions = (fileName: string = 'myNewPlan.json') => ({
    types: [{ accept: { 'application/json': ['.json' as const] } }],
    suggestedName: fileName,
    startIn: 'documents' as const,
  });

  const load = async () => {
    clearReopenFileUi();
    const options = fileOptions();
    try {
      const [fileHandle] = await window.showOpenFilePicker(options);
      await permaplannerStore.load(fileHandle);
      await checkGithubPlanMigration(permaplannerStore.fileName);
    } catch (e) {
      console.error(e);
    }
  };

  const newPlan = async () => {
    try {
      clearReopenFileUi();
      const options = fileOptions('myNewPlan.json');
      const fileHandle = await window.showSaveFilePicker(options);
      await permaplannerStore.resetToNewPlan();
      await permaplannerStore.save(fileHandle);
      syncRepoAfterLocalSave();
      onboarding.onboardingState = 'initial';
    } catch (e) {
      console.error(e);
    }
  };

  const save = async () => {
    try {
      const fileHandle =
        permaplannerStore.fileHandle ||
        (await window.showSaveFilePicker(fileOptions(permaplannerStore.fileName)));
      permaplannerStore.fileHandle = fileHandle;
      permaplannerStore.fileName = fileHandle.name;
      await permaplannerStore.save(fileHandle);
      syncRepoAfterLocalSave();
    } catch (e) {
      console.error(e);
    }
  };

  const saveAs = async () => {
    try {
      const options = fileOptions(permaplannerStore.fileName);
      const fileHandle = await window.showSaveFilePicker(options);
      await permaplannerStore.save(fileHandle);
      syncRepoAfterLocalSave();
    } catch (e) {
      console.error(e);
    }
  };

  const runBootstrap = async () => {
    try {
      await completeGithubAuthIfNeeded();
      await tryRestorePersistedFile();
      await checkGithubPlanMigration(
        permaplannerStore.fileName ?? getPersistedBoundFileName(),
      );
    } finally {
      isRestoringSession.value = false;
    }
  };

  if (!bootstrapStarted) {
    bootstrapStarted = true;
    void runBootstrap();
  }

  return {
    isRestoringSession,
    awaitingReopenFileClick,
    pendingReopenFileHandle,
    expectedRelinkName,
    clearReopenFileUi,
    continueReopenPersistedFile,
    load,
    newPlan,
    save,
    saveAs,
    syncRepoAfterLocalSave,
  };
};
