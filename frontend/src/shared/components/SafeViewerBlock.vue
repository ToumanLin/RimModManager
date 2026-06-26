<template>
  <component :is="tag" v-if="viewerEnabled && rebuild" v-viewer.rebuild="options" v-bind="attrs">
    <slot />
  </component>
  <component :is="tag" v-else-if="viewerEnabled" v-viewer="options" v-bind="attrs">
    <slot />
  </component>
  <component :is="tag" v-else v-bind="attrs">
    <slot />
  </component>
</template>

<script setup>
import { computed, useAttrs } from 'vue'
import { supportsViewerDirective } from '../lib/platform'

const props = defineProps({
  tag: { type: String, default: 'div' },
  options: { type: [Object, Array, String, Boolean, Number], default: null },
  rebuild: { type: Boolean, default: false },
  disableOnMacDesktop: { type: Boolean, default: true },
})

const attrs = useAttrs()
const viewerEnabled = computed(() => !props.disableOnMacDesktop || supportsViewerDirective())
</script>
