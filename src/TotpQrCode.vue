<script setup lang="ts">
  defineProps<{
    svg: string;
  }>();
</script>

<template>
  <img
    class="block mx-auto w-[200px] rounded-lg border border-parchment-300 bg-white p-3"
    alt="Authenticator QR code"
    :src="'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)"
  />
</template>
