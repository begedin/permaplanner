import { v7 } from 'uuid';

export const observationTypeLabels = {
  note: 'Note',
  flowering: 'Flowering',
  harvest: 'Harvest',
  care: 'Care',
} as const;
export type ObservationType = keyof typeof observationTypeLabels;

export type ObservationTarget = { guildId?: string; thingId?: string };

export type ObservationLocation = ObservationTarget & {
  label: string;
  observations?: readonly Observation[];
};

export type Observation = {
  id: string;
  type: ObservationType;
  date: string;
  text: string;
};

export const observationToday = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

// UUIDv7 keeps entries on the same observation date in recording order.
export const createObservation = (fields: Omit<Observation, 'id'>): Observation => ({
  id: v7(),
  ...fields,
});

export const newestObservationFirst = (a: Observation, b: Observation) =>
  b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
