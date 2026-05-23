import type { InjectionKey, Ref } from 'vue';

export const comboboxPanelOpenKey: InjectionKey<Ref<boolean>> =
  Symbol('comboboxPanelOpen');
