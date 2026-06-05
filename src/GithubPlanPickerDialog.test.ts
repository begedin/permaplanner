import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import GithubPlanPickerDialog from './GithubPlanPickerDialog.vue';

const {
  listGithubPlansInRepo,
  getGithubAccessToken,
  restorePlanFromGithub,
  saveLocalCopy,
} = vi.hoisted(() => ({
  listGithubPlansInRepo: vi.fn(),
  getGithubAccessToken: vi.fn(),
  restorePlanFromGithub: vi.fn(),
  saveLocalCopy: vi.fn(),
}));

vi.mock('./githubRepoSync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./githubRepoSync')>();
  return {
    ...actual,
    listGithubPlansInRepo,
    getGithubAccessToken,
  };
});

vi.mock('./usePlanSession', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./usePlanSession')>();
  return {
    ...actual,
    usePlanSession: () => ({
      restorePlanFromGithub,
      saveLocalCopy,
    }),
  };
});

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
  listGithubPlansInRepo.mockReset();
  getGithubAccessToken.mockReset();
  restorePlanFromGithub.mockReset();
  saveLocalCopy.mockReset();
});

afterEach(() => cleanup());

it('lists GitHub plans when opened and opens the selected plan', async () => {
  getGithubAccessToken.mockReturnValue('token');
  listGithubPlansInRepo.mockResolvedValue([
    {
      gardenFolderSegment: 'garden-a',
      suggestedFileName: 'garden-a.json',
      remoteLastUpdatedMs: Date.parse('2024-06-15T12:30:00Z'),
    },
  ]);
  restorePlanFromGithub.mockResolvedValue(undefined);
  saveLocalCopy.mockResolvedValue(undefined);

  render(GithubPlanPickerDialog, {
    props: { open: true },
  });

  await waitFor(() => {
    expect(screen.getByText('garden-a')).toBeTruthy();
  });

  await fireEvent.click(screen.getByText('garden-a'));

  await waitFor(() => {
    expect(restorePlanFromGithub).toHaveBeenCalledWith({
      gardenFolderSegment: 'garden-a',
      suggestedFileName: 'garden-a.json',
      remoteLastUpdatedMs: Date.parse('2024-06-15T12:30:00Z'),
    });
    expect(saveLocalCopy).toHaveBeenCalled();
  });
});

it('shows an empty state when the repo has no saved plans', async () => {
  getGithubAccessToken.mockReturnValue('token');
  listGithubPlansInRepo.mockResolvedValue([]);

  render(GithubPlanPickerDialog, {
    props: { open: true },
  });

  await waitFor(() => {
    expect(screen.getByText(/No saved plans found/i)).toBeTruthy();
  });
});
