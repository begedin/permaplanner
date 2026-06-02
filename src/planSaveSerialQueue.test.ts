import { beforeEach, expect, it } from 'vitest';

import {
  resetPlanSaveSerialQueueForTests,
  runPlanSaveSerial,
} from './planSaveSerialQueue';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  resetPlanSaveSerialQueueForTests();
});

it('runs jobs in FIFO order without overlap', async () => {
  const order: string[] = [];

  const first = runPlanSaveSerial(async () => {
    order.push('a-start');
    await delay(20);
    order.push('a-end');
  });

  const second = runPlanSaveSerial(async () => {
    order.push('b');
  });

  await Promise.all([first, second]);

  expect(order).toEqual(['a-start', 'a-end', 'b']);
});

it('continues the queue after a rejected job', async () => {
  const order: number[] = [];

  const first = runPlanSaveSerial(async () => {
    order.push(1);
    throw new Error('fail');
  });

  const second = runPlanSaveSerial(async () => {
    order.push(2);
  });

  await expect(first).rejects.toThrow('fail');
  await second;

  expect(order).toEqual([1, 2]);
});
