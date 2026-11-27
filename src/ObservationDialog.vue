<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue';
  import {
    newestObservationFirst,
    observationToday,
    observationTypeLabels,
    type ObservationType,
    type Observation,
    type ObservationLocation,
  } from './observations';
  import { useGardenStore } from './useGardenStore';

  const props = defineProps<{
    location: ObservationLocation;
    entry?: Observation;
    locations?: readonly ObservationLocation[];
  }>();
  const emit = defineEmits<{ close: [] }>();
  const garden = useGardenStore();
  const dialog = ref<HTMLDialogElement>();
  const target = ref(props.location);
  const type = ref<ObservationType>(props.entry?.type ?? 'note');
  const date = ref(props.entry?.date ?? observationToday());
  const text = ref(props.entry?.text ?? '');
  const history = computed(() =>
    props.location.observations?.toSorted(newestObservationFirst),
  );
  onMounted(() => dialog.value?.showModal());
  const remove = () => {
    if (!props.entry || !window.confirm('Delete this observation?')) return;
    garden.removeObservation(props.location, props.entry.id);
    dialog.value?.close();
  };
  const save = () => {
    if (!text.value.trim() || !date.value) return;
    garden.recordObservation(
      { date: date.value, text: text.value, type: type.value },
      target.value,
      props.entry?.id,
    );
    dialog.value?.close();
  };
</script>

<template>
  <dialog
    ref="dialog"
    :aria-label="entry ? 'Edit observation' : 'Record observation'"
    class="m-auto w-[min(28rem,94vw)] max-h-[85dvh] overflow-y-auto rounded-xl border border-parchment-400 bg-parchment-50 p-4 text-ink-800 shadow-lg backdrop:bg-black/30"
    @close="emit('close')"
  >
    <h2 class="text-lg font-medium">
      {{ entry ? 'Edit observation' : 'Record observation' }}
    </h2>
    <p
      v-if="!locations"
      class="mb-3 text-sm text-ink-600"
    >
      {{ location.label }}
    </p>
    <form
      class="grid gap-3"
      @submit.prevent="save"
    >
      <label
        v-if="locations"
        class="grid gap-1 text-sm"
        >Record for
        <select
          v-model="target"
          class="input-soft px-2 py-1"
        >
          <option
            v-for="option in locations"
            :key="JSON.stringify([option.guildId, option.thingId])"
            :value="option"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
      <fieldset class="grid gap-1">
        <legend class="text-sm">Type</legend>
        <div class="flex flex-wrap gap-1">
          <label
            v-for="(name, value) in observationTypeLabels"
            :key="value"
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm text-ink-700 has-checked:bg-sage-200"
          >
            <input
              v-model="type"
              class="accent-sage-700"
              type="radio"
              :value="value"
              name="observation-type"
            />{{ name }}
          </label>
        </div>
      </fieldset>
      <label class="grid gap-1 text-sm"
        >Observation
        <textarea
          v-model="text"
          autofocus
          required
          rows="3"
          class="input-soft w-full p-2"
        />
      </label>
      <label class="grid gap-1 text-sm"
        >Date
        <input
          v-model="date"
          required
          type="date"
          max="9999-12-31"
          class="input-soft px-2 py-1"
        />
      </label>
      <div class="flex justify-end gap-2">
        <button
          v-if="entry"
          type="button"
          class="mr-auto text-sm text-red-700"
          @click="remove"
        >
          Delete observation
        </button>
        <button
          type="button"
          class="btn-soft px-3 py-1"
          @click="dialog?.close()"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="!text.trim() || !date"
          class="btn-soft px-3 py-1 disabled:opacity-50"
        >
          Save observation
        </button>
      </div>
    </form>
    <section
      v-if="!entry && !locations && history?.length"
      class="mt-4 border-t border-parchment-300 pt-2"
    >
      <h3 class="text-sm font-medium">Previous observations</h3>
      <ul class="divide-y divide-parchment-300">
        <li
          v-for="previous in history"
          :key="previous.id"
          class="py-2 text-sm"
        >
          <span class="mr-2 text-xs font-medium">{{
            observationTypeLabels[previous.type]
          }}</span>
          <time
            :datetime="previous.date"
            class="text-xs text-ink-500"
            >{{ previous.date }}</time
          >
          <p class="whitespace-pre-wrap wrap-break-word">{{ previous.text }}</p>
        </li>
      </ul>
    </section>
  </dialog>
</template>
