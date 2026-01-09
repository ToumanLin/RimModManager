<template>
  <div :style="{ '--drag-color': `var(--color-accent-${listColor})`, '--rgb-components': hexToRgb(groupData.color) }">
    <!-- 标题区 -->
    <div @click="toggle" :class="['list-none select-none px-1.5 flex text-text-dim hover:text-text-main items-center justify-between gap-0.5 rounded-lg font-medium',
      'bg-[rgba(var(--rgb-components),0.4)] hover:bg-[rgba(var(--rgb-components),0.6)] border border-white/5']">
      <!-- 抓取图标 -->
      <div v-tooltip="`移动`" class="drag-handle cursor-move p-1 text-text-dim hover:text-text-main hover:scale-130 transition-all">
        <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z"
            fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" />
          <path d="M20 20L24 16L28 20" stroke="currentColor" stroke-width="4" stroke-linecap="round"
            stroke-linejoin="round" />
          <path d="M20 28L24 32L28 28" stroke="currentColor" stroke-width="4" stroke-linecap="round"
            stroke-linejoin="round" />
        </svg>
      </div>
      <!-- 颜色选择与展开显示 -->
      <div @click.stop v-tooltip="`改变颜色`" class="relative inline-flex items-center justify-center text-text-main hover:text-transparent transition-all">
        <ColorPicker v-model:pureColor="groupData.color" @pureColorChange="saveGroupColor" shape="circle" format="hex" picker-type="fk" disable-alpha round-history />
        <svg :class="expanded ? '-rotate-180' : ''" class="absolute pointer-events-none t-0 transition-transform duration-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>

      <!-- 标题 - 根据编辑状态显示输入框或文本 -->
      <span v-tooltip="groupData.name" :class="`flex-1 flex min-w-0 text-sm px-1 mx-1 text-text-main font-bold tracking-wider items-center gap-2`">
        <input v-show="isEditingName" v-model="editingGroupName" @click.stop @keyup.enter="saveGroupName" @blur="saveGroupName"
          class="flex-1 px-0 py-0.5 min-w-0 rounded bg-bg-deep/70 border border-white/10 text-white focus:border-accent-primary focus:outline-none" />
        <span v-show="!isEditingName" class="min-w-0 truncate">{{ groupData.name }}</span>
      </span>

      <span :class="`text-[10px] bg-black/30 px-2 py-0.5 rounded text-[rgba(var(--rgb-components),1)]`">
        {{ groupData.mod_ids.length }}
      </span>

      <!-- 编辑/保存 与 删除 -->
      <span class="flex items-center">
        <!-- 编辑/保存按钮 -->
        <button @click.stop="toggleEditName" v-tooltip="`编辑分组名称`" :class="`rounded-lg p-1 hover:bg-text-dim/30 cursor-pointer text-text-dim text-xs font-bold shadow-lg hover:shadow-bg-deep/50 transition-all`">
          <svg v-show="!isEditingName" class="hover:text-accent-secondary" width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 42H43" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M11 26.7199V34H18.3172L39 13.3081L31.6951 6L11 26.7199Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" />
          </svg>
          <svg v-show="isEditingName" class="hover:text-accent-success" width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 44C29.5228 44 34.5228 41.7614 38.1421 38.1421C41.7614 34.5228 44 29.5228 44 24C44 18.4772 41.7614 13.4772 38.1421 9.85786C34.5228 6.23858 29.5228 4 24 4C18.4772 4 13.4772 6.23858 9.85786 9.85786C6.23858 13.4772 4 18.4772 4 24C4 29.5228 6.23858 34.5228 9.85786 38.1421C13.4772 41.7614 18.4772 44 24 44Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" />
            <path d="M16 24L22 30L34 18" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <!-- 删除按钮 -->
        <button @click.stop="deleteGroup" v-tooltip="`删除分组`" :class="`rounded-lg p-1 hover:bg-text-dim/30 cursor-pointer 
          text-text-dim hover:text-accent-danger text-xs font-bold shadow-lg hover:shadow-bg-deep/50 
          transition-all`">
          <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 11L40 11" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M18 5L30 5" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M12 17H36V40C36 41.6569 34.6569 43 33 43H15C13.3431 43 12 41.6569 12 40V17Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" />
              <path d="M20 25L28 33" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M28 25L20 33" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </span>
    </div>

    <!-- 内容区 -->
    <div class="grid transition-[grid-template-rows] duration-200 "
      :class="expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'">
      <div class="h-full overflow-hidden">
        <div :class="`p-1 mx-1 min-h-15 bg-[rgba(var(--rgb-components),0.2)] border border-b-white/5 border-x-white/5 border-t-transparent rounded-b-lg shadow-2xsl relative`">
          <div v-show="groupData.mod_ids.length === 0" class="absolute flex rounded-lg top-0 bottom-0 left-0 right-0 m-1 items-center justify-center border-2 border-dashed text-gray-600 text-xs bg-bg-deep/30 select-none pointer-events-none">
            可拖拽模组到此
            <!-- 点阵背景 -->
            <div class="absolute inset-0 opacity-[0.05] pointer-events-none" style="background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 20px 20px;"></div>
          </div>

          <VirtualList v-model="internalModList" dataKey="id" :keeps="50" class="h-full min-h-15" ref="vListRef"
            placeholderClass="ghost" wrapClass="" :fallbackOnBody="true" :appendToBody="true" :scrollSpeed="{ x: 0, y: 10 }"
            :group="{ name: 'mods', pull: 'clone', put: true, revertDrag: true }" :animation="150"
            @drop="updateChildren" @drag="startDrag" >
            <template v-slot:item="{ record, index, dataKey }">

              <div class="relative group">
                <ModItem :item_id="dataKey" :index="index" :key="dataKey" :list-color="listColor" 
                        :is-selected="store.selectedIds.includes(dataKey)" :show-index="false" :simple="true"
                        @click-start="handleClickStart" @click-end="handleClickEnd"
                        @click.stop="handleClick($event, dataKey)">
                </ModItem>
                
                <!-- 右上角移除按钮 -->
                <button @click.stop="removeItem(dataKey)" v-tooltip="`移除`"
                  class="absolute top-1 right-1 w-3 h-3 bg-accent-danger text-text-main rounded-full 
                        opacity-0 group-hover:opacity-80 transition-opacity duration-200
                        flex items-center justify-center text-xs z-10 hover:scale-110">×
                </button>
              </div>

            </template>
          </VirtualList>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue' // 引入 ref
import VirtualList from 'vue-virtual-sortable';
import ModItem from './ModItem.vue'
import { useDebounceFn } from '@vueuse/core'
import { ColorPicker } from "vue3-colorpicker";
import "vue3-colorpicker/style.css";
import { useModStore } from '../../stores/modStore';

const props = defineProps({
  id: { type: String, required: true },
  index: { type: Number, required: true },
  groupData: { type: Object, required: true },
  expanded: { type: Boolean, default: false }, // 这个 props 会由父组件 GroupList 传递
  listColor: { type: String, default: 'primary' }, // 用于不同列表的颜色区分
  isDragging: { type: Boolean, default: false } // 用于外部控制样式
})

const store = useModStore()
const internalModList = ref([])
const vListRef = ref(null)
const emit = defineEmits(['toggle', 'delete-group', 'remove-item', 'update-group', 'update-children'])

// 计算属性computed无法直接修改props.groupData.mod_ids，因为它是只读的。
// 监听 props 变化，同步到本地 (单向数据流：父 -> 子)
watch(
  () => props.groupData.mod_ids,
  (newIds) => {
    // 将纯 ID 转换为 VirtualList 需要的对象格式
    // 注意：这里要创建一个新的数组引用，防止污染
    internalModList.value = newIds.map(id => ({ id: id }))
  },
  { immediate: true, deep: true }
  // 设置immediate: true后，监听器会在初始化时立即执行一次回调，无需等待数据首次变化。
  // 设置deep: true后，监听器会 “递归遍历” 嵌套结构，感知所有层级属性的变化，确保嵌套数据修改时能触发回调。
)

// --- 数据传递与事件处理 ---
// 切换展开状态
const toggle = () => {
  emit('toggle', props.id)
}
// 删除分组
const deleteGroup = () => {
  emit('delete-group', props.id)
}
// 移除模组
const removeItem = (itemId: string) => {
  emit('remove-item', props.id, [itemId])
}
// 更新分组信息
const updateGroup = (data = props.groupData) => {
  emit('update-group', props.id, data)
}
// 保存分组名称
const saveGroupName = () => {
   const newName = editingGroupName.value.trim()
  if (newName && newName !== props.groupData.name) {
    emit('update-group', props.id, { name: newName })
  }
  isEditingName.value = false
}
// 保存分组颜色
const saveGroupColor = useDebounceFn((color) => {
  console.log("保存颜色:", color)
  emit('update-group', props.id, { color: color })
}, 1000)

// ===== 多选连选逻辑 =====
const selectedIds = ref(new Set()) // 选中ID集合
const invertSelectedIds = ref(new Set()) // 反选ID集合
const lastSelectedId = ref(null)      // 最后点击的 ID (用于 Shift 连选定位)
// 点击开始时，多选连选逻辑，记录最后点击的ID
const handleClickStart = (event: MouseEvent, id: string) => {
  // 修正输入框不会对列表项失焦，强制失焦逻辑
  // 如果当前有获得焦点的元素，且它是一个输入框，则强制让它失焦
  if (document.activeElement instanceof HTMLElement && 
     (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
      document.activeElement.blur()
  }

  // 只响应左键点击
  if (event.button === 0) {
    return
  }
  const isMulti = event.ctrlKey || event.metaKey
  const isRange = event.shiftKey
  const lowerId = id.toLowerCase();
  // 找到当前列表的所有可见ID
  const currentListIds = internalModList.value.map(item => item.id.toLowerCase())
  if (isRange) {
    // Shift 连选逻辑
    if (selectedIds.value.size === 0 || !lastSelectedId.value) {
      selectedIds.value.add(lowerId);
      return;
    }
    
    // 找到最后一次选择的ID在当前列表中的索引
    const lastIndex = currentListIds.indexOf(lastSelectedId.value);
    // 找到当前点击的ID在当前列表中的索引
    const currentIndex = currentListIds.indexOf(lowerId);
    
    if (lastIndex !== -1 && currentIndex !== -1) {
      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
      const isForward = lastIndex < currentIndex;
      for (let i = start; i <= end; i++) {
        // 如果当前ID已选中，则从选中集合中移除
        if(selectedIds.value.has(currentListIds[i])) {
          if(isForward && i === start) continue;
          else if(!isForward && i === end) continue;
          invertSelectedIds.value.add(currentListIds[i]);
        }
        selectedIds.value.add(currentListIds[i]);
      }
    } else {
      selectedIds.value.add(lowerId); // 如果找不到范围，就只选中当前项
    }

  } else if (isMulti) {
    // 如果当前ID已选中，则从选中集合中移除
    if (selectedIds.value.has(lowerId)) {invertSelectedIds.value.add(lowerId)}
    // Ctrl/Meta 多选逻辑
    selectedIds.value.add(lowerId);
  } else {
    // 单选逻辑
    if(selectedIds.value.has(lowerId)) return;  // 点击已选中的项，不做处理，防止影响拖拽等长按操作
    selectedIds.value.clear();
    selectedIds.value.add(lowerId);
  }
  const selectedIdsArray = currentListIds.filter(id => selectedIds.value.has(id)) // 保持顺序
  store.selectMod(selectedIdsArray)
}
// 点击结束时,主要用于多选反选判定
const handleClickEnd = (event: MouseEvent, id: string) => {
  console.log('点击结束', event, id)
  const isMulti = event.ctrlKey || event.metaKey
  const isRange = event.shiftKey
  const lowerId = id.toLowerCase();
  const currentListIds = internalModList.value.map(item => item.id.toLowerCase())
  if (isRange || isMulti) {
    for (const id of invertSelectedIds.value) {
      selectedIds.value.delete(id);
    }
    invertSelectedIds.value.clear();
  } else {
    // 单选直接清空已选列表并重新选中当前项
    selectedIds.value.clear();
    selectedIds.value.add(lowerId);
  }
  if (!isRange) lastSelectedId.value = lowerId;
  const selectedIdsArray = currentListIds.filter(id => selectedIds.value.has(id)) // 保持顺序
  store.selectMod(selectedIdsArray)
}
// 全选
const selectAll = (e) => {
  console.log('全选',e)
  selectedIds.value = new Set(internalModList.value.map(item => item.id.toLowerCase()))
  store.selectMod(Array.from(selectedIds.value))
}
// 开始拖拽时，清空反选集合
const startDrag = (e) => {
  invertSelectedIds.value.clear();
  console.log("开始拖拽:", e)
}
// 更新子项的排序
const updateChildren = (e) => {
  const oldIds = props.groupData.mod_ids  // 原始顺序
  const newIds = internalModList.value.map(item => item.id)  // 获取当前的最新顺序 ID列表
  const tempSelectedIds = store.selectedIds
  selectedIds.value = new Set(tempSelectedIds)
  // 检查是否是当前分组的列表，排除当前列表自身的触发
  const currentListDom = vListRef.value.$el
  if (e.event.from === currentListDom || e.event.from === e.event.to) {
    console.log(props.groupData.name, "排序结束:", e)
    // 只有顺序真的变了才发请求
    if (JSON.stringify(newIds) !== JSON.stringify(oldIds)) {
      emit('update-children', props.id, newIds)
    }
    return
  }
  // 拖动项来自其它列表
  console.log(props.groupData.name, "插入结束:", e)

  // 去除重复, 保持拖动项的位置（保留除已选项外的其他项，已选择的项后续插入）
  // const uniqueIds = newIds.filter((id, index) => e.item.id !== id && newIds.indexOf(id) === index || e.item.id === id && index === e.newIndex)
  const uniqueIds = newIds.filter((id, index) => {
    // 检测是否是拖动项（值和索引都匹配），是则保留（用于标记位置）
    if (index === e.newIndex && id === e.item.id) return true
    // 排除已选择的项（过滤重复）
    if (tempSelectedIds.includes(id)) return false
    // 其他未选择项，保留
    return true
  })
  const newIndex = uniqueIds.indexOf(e.item.id)
  // 根据拖动项，插入选中项（因选中项包含拖动项，所以插入时需要移除拖动项）
  uniqueIds.splice(newIndex, 1, ...tempSelectedIds)
  // （修复漏洞：如果拖入相同项到相邻位置，去重后实际列表顺序不变，但组件会渲染拖入的相同项，所以目前必须强制更新）
  internalModList.value = uniqueIds.map(id => ({ id: id }))
  console.log("排序前:", oldIds)
  console.log("排序后:", uniqueIds)
  // 只有顺序真的变了才发请求
  if (JSON.stringify(uniqueIds) !== JSON.stringify(oldIds)) {
    emit('update-children', props.id, uniqueIds)
  }
}

// ===== 分组名称编辑逻辑 =====
const isEditingName = ref(false)
const editingGroupName = ref('')
// 切换编辑状态
const toggleEditName = () => {
  if (isEditingName.value) {
    // 如果当前是编辑状态，点击时保存并退出编辑
    saveGroupName()
  } else {
    // 如果当前是非编辑状态，点击时进入编辑
    editingGroupName.value = props.groupData.name
    isEditingName.value = true
  }
}

// ModItem 内部的点击事件，可以保持不变或根据需要调整
const handleClick = (event, modId) => {
  // 可以在这里处理 ModItem 的点击事件，例如选中/取消选中
  // console.log('ModItem clicked:', modId);
}

// 颜色格式转换
const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string') return `0, 0, 0`; // 返回纯组件字符串
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  // 确保是六位
  if (cleanHex.length !== 6) {
    console.error(`Invalid hex color: ${hex}`);
    return `0, 0, 0`;
  }
  // 提取 R, G, B 分量，并从十六进制转换为十进制
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
};

</script>

<style scoped>
.ghost {
  opacity: 0.5;
  border: 2px dashed var(--drag-color);
  scale: 90%;
  padding: 5px;
  border-radius: 10px;
  /* transform: scale(0.9); */
  /* transition: none; */
}

/* 取色器样式优化 */
:deep(.vc-color-wrap.round) {
  width: 1rem !important;
  height: 1rem !important;
  border: none !important;
  margin-right: 0 !important;
  transition: all 0.15s ease;
}

:deep(.vc-color-wrap.round:hover) {
  transform: scale(1.3);
  z-index: 10;
}

:deep(.vc-color-wrap.transparent) {
  background-image: none !important;
}
</style>