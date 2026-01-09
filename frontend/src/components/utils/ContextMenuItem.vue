<!-- components/ContextMenuItem.vue -->
<template>
  <div
    ref="itemRef"
    class="group relative px-1 py-0.5 max-w-[200px]"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- 分割线 -->
    <div v-if="item.divider" class="h-px bg-zinc-200/20 dark:bg-zinc-700/50" />

    <!-- 菜单内容 -->
    <button v-else :disabled="item.disabled" @click.stop="handleClick"
      class="flex w-full cursor-default items-center justify-between rounded-md px-1.5 py-1 text-xs font-medium transition-all duration-200 outline-none
      disabled:cursor-not-allowed disabled:opacity-40
      data-[active=true]:bg-blue-500/10 data-[active=true]:text-blue-500
      hover:bg-zinc-100 hover:dark:bg-zinc-700/50
      focus:bg-zinc-100 focus:dark:bg-zinc-700/50"
      :class="[levelClass(), activeSubMenu ? 'bg-zinc-100 dark:bg-zinc-700/50' : '']"
    >
      <!-- 左侧：图标 + 文字 -->
      <div class="flex items-center gap-2.5 overflow-hidden ">
        <component 
          :is="item.icon" 
          v-if="item.icon" 
          class="size-4 opacity-70"
        />
        <!-- 文字内容靠左自动省略 -->
        <span class="truncate">{{ item.label }}</span>
      </div>

      <!-- 右侧：快捷键 或 箭头 -->
      <div class="ml-6 flex items-center gap-2 opacity-60">
        <span v-if="item.shortcut" class="text-[10px] tracking-widest font-sans">{{ item.shortcut }}</span>
        <!-- 箭头 SVG -->
        <svg v-if="item.children && item.children.length" class="size-3 -mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </div>
    </button>

    <!-- 递归子菜单 -->
    <Transition name="submenu">
      <div
        v-if="item.children && activeSubMenu"
        ref="subMenuRef"
        class="absolute top-0 z-50 min-w-40 rounded-xl border border-zinc-200/50 bg-white/80 p-0.5 shadow-xl backdrop-blur-xl dark:border-zinc-700/50 dark:bg-zinc-900/90 dark:shadow-black/40"
        :class="subMenuPositionClass"
      >
        <ContextMenuItem
          v-for="(subItem, idx) in item.children"
          :key="idx"
          :item="subItem"
          @close-menu="$emit('close-menu')"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useWindowSize } from '@vueuse/core'

const props = defineProps({
  item: { type: Object, required: true }
})

const emit = defineEmits(['close-menu'])

const itemRef = ref(null)
const subMenuRef = ref(null)
const activeSubMenu = ref(false)
const subMenuSide = ref('right') // 'right' | 'left'
const { width: windowWidth } = useWindowSize()

const levelClass = () => {
    const level = props.item.level || 'default'
    const classMap = {
        'default': 'text-text-main dark:text-text-main/70',
        'success': 'text-accent-success hover:bg-accent-success/10!',
        'warning': 'text-accent-warning hover:bg-accent-warning/10!',
        'warn': 'text-accent-warn hover:bg-accent-warn/10!',
        'error': 'text-red-500 hover:bg-red-500/10!',
        'danger': 'text-accent-danger hover:bg-accent-danger/10!',
    }
    return classMap[level]
}

// 处理点击
const handleClick = () => {
  if (props.item.disabled) return
  if (props.item.children) return // 点击父菜单不执行动作，仅hover显示（仿macOS逻辑）

  if (props.item.action) {
    props.item.action()
  }
  emit('close-menu') // 关闭整个菜单
}

// 鼠标进入：计算子菜单应该显示在左边还是右边
let hoverTimer = null
const handleMouseEnter = () => {
  if (props.item.disabled || !props.item.children) return
  
  clearTimeout(hoverTimer)
  activeSubMenu.value = true

  nextTick(() => {
    if (!itemRef.value || !subMenuRef.value) return
    const parentRect = itemRef.value.getBoundingClientRect()
    const subMenuWidth = 160 // 估算或通过 subMenuRef.value.offsetWidth 获取

    // 如果右侧空间不足，显示在左侧
    if (parentRect.right + subMenuWidth > windowWidth.value) {
      subMenuSide.value = 'left'
    } else {
      subMenuSide.value = 'right'
    }
  })
}

// 鼠标离开：延迟关闭，防止鼠标划过间隙时消失
const handleMouseLeave = () => {
  hoverTimer = setTimeout(() => {
    activeSubMenu.value = false
  }, 200)
}

// 动态计算子菜单位置类名
const subMenuPositionClass = computed(() => {
  return subMenuSide.value === 'right' 
    ? 'left-full ml-1' // 显示在右侧
    : 'right-full mr-1' // 显示在左侧
})
</script>

<style scoped>
/* 子菜单过渡动画 */
.submenu-enter-active, .submenu-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.submenu-enter-from, .submenu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>