<script setup lang="ts">
  defineProps<{
    svg: string;
  }>();
</script>

<template>
  <div
    class="mx-auto w-[200px] rounded-lg border border-parchment-300 bg-white p-3"
    role="img"
    aria-label="Authenticator QR code"
    v-html="svg"
  />
</template>
