<!-- components/ContextMenu.vue -->
<template>
  <Teleport to="body">
    <Transition name="scale">
      <div
        v-if="store.show"
        ref="menuRef"
        class="fixed z-9999 min-w-[150px] py-0.5 rounded-xl border border-zinc-200/50 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-zinc-700/50 dark:bg-zinc-900/90 dark:shadow-black/50 ring-1 ring-black/5"
        :style="menuStyle"
        @contextmenu.prevent
      >
        <ContextMenuItem 
          v-for="(item, idx) in store.items" 
          :key="idx" 
          :item="item"
          @close-menu="store.close()"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { onClickOutside, useWindowSize } from '@vueuse/core'
import { useContextMenuStore } from '../stores/contextMenuStore' // 调整你的路径
import ContextMenuItem from './utils/ContextMenuItem.vue'

const store = useContextMenuStore()
const menuRef = ref(null)
const { width: winWidth, height: winHeight } = useWindowSize()

// 实际渲染坐标 (防止溢出)
const actualX = ref(0)
const actualY = ref(0)

// 监听 store 打开状态，进行坐标计算
watch(() => store.show, async (val) => {
  if (val) {
    await nextTick() // 等待 DOM 渲染以获取菜单真实宽高
    if (!menuRef.value) return

    const { offsetWidth, offsetHeight } = menuRef.value
    const { x, y } = store

    // X轴 边界检测
    if (x + offsetWidth > winWidth.value) {
      actualX.value = x - offsetWidth
    } else {
      actualX.value = x
    }

    // Y轴 边界检测
    if (y + offsetHeight > winHeight.value) {
      actualY.value = y - offsetHeight
    } else {
      actualY.value = y
    }
  }
})

const menuStyle = computed(() => ({
  left: `${actualX.value}px`,
  top: `${actualY.value}px`,
}))

// 点击外部关闭
onClickOutside(menuRef, () => {
  store.close()
})

// 监听 ESC 键关闭
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && store.show) store.close()
})
</script>

<style scoped>
/* 主菜单弹出动画：类似于 macOS 的弹出效果 */
.scale-enter-active {
  transition: opacity 0.15s ease-out, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}
.scale-leave-active {
  transition: opacity 0.1s ease-in, transform 0.1s ease-in;
}
.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>