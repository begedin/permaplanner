import { computed } from 'vue';
import { defineStore } from 'pinia';
import { usePlanStateStore } from './usePlanStateStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import type { PathPoint } from './guildPathClip';

export const usePlotBorderStore = defineStore('plotBorder', () => {
  const plan = usePlanStateStore();
  const history = usePlanCommandHistory();
  const points = computed(() => plan.state.plotBorder);
  const save = (points: PathPoint[]): boolean => {
    if (points.length > 0) {
      if (
        points.length < 3 ||
        points.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))
      )
        return false;
      // Twice the signed area; keep this contract aligned with Document.plot_border?/1.
      const area = points.reduce((sum, point, index) => {
        const next = points[(index + 1) % points.length]!;
        return sum + point.x * next.y - next.x * point.y;
      }, 0);
      if (!Number.isFinite(area) || Math.abs(area) <= 0.001) return false;
    }
    history.runMutation(() => {
      plan.state.plotBorder = points.map((point) => ({ ...point }));
    });
    return true;
  };
  return { points, save };
});
