/** One global save queue: at most one save job runs; later jobs wait in FIFO order. */
let queueTail: Promise<void> = Promise.resolve();

export const runPlanSaveSerial = <T>(fn: () => Promise<T>): Promise<T> => {
  const next = queueTail.then(fn, fn);
  queueTail = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
};

/** For unit tests only. */
export const resetPlanSaveSerialQueueForTests = (): void => {
  queueTail = Promise.resolve();
};
