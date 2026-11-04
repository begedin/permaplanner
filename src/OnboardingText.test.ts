import { cleanup, render, screen } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import OnboardingText from './OnboardingText.vue';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('briefly shows completion and cancels its timer when onboarding is restored', async () => {
  const { rerender } = render(OnboardingText, {
    props: { x: 0, y: 0, onboardingState: 'movedSecond' },
  });
  await rerender({ onboardingState: 'done' });
  expect(screen.getByText(/Map scale set/)).toBeInTheDocument();
  await vi.advanceTimersByTimeAsync(500);
  await rerender({ onboardingState: 'movedSecond' });
  expect(vi.getTimerCount()).toBe(0);
  expect(screen.queryByText(/Map scale set/)).not.toBeInTheDocument();
  await rerender({ onboardingState: 'done' });
  await vi.advanceTimersByTimeAsync(600);
  expect(screen.getByText(/Map scale set/)).toBeInTheDocument();
  await vi.advanceTimersByTimeAsync(400);
  expect(screen.queryByText(/Map scale set/)).not.toBeInTheDocument();
});

it('does not replay completion when mounting an already completed plan', () => {
  render(OnboardingText, { props: { x: 0, y: 0, onboardingState: 'done' } });
  expect(screen.queryByText(/Map scale set/)).not.toBeInTheDocument();
  expect(vi.getTimerCount()).toBe(0);
});

it('disposes the presentation timer on unmount', async () => {
  const { rerender, unmount } = render(OnboardingText, {
    props: { x: 0, y: 0, onboardingState: 'settingLength' },
  });
  expect(screen.getByText(/set the length of that line/)).toBeInTheDocument();
  await rerender({ onboardingState: 'done' });
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
