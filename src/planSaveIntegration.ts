import type { GardenDocument } from './gardenDocument';

export const PLAN_SAVE_INTEGRATION_IDS = ['server'] as const;

export type PlanSaveIntegrationId = (typeof PLAN_SAVE_INTEGRATION_IDS)[number];

export type PlanSaveIntegrationStatus =
  | 'inactive'
  | 'unsaved'
  | 'saving'
  | 'saved'
  | 'error';

export type PlanSaveIntegrationDetailRow =
  | { kind: 'text'; label: string; value: string }
  | { kind: 'link'; label: string; href: string };

export type PlanSaveIntegrationView = {
  id: PlanSaveIntegrationId;
  label: string;
  status: PlanSaveIntegrationStatus;
  errorMessage?: string;
  details: PlanSaveIntegrationDetailRow[];
};

export type PlanSaveContext = {
  snapshot: () => GardenDocument;
  gardenName: () => string | undefined;
};

export type PlanSaveIntegration = {
  id: PlanSaveIntegrationId;
  label: string;
  isAvailable: () => boolean;
  isLinked: () => boolean;
  save: (ctx: PlanSaveContext) => Promise<void>;
  loadDetails: (ctx: PlanSaveContext) => Promise<PlanSaveIntegrationDetailRow[]>;
};

export const planSaveStatusLabel = (status: PlanSaveIntegrationStatus): string => {
  switch (status) {
    case 'inactive':
      return 'Off';
    case 'unsaved':
      return 'Unsaved';
    case 'saving':
      return 'Saving…';
    case 'saved':
      return 'Saved';
    case 'error':
      return 'Failed';
  }
};
