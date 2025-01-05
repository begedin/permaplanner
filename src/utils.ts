import { v4 } from 'uuid';

export const uuid = v4;

type Nullable<T> = T | null | undefined;

export const assert = <T>(value: Nullable<T>): T => {
  if (!value) {
    throw new Error('Assertion failed');
  }
  return value;
};
