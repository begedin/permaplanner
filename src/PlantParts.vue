<script setup lang="ts">
import Apple from './GardenSymbols/SymbolApple.vue';
import Banana from './GardenSymbols/SymbolBanana.vue';
import Blueberry from './GardenSymbols/SymbolBlueberry.vue';
import Cherry from './GardenSymbols/SymbolCherry.vue';
import Lemon from './GardenSymbols/SymbolLemon.vue';
import Orange from './GardenSymbols/SymbolOrange.vue';
import Pear from './GardenSymbols/SymbolPear.vue';
import Strawberry from './GardenSymbols/SymbolStrawberry.vue';

import Bg1 from './PlantParts/BackgroundType1.vue';
import Bg2 from './PlantParts/BackgroundType2.vue';
import Bg3 from './PlantParts/BackgroundType3.vue';
import Bg4 from './PlantParts/BackgroundType4.vue';
import Bg5 from './PlantParts/BackgroundType5.vue';
import Bg6 from './PlantParts/BackgroundType6.vue';
import Bg7 from './PlantParts/BackgroundType7.vue';
import Bg8 from './PlantParts/BackgroundType8.vue';

import LayerApple from './PlantParts/LayerApple.vue';
import LayerBanana from './PlantParts/LayerBanana.vue';
import LayerBlueberry from './PlantParts/LayerBlueberry.vue';
import LayerCherry from './PlantParts/LayerCherry.vue';
import LayerLemon from './PlantParts/LayerLemon.vue';
import LayerOrange from './PlantParts/LayerOrange.vue';
import LayerPear from './PlantParts/LayerPear.vue';
import LayerStrawberry from './PlantParts/LayerStrawberry.vue';
</script>
<template>
  <svg
    height="0"
    width="0"
  >
    <!-- backgrounds -->
    <symbol id="bg_1"><Bg1 /></symbol>
    <symbol id="bg_2"><Bg2 /></symbol>
    <symbol id="bg_3"><Bg3 /></symbol>
    <symbol id="bg_4"><Bg4 /></symbol>
    <symbol id="bg_5"><Bg5 /></symbol>
    <symbol id="bg_6"><Bg6 /></symbol>
    <symbol id="bg_7"><Bg7 /></symbol>
    <symbol id="bg_8"><Bg8 /></symbol>
    <!-- individual fruits -->
    <symbol id="apple"><Apple /></symbol>
    <symbol id="banana"><Banana /></symbol>
    <symbol id="blueberry"><Blueberry /></symbol>
    <symbol id="cherry"><Cherry /></symbol>
    <symbol id="lemon"><Lemon /></symbol>
    <symbol id="orange"><Orange /></symbol>
    <symbol id="pear"><Pear /></symbol>
    <symbol id="strawberry"><Strawberry /></symbol>
    <!-- layers -->
    <symbol id="layer_apple"><LayerApple /></symbol>
    <symbol id="layer_banana"><LayerBanana /></symbol>
    <symbol id="layer_blueberry"><LayerBlueberry /></symbol>
    <symbol id="layer_cherry"><LayerCherry /></symbol>
    <symbol id="layer_lemon"><LayerLemon /></symbol>
    <symbol id="layer_orange"><LayerOrange /></symbol>
    <symbol id="layer_pear"><LayerPear /></symbol>
    <symbol id="layer_strawberry"><LayerStrawberry /></symbol>
  </svg>
</template>
