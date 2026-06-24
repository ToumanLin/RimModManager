<!-- src/components/workspace/views/CollectionCommand.vue -->
<template>
  <div class="h-full flex gap-4 p-4 overflow-hidden">
    
    <!-- ==================== 左侧：合集内的 Mod ==================== -->
    <div class="w-[45%] flex flex-col bg-bg-inset/80 border border-border-base/10 rounded-2xl overflow-hidden shadow-2xl relative">
      <div v-if="wsStore.collections.activeDetails" class="flex flex-col h-full">
        <!-- 列表表头 -->
        <div class="p-4 bg-accent-warn/10 border-b border-accent-warn/20 flex flex-col gap-3 z-10 relative" data-tour="workspace-collection-actions">
          <!-- 信息区 -->
          <div class="flex items-center gap-3">
            <div class="size-12 shrink-0 rounded-lg bg-accent-warn/20 flex items-center justify-center overflow-hidden border border-accent-warn/30">
              <img v-if="wsStore.collections.activeDetails.preview_url" :src="appStore.getRemoteUrl(wsStore.collections.activeDetails.preview_url)" class="w-full h-full object-cover" />
              <Layers v-else class="size-6 text-accent-warn" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex-1 min-w-0 text-sm font-black text-text-main truncate" v-tooltip="wsStore.collections.activeDetails.title">
                {{ wsStore.collections.activeDetails.title }}
              </div>
              <div class="text-[0.65rem] text-text-dim mt-1 font-mono">
                {{ t('workspace.collection.totalItems', { count: wsStore.collections.activeChildren.length }) }} |
                <span v-if="missingCount > 0" class="text-accent-danger font-bold bg-accent-danger/10 px-1 rounded">{{ t('workspace.collection.missingItems', { count: missingCount }) }}</span>
                <span v-else class="text-accent-success font-bold bg-accent-success/10 px-1 rounded">{{ t('workspace.collection.allInstalled') }}</span>
              </div>
            </div>
            <button ref="collectionDescriptionButtonRef" type="button"
              class="inline-flex size-10 shrink-0 items-center justify-center cursor-pointer rounded-lg border border-border-base/5 bg-bg-inset/20 text-text-dim backdrop-blur-sm transition-colors hover:bg-accent-primary hover:text-on-accent-primary hover:border-accent-primary/45"
              :class="collectionDescriptionPopoverOpen ? 'bg-accent-primary text-on-accent-primary border-accent-primary/45' : ''"
              @click.stop="toggleCollectionDescription" v-tooltip="t('workspace.collection.viewDescription')">
              <Info />
            </button>
          </div>
          <!-- 全局动作区 (一键操作) -->
          <div class="flex gap-2 w-full">
            <button @click="handleUnsubscribeAll" v-tooltip="t('workspace.collection.unsubscribeAllTip')"
              class="flex-1 py-1.5 min-w-0 bg-accent-danger/20 hover:bg-accent-danger text-accent-danger hover:text-on-accent-danger text-xs font-black rounded-lg border border-accent-danger/30 transition-all flex items-center justify-center gap-1">
              <Flag class="size-3.5" /> {{ t('workspace.collection.unsubscribeAll') }}
            </button>
            <button @click="handleSubscribeAll" v-tooltip="t('workspace.collection.subscribeAllTip')"
              class="flex-1 py-1.5 min-w-0 bg-accent-primary/20 hover:bg-accent-primary text-accent-primary hover:text-on-accent-primary text-xs font-black rounded-lg border border-accent-primary/30 transition-all flex items-center justify-center gap-1">
              <Flag class="size-3.5" /> {{ t('workspace.collection.subscribeAll') }}
            </button>
            <button v-if="missingCount > 0" @click="handleDownloadMissing" v-tooltip="t('workspace.collection.downloadMissingTip')"
              class="flex-1 py-1.5 bg-accent-success/20 hover:bg-accent-success text-accent-success hover:text-on-accent-success text-xs font-black rounded-lg border border-accent-success/30 transition-all flex items-center justify-center gap-1 shadow-[0_0_10px_rgba(var(--rgb-accent-success),0.2)]">
              <DownloadCloud class="size-3.5" /> {{ t('workspace.collection.downloadMissing', { count: missingCount }) }}
            </button>
            <button @click="applyAsLoadOrder" v-tooltip="t('workspace.collection.applyLoadOrderTip')"
              class="flex-1 px-3 py-1.5 bg-bg-overlay/10 hover:bg-accent-warn hover:text-on-accent-warn text-text-main text-xs font-bold rounded-lg border border-border-base/10 transition-colors flex items-center justify-center gap-1 ">
              <ListOrdered class="size-3.5" /> {{ t('workspace.collection.applyLoadOrder') }}
            </button>
          </div>
        </div>
        <FixedPopover :is-open="collectionDescriptionPopoverOpen" :trigger-ref="collectionDescriptionButtonRef" width="50vw"
          :min-width="320" max-width="50vw" max-height="70vh" :offset="8" @request-close="closeCollectionDescription" >
          <div class="flex max-h-[70vh] w-full min-w-80 overflow-hidden rounded-xl border border-border-base/18 bg-bg-surface/98 text-text-main">
            <div v-viewer.rebuild="imageViewerOptions" class="custom-scrollbar overflow-y-auto p-3.5 cursor-text text-[0.78rem] leading-[1.65] text-text-soft prose prose-invert prose-sm max-w-none select-text prose-img:rounded-xl prose-a:text-accent-primary">
              <div v-if="collectionDescriptionHtml" v-html="collectionDescriptionHtml"></div>
              <div v-else class="text-text-dim italic">{{ t('workspace.collection.noDescription') }}</div>
            </div>
          </div>
        </FixedPopover>
        <!-- 内容列表 -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5 relative">
          <!-- 遮罩加载 -->
          <div v-if="wsStore.collections.isChildrenLoading" class="absolute inset-0 bg-bg-deep/50 backdrop-blur-sm z-20 flex items-center justify-center">
            <div class="size-8 border-4 border-accent-warn border-t-transparent rounded-full animate-spin"></div>
          </div>
          <!-- 单个子 Mod 卡片 -->
          <div v-for="mod in wsStore.activeChildrenWithStatus" :key="mod.workshop_id"
            class="flex items-center gap-3 p-2 rounded-xl border transition-all group hover:bg-bg-overlay/5"
            :class="(mod.is_workshop || mod.is_self || mod.is_local) ? 'border-border-base/10 bg-glass-medium/60' : 'border-accent-danger/30 bg-accent-danger/5 opacity-80'">
            
            <img v-if="mod.preview_url" :src="appStore.getRemoteUrl(mod.preview_url)" class="size-10 rounded-lg object-cover border border-border-base/10 shadow-sm" />
            <div v-else class="size-10 rounded-lg bg-bg-inset/90 border border-border-base/10 flex items-center justify-center"><Package class="size-4 text-text-dim"/></div>
            
            <div class="flex-1 min-w-0">
              <div class="text-xs font-bold truncate" :class="(mod.is_workshop || mod.is_self || mod.is_local) ? 'text-text-main' : 'text-accent-danger'">{{ mod.title }}</div>
              <div class="text-[0.6rem] font-mono text-text-dim opacity-60 flex gap-2">
                <span>ID: {{ mod.workshop_id }}</span>
                <span v-if="(!mod.is_workshop && !mod.is_self && !mod.is_local)" class="text-accent-danger animate-pulse">{{ t('workspace.collection.pending') }}</span>
              </div>
            </div>
            
            <!-- 状态及单项动作组 (Hover 显示操作) -->
            <div class="shrink-0 flex items-center pr-1 gap-1">
              <!-- 已安装标志，平常显示，hover 隐藏给操作按钮让位 -->
              <Flag v-if="mod.is_workshop" class="size-5 text-accent-success drop-shadow-md group-hover:hidden" />
              <Download v-if="mod.is_self" class="size-5 text-accent-success drop-shadow-md group-hover:hidden" />
              <FolderDot v-if="mod.is_local" class="size-5 text-accent-success drop-shadow-md group-hover:hidden" />
              <AlertCircle v-if="(!mod.is_workshop && !mod.is_self && !mod.is_local)" class="size-5 text-accent-danger opacity-50 group-hover:hidden" />

              <!-- 操作按钮组 (Hover 显示) -->
              <!-- <div class="hidden group-hover:flex items-center gap-1 bg-glass-medium p-1 rounded-lg backdrop-blur-md border border-border-base/10 shadow-lg">
                <button @click="appStore.openSteamWorkshopById(mod.workshop_id)" v-tooltip="'访问创意工坊页面'" class="p-1.5 rounded-md hover:bg-accent-primary text-text-dim hover:text-on-accent-primary transition-colors"><ExternalLink class="size-3.5" /></button>
                <button v-if="mod.is_workshop" @click="handleUnsubscribeSingle(mod.workshop_id)" v-tooltip="'取消订阅'" class="p-1.5 rounded-md hover:bg-accent-danger text-text-dim hover:text-on-accent-danger transition-colors"><FlagOff class="size-3.5" /></button>
                <button v-else @click="handleSubscribeSingle(mod.workshop_id)" v-tooltip="'Steam 订阅'" class="p-1.5 rounded-md hover:bg-accent-primary text-text-dim hover:text-on-accent-primary transition-colors"><Flag class="size-3.5" /></button>
                <button v-if="!mod.is_self" @click="handleDownloadSingle(mod.workshop_id)" v-tooltip="'SteamCMD 下载'" class="p-1.5 rounded-md hover:bg-accent-success text-text-dim hover:text-on-accent-success transition-colors"><Download class="size-3.5" /></button>
              </div> -->
              <div class="hidden group-hover:flex">
                <WorkshopItemActions :workshop-id="mod.workshop_id" :show-unsubscribe="mod.is_workshop" class="pointer-events-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 未选中时的默认骨架屏 -->
      <div v-else class="flex-1 flex flex-col items-center justify-center opacity-20 pointer-events-none select-none">
        <BoxSelect class="size-32 mb-4" />
        <span class="text-sm font-black uppercase tracking-widest">{{ t('workspace.collection.selectCollection') }}</span>
      </div>
    </div>


    <!-- ==================== 右侧：合集 (55%) ==================== -->
    <div class="w-[55%] flex flex-col gap-4" data-tour="workspace-collection-browser">
      
      <div class="bg-bg-inset/80 p-2 rounded-2xl border border-border-base/10 flex items-center gap-2 shadow-lg">
        <button @click="wsStore.collections.activeView = 'saved'" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
          :class="wsStore.collections.activeView === 'saved' ? 'bg-accent-warn/20 text-accent-warn border border-accent-warn/30' : 'text-text-dim hover:text-text-main border border-transparent'">
          {{ t('workspace.collection.saved') }}
        </button>
        <button @click="activateCollectionSearch" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
          :class="wsStore.collections.activeView === 'search' ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30' : 'text-text-dim hover:text-text-main border border-transparent'">
          {{ t('workspace.collection.onlineSearch') }}
        </button>
      </div>

      <div v-if="wsStore.collections.activeView === 'saved'" class="bg-bg-inset/80 p-3 rounded-2xl border border-border-base/10 flex items-center gap-3 shadow-lg" data-tour="workspace-collection-input">
        <div class="flex-1 relative">
          <Plus class="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-text-dim" />
          <input v-model="newCollectionInput" @keydown.enter="submitAddCollection"
            :placeholder="t('workspace.collection.importPlaceholder')"
            class="w-full bg-bg-inset border border-border-base/10 rounded-xl pl-10 pr-4 py-2 text-sm text-text-main outline-none focus:border-accent-warn focus:bg-bg-inset transition-all" />
        </div>
        <button @click="submitAddCollection" :disabled="wsStore.collections.isParsing"
          class="px-6 py-2 bg-accent-warn/10 text-accent-warn hover:bg-accent-warn hover:text-on-accent-warn border border-accent-warn/30 rounded-xl text-sm font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          <span v-if="wsStore.collections.isParsing" class="animate-spin">⟳</span> 
          <span v-else>{{ t('workspace.collection.importCollection') }}</span>
        </button>
      </div>
      <div v-else class="bg-bg-inset/80 p-3 rounded-2xl border border-border-base/10 flex items-center gap-3 shadow-lg">
        <TagSearchInput class="flex-1 min-w-0 z-10" ref="collectionSearchInputRef"
          v-model="wsStore.collections.searchTokens" v-model:logic="wsStore.collections.searchLogic"
          :controller="collectionSearchController" :input-help-text="collectionInputHelpText"
          :placeholder="t('workspace.collection.searchPlaceholder')" list-color="primary" @search="searchCollections">
          <template #icon>
            <Search class="size-3.5 text-text-dim" />
          </template>
          <template #right>
            <div class="relative flex items-center justify-center gap-1">
              <button ref="collectionSortButtonRef" @click="toggleCollectionSortPanel" v-tooltip="t('workspace.collection.sortRange')"
                class="h-7 shrink-0 rounded-lg border border-border-base/10 bg-bg-inset/90 px-2 text-text-dim hover:text-accent-primary hover:border-accent-primary/40 flex items-center gap-1.5 transition-colors">
                <ListOrdered class="size-3.5" />
                <span class="max-w-24 truncate text-[0.7rem] font-bold">{{ collectionSortStateLabel }}</span>
              </button>
              <button @click="submitCollectionSearch" :disabled="wsStore.collections.isSearchLoading"
                class="px-2.5 py-1 m-0 rounded-lg bg-accent-primary/20 hover:bg-accent-primary text-accent-primary hover:text-on-accent-primary text-xs font-bold border border-accent-primary/30 transition-all disabled:opacity-50 flex items-center gap-1">
                <span v-if="wsStore.collections.isSearchLoading" class="animate-spin">⟳</span>
                <span v-else>{{ t('workspace.collection.search') }}</span>
              </button>
              <!-- 合集搜索复用 FixedPopover，避免排序面板撑开订阅/搜索卡片列表。 -->
              <FixedPopover :is-open="collectionSortPanelOpen" :trigger-ref="collectionSortButtonRef"
                :min-width="288" :max-width="320" :max-height="360" :offset="6" @request-close="closeCollectionSortPanel" >
                <div ref="collectionSortPanelRef" class="popover-surface w-72 rounded-xl border border-border-base/18 bg-bg-surface/98 p-3">
                  <div class="grid grid-cols-2 gap-4 text-xs">
                  <div class="space-y-1">
                    <div class="text-[0.7rem] font-black text-text-main">{{ t('workspace.collection.sort') }}</div>
                    <button v-for="option in WORKSHOP_SORT_OPTIONS" :key="option.value" type="button"
                      class="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left transition-colors"
                      :class="[
                        isCollectionSortOptionDisabled(option) ? 'text-text-disabled cursor-not-allowed opacity-45' : 'hover:text-text-main',
                        !isCollectionSortOptionDisabled(option) && collectionActiveSortValue === option.value ? 'text-text-main' : 'text-text-dim'
                      ]"
                      :disabled="isCollectionSortOptionDisabled(option)"
                      @click="selectCollectionSort(option.value)" v-tooltip="option.desc || option.label">
                      <span class="size-3 rounded-full border"
                        :class="!isCollectionSortOptionDisabled(option) && collectionActiveSortValue === option.value ? 'border-accent-primary bg-accent-primary shadow-[0_0_8px_currentColor]' : 'border-text-disabled bg-text-disabled/20'"></span>
                      <span>{{ option.label }}</span>
                    </button>
                  </div>
                  <div class="space-y-1">
                    <div class="text-[0.7rem] font-black text-text-main">{{ t('workspace.collection.time') }}</div>
                    <button v-for="option in WORKSHOP_DAY_RANGE_OPTIONS" :key="option.value" type="button"
                      class="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left transition-colors"
                      :class="[
                        isCollectionDayOptionDisabled(option) ? 'text-text-disabled cursor-not-allowed opacity-45' : 'hover:text-text-main',
                        !isCollectionDayOptionDisabled(option) && Number(wsStore.collections.searchDays) === option.value ? 'text-text-main' : 'text-text-dim'
                      ]"
                      :disabled="isCollectionDayOptionDisabled(option)"
                      @click="selectCollectionDays(option.value)">
                      <span class="size-3 rounded-full border"
                        :class="!isCollectionDayOptionDisabled(option) && Number(wsStore.collections.searchDays) === option.value ? 'border-accent-primary bg-accent-primary shadow-[0_0_8px_currentColor]' : 'border-text-disabled bg-text-disabled/20'"></span>
                      <span>{{ option.label }}</span>
                    </button>
                  </div>
                  </div>
                </div>
              </FixedPopover>
            </div>
          </template>
        </TagSearchInput>
      </div>

      <!-- 合集卡片网格 -->
      <div class="flex-1 relative overflow-hidden">
        <DynamicScroller v-if="collectionDisplayRows.length" class="h-full custom-scrollbar pr-2" data-tour="workspace-collection-list" :items="collectionDisplayRows" :min-item-size="collectionCardRowHeight" key-field="key" @scroll="handleCollectionListScroll">
          <template #default="{ item: row, index, active }">
            <DynamicScrollerItem :item="row" :active="active" :size-dependencies="[row.items.map(item => item?.id).join(',')]" :data-index="index">
              <div class="grid grid-cols-2 gap-4 pb-4">
                <article v-for="coll in row.items" :key="coll.id" @click="selectCollectionCard(coll)"
                  class="group relative min-h-[170px] cursor-pointer overflow-hidden rounded-2xl border bg-bg-inset/82 shadow-[0_12px_24px_rgba(0,0,0,0.22)] isolate transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px" v-tooltip="buildCollectionTooltip(coll)"
                  :class="wsStore.collections.activeId === coll.id ? 'border-accent-warn ring-1 ring-accent-warn shadow-[0_0_25px_rgba(var(--rgb-accent-warn),0.2)]' : 'border-border-base/10 hover:border-accent-warn/50 hover:shadow-[0_8px_20px_var(--shadow-color)]'">
                  <img v-if="coll.preview_url" :src="appStore.getRemoteUrl(coll.preview_url)"
                    class="absolute inset-0 h-full w-full object-cover opacity-55 transition-[transform,opacity] duration-700 ease-out group-hover:scale-[1.08] group-hover:opacity-70" loading="lazy" />
                  <div v-else class="absolute inset-0 flex items-center justify-center bg-bg-inset/82 text-text-dim/80"><FolderArchive class="size-8 opacity-50" /></div>
                  <div class="absolute inset-0 bg-linear-to-t from-bg-deep/96 via-bg-deep/56 to-transparent"></div>
                  <h4 class="absolute inset-x-2 top-2 right-11 z-1 overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem] font-black leading-tight text-text-main [text-shadow:0_1px_4px_rgba(0,0,0,0.55)]">{{ coll.title || t('workspace.collection.unknownCollection') }}</h4>
                  <button v-if="coll.source === 'saved'" @click.stop="confirmRemove(coll.raw)"
                    class="absolute right-2 top-2 z-2 rounded-lg border border-border-base/10 bg-bg-inset/90 p-1.5 text-text-dim opacity-0 backdrop-blur-[8px] transition-[opacity,background-color,color,border-color] duration-200 group-hover:opacity-100 hover:bg-accent-danger hover:text-on-accent-danger hover:border-accent-danger/50" v-tooltip="t('workspace.collection.deleteRecord')">
                    <Trash2 class="size-4" />
                  </button>
                  <button v-else @click.stop="saveOnlineCollection(coll.raw)"
                    class="absolute right-2 top-2 z-2 rounded-lg border border-border-base/10 bg-bg-inset/90 p-1.5 text-text-dim opacity-0 backdrop-blur-[8px] transition-[opacity,background-color,color,border-color] duration-200 group-hover:opacity-100 hover:bg-accent-warn hover:text-on-accent-warn hover:border-accent-warn/50" v-tooltip="t('workspace.collection.saveCollection')">
                    <Star class="size-4" />
                  </button>
                  <div class="pointer-events-none absolute inset-x-0 bottom-0 z-[1] flex flex-col justify-end gap-1.5 p-2 pb-2">
                    <span class="mt-auto overflow-hidden text-[0.75rem] font-black leading-tight text-text-soft [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [text-shadow:0_1px_4px_rgba(0,0,0,0.55)]">{{ coll.displayDescription || t('workspace.collection.noSummary') }}</span>
                    <div class="flex items-center justify-between gap-2">
                      <span class="max-w-[45%] overflow-hidden text-ellipsis whitespace-nowrap rounded-[0.45rem] border border-border-base/10 bg-bg-inset/90 px-1.5 py-1 text-[0.62rem] leading-tight text-text-dim/95">ID: {{ coll.id }}</span>
                      <div class="flex shrink-0 gap-1.5">
                        <span v-if="coll.missingCount > 0" class="flex items-center gap-1 rounded-[0.45rem] border border-accent-danger/30 bg-accent-danger/20 px-1.5 py-1 text-[0.6rem] font-extrabold text-accent-danger">
                          <AlertCircle class="size-2.5"/> {{ t('workspace.collection.missingShort', { count: coll.missingCount }) }}
                        </span>
                        <span class="flex items-center gap-1 rounded-[0.45rem] border border-border-base/10 bg-bg-overlay/10 px-1.5 py-1 text-[0.6rem] font-extrabold text-text-soft">
                          <Layers class="size-2.5"/> {{ t('workspace.collection.countShort', { count: coll.childCount || 0 }) }}
                        </span>
                      </div>
                    </div>
                    <div class="pointer-events-auto flex min-w-0 items-center justify-between gap-1 rounded-md text-[0.6rem] text-text-dim">
                      <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" v-tooltip="coll.updatedTooltip">{{ t('workspace.collection.updated', { value: coll.updatedLabel }) }}</span>
                      <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" v-tooltip="coll.syncTooltip">{{ t('workspace.collection.synced', { value: coll.syncLabel }) }}</span>
                    </div>
                  </div>
                </article>
              </div>
            </DynamicScrollerItem>
          </template>
          <template #after>
            <div v-if="wsStore.collections.isSearchLoadMore" class="py-3 flex justify-center items-center text-text-dim">
              <div class="size-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mr-2"></div>
              <span class="text-xs">{{ t('workspace.collection.loadingMore') }}</span>
            </div>
            <button v-else-if="wsStore.collections.activeView === 'search' && wsStore.collections.searchHasMore && wsStore.collections.searchResults.length" @click="loadMoreCollections"
              class="mt-1 mb-4 w-full py-2 rounded-xl border border-border-base/10 text-xs font-bold text-text-dim hover:text-accent-primary hover:border-accent-primary/30 transition-colors">
              {{ t('workspace.collection.loadMore') }}
            </button>
            <div v-else-if="collectionDisplayItems.length" class="py-3 text-center text-xs text-text-disabled">
              {{ t('workspace.collection.end') }}
            </div>
          </template>
        </DynamicScroller>

        <!-- 空状态 -->
        <div v-if="wsStore.collections.activeView === 'search' && wsStore.collections.isSearchLoading && wsStore.collections.searchResults.length === 0" class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg-deep/35 text-text-dim backdrop-blur-[2px] pointer-events-none">
          <div class="size-9 rounded-full border-4 border-accent-primary border-t-transparent animate-spin mb-4"></div>
          <span class="text-sm font-bold tracking-widest text-text-soft">{{ t('workspace.collection.searching') }}</span>
          <span class="text-xs mt-1">{{ t('workspace.collection.searchingDesc') }}</span>
        </div>
        <div v-if="wsStore.collections.activeView === 'saved' && !wsStore.collections.isLoading && wsStore.collections.savedList.length === 0" class="absolute inset-0 flex flex-col items-center justify-center text-text-disabled pointer-events-none">
          <FolderArchive class="size-16 mb-4 opacity-50" />
          <span class="text-sm font-bold tracking-widest">{{ t('workspace.collection.noSaved') }}</span>
          <span class="text-xs mt-1">{{ t('workspace.collection.noSavedDesc') }}</span>
        </div>
        <div v-if="wsStore.collections.activeView === 'search' && !wsStore.collections.isSearchLoading && wsStore.collections.searchResults.length === 0" class="absolute inset-0 flex flex-col items-center justify-center text-text-disabled pointer-events-none">
          <FolderArchive class="size-16 mb-4 opacity-50" />
          <span class="text-sm font-bold tracking-widest">{{ t('workspace.collection.noSearchResults') }}</span>
          <span class="text-xs mt-1">{{ t('workspace.collection.noSearchResultsDesc') }}</span>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Layers, Plus, Search, Download, DownloadCloud, BoxSelect, Package, Trash2, ListOrdered, Flag, FlagOff, AlertCircle, FolderArchive, FolderDot, ExternalLink, Star, Info } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { useWorkspaceStore } from '../workspaceStore'
import { useAppStore } from '../../../app/stores/appStore'
import { useModStore } from '../../mod/stores/modStore'
import { useConfirmStore } from '../../../shared/components/modal/confirmStore'
import { normalizePackageId } from '../../mod/lib/modIdentity'
import { isOfficialPackageId } from '../../mod/lib/packageScope'
import { formatDate } from '../../../shared/lib/format'
import { cleanRichText, parseUnityRichText } from '../../../shared/lib/text'
import { imageViewerOptions } from '../../../shared/lib/domEffects'
import FixedPopover from '../../../shared/components/popover/FixedPopover.vue'
import TagSearchInput from '../../../shared/components/tag-search/TagSearchInput.vue'
import { createTagSearchController, TAG_FIELD_TYPES } from '../../../shared/components/tag-search/tagSearchEngine'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import {
  WORKSHOP_DAY_RANGE_OPTIONS, WORKSHOP_SORT_OPTIONS,
  allowsWorkshopUntilNow, formatWorkshopSortStateLabel, hasWorkshopSearchText, resolveWorkshopSortSelection, supportsWorkshopDayRange,
} from '../workshopSearchOptions'
import WorkshopItemActions from '../../../shared/components/WorkshopItemActions.vue'

const toast = useToast()
const wsStore = useWorkspaceStore()
const appStore = useAppStore()
const modStore = useModStore()
const confirmStore = useConfirmStore()
const { t } = useI18n()

// 本地 UI 状态
const newCollectionInput = ref('')
const collectionSortPanelOpen = ref(false)
const collectionSortButtonRef = ref(null)
const collectionSortPanelRef = ref(null)
const collectionSearchInputRef = ref(null)
const collectionDescriptionButtonRef = ref(null)
const collectionDescriptionPopoverOpen = ref(false)
const collectionCardRowHeight = 190
const collectionHasSearchText = computed(() => hasWorkshopSearchText(wsStore.collections.searchTokens))
const collectionActiveSortValue = computed(() => resolveWorkshopSortSelection(wsStore.collections.searchSort, collectionHasSearchText.value))
const collectionSortStateLabel = computed(() => (
  formatWorkshopSortStateLabel(wsStore.collections.searchSort, wsStore.collections.searchDays, collectionHasSearchText.value)
))
const normalizeCollectionTime = (value) => {
  const timestamp = Number(value || 0)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 0
  // Steam 接口和本地缓存历史上都出现过秒/毫秒两种输入，这里统一成毫秒，避免显示成 1970。
  return timestamp < 1000000000000 ? timestamp * 1000 : timestamp
}
const buildCollectionTooltip = (coll) => (
  t('workspace.collection.tooltip', {
    title: coll.title || t('workspace.collection.unknownCollection'),
    description: coll.fullDescription || t('workspace.collection.noSummary'),
    count: coll.childCount || 0,
    missing: coll.missingCount > 0 ? t('workspace.collection.tooltipMissing', { count: coll.missingCount }) : '',
  })
)
const normalizeCollectionCard = (coll = {}, source = 'saved') => {
  const id = String(coll.id || coll.workshop_id || '').trim()
  const fullDescription = cleanRichText(coll.description || coll.short_description)
  const displayDescription = cleanRichText(coll.description || coll.short_description, 80)
  const children = Array.isArray(coll.children) ? coll.children : []
  // 搜索响应外层 total 表示命中合集总数；单卡片的“共 X”优先用 children.length，和缺失量计算保持同源。
  const childCount = children.length || Number(coll.num_children || 0) || (source === 'saved' ? Number(coll.total || 0) : 0)
  const missingCount = children.length ? getListMissingCount(coll) : 0
  const updatedTime = normalizeCollectionTime(coll.time_updated || coll.updated_time || coll.online_time)
  const syncTime = normalizeCollectionTime(coll.last_sync_time || coll.detail_last_sync_time || coll.summary_last_sync_time)
  return {
    ...coll,
    id, source, raw: coll,
    displayDescription,
    fullDescription,
    updatedTime, syncTime,
    updatedLabel: updatedTime ? formatDate(updatedTime) : t('workspace.collection.unknown'),
    syncLabel: syncTime ? formatDate(syncTime) : t('workspace.collection.notSynced'),
    updatedTooltip: updatedTime ? t('workspace.collection.updatedTooltip', { value: formatDate(updatedTime) }) : t('workspace.collection.noUpdatedTooltip'),
    syncTooltip: syncTime ? t('workspace.collection.syncTooltip', { value: formatDate(syncTime) }) : t('workspace.collection.noSyncTooltip'),
    childCount, missingCount,
  }
}
const collectionDisplayItems = computed(() => (
  wsStore.collections.activeView === 'search'
    ? (wsStore.collections.searchResults || []).map(coll => normalizeCollectionCard(coll, 'search'))
    : (wsStore.collections.savedList || []).map(coll => normalizeCollectionCard(coll, 'saved'))
))
const collectionDisplayRows = computed(() => {
  const results = collectionDisplayItems.value
  const rows = []
  for (let index = 0; index < results.length; index += 2) {
    rows.push({
      key: `collection-${wsStore.collections.activeView}-row-${results[index]?.id || index}`,
      items: results.slice(index, index + 2),
    })
  }
  return rows
})
const collectionDescriptionHtml = computed(() => {
  const activeDetails = wsStore.collections.activeDetails || {}
  // 说明弹层用于阅读原始工坊说明：优先使用未翻译/未清洗字段，再按接口可用字段回退。
  const rawDescription = String(activeDetails.original_description || activeDetails.description || activeDetails.short_description || '').trim()
  if (!rawDescription) return ''
  return parseUnityRichText(rawDescription, false, url => appStore.getRemoteUrl(url))
})
const collectionSearchController = computed(() => createTagSearchController({
  schema: {
    text: { type: TAG_FIELD_TYPES.STRING, label: t('workspace.collection.searchText'), alias: ['q', 'text'], suggest: true, defaultSearch: true },
    tag: { type: TAG_FIELD_TYPES.LIST, label: t('workspace.collection.tag'), alias: ['t', 'tag'], suggest: true },
  },
  valueOptions: {
    tag: ['1.6', '1.5', '1.4', '1.3', '1.2', '1.1', '1.0'].map(version => ({ label: version, value: version })),
  },
}))
const collectionInputHelpText = computed(() => t('workspace.collection.inputHelp'))
const isCollectionSortOptionDisabled = (option) => (
  option?.value === 'relevance'
  && !collectionHasSearchText.value
)
const isCollectionDayOptionDisabled = (option) => {
  if (!supportsWorkshopDayRange(wsStore.collections.searchSort, collectionHasSearchText.value)) return true
  return option.value === 0 && !allowsWorkshopUntilNow(wsStore.collections.searchSort, collectionHasSearchText.value)
}
const selectCollectionSort = (value) => {
  if (isCollectionSortOptionDisabled({ value })) return
  wsStore.collections.searchSort = value
}
const selectCollectionDays = (value) => {
  wsStore.collections.searchDays = value
}
const buildCollectionAdvancedSnapshot = () => JSON.stringify({
  sort: wsStore.collections.searchSort,
  days: wsStore.collections.searchDays,
})
const collectionAdvancedSnapshot = ref('')
const toggleCollectionSortPanel = () => {
  if (collectionSortPanelOpen.value) {
    closeCollectionSortPanel()
    return
  }
  closeCollectionDescription()
  // 关闭时按快照判断是否重新搜索；纯打开查看不应消耗一次在线请求。
  collectionAdvancedSnapshot.value = buildCollectionAdvancedSnapshot()
  collectionSortPanelOpen.value = true
}
const closeCollectionSortPanel = () => {
  if (!collectionSortPanelOpen.value) return
  const hasChanged = collectionAdvancedSnapshot.value && collectionAdvancedSnapshot.value !== buildCollectionAdvancedSnapshot()
  collectionSortPanelOpen.value = false
  collectionAdvancedSnapshot.value = ''
  if (hasChanged) void searchCollections()
}
const closeCollectionDescription = () => {
  collectionDescriptionPopoverOpen.value = false
}
const toggleCollectionDescription = () => {
  if (collectionDescriptionPopoverOpen.value) {
    closeCollectionDescription()
    return
  }
  closeCollectionSortPanel()
  collectionDescriptionPopoverOpen.value = true
}

// 计算当前合集的缺失数量
const missingCount = computed(() => wsStore.activeChildrenWithStatus.filter(c => !c.is_installed).length)

// 动态计算列表项的缺失数
const getListMissingCount = (coll) => {
  if (!coll.children) return 0;
  return coll.children.filter(child => {
      const wid = String(child.workshop_id)
      const pid = child.package_id ? String(child.package_id).toLowerCase() : null
      const is_installed =
          wsStore.librariesMods.workshop.some(m => !m.is_missing && String(m.workshop_id) === wid) ||
          wsStore.librariesMods.self.some(m => !m.is_missing && String(m.workshop_id) === wid) ||
          wsStore.librariesMods.local.some(m => !m.is_missing && ((pid && m.package_id?.toLowerCase() === pid) || (m.workshop_id && String(m.workshop_id) === wid)))
      return !is_installed
  }).length;
}

// --- 动作：添加与删除合集 ---
const submitAddCollection = async () => {
  const added = await wsStore.addCollection(newCollectionInput.value)
  if (added) {
    newCollectionInput.value = ''
  }
}
const activateCollectionSearch = async () => {
  await wsStore.activateCollectionSearchView()
}

const searchCollections = async () => {
  await wsStore.searchCollectionsOnline('', false)
}
const submitCollectionSearch = async () => {
  collectionSearchInputRef.value?.addTag?.()
  await nextTick()
  await searchCollections()
}

const loadMoreCollections = async () => {
  await wsStore.searchCollectionsOnline('', true)
}
const handleCollectionListScroll = (event) => {
  const target = event?.target
  if (wsStore.collections.activeView !== 'search') return
  if (!target || wsStore.collections.isSearchLoading || wsStore.collections.isSearchLoadMore || !wsStore.collections.searchHasMore) return
  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 160) {
    void loadMoreCollections()
  }
}
const selectCollectionCard = async (coll) => {
  closeCollectionDescription()
  await wsStore.selectCollection(coll.raw || coll)
}

const saveOnlineCollection = async (coll) => {
  const added = await wsStore.addCollection(coll.workshop_id)
  if (added) {
    wsStore.collections.activeView = 'saved'
  }
}

const confirmRemove = async (coll) => {
  const ok = await confirmStore.confirmAction(
    t('workspace.collection.removeTitle'),
    t('workspace.collection.removeMessage', { title: coll.title }),
    { type: 'error' },
  )
  if (ok) {
    wsStore.removeCollection(coll.id)
  }
}

// --- 动作：调用 AppStore 的 Steam 方法 ---

// 1. 订阅全部
const handleSubscribeAll = () => {
  const wids = wsStore.collections.activeChildren.map(m => String(m.workshop_id))
  if (!wids.length) return
  appStore.subscribeWorkshopIds(wids) // 调用 appStore 的统一方法
}
// 2. 取订全部
const handleUnsubscribeAll = () => {
  const wids = wsStore.collections.activeChildren.map(m => String(m.workshop_id))
  if (!wids.length) return
  appStore.unsubscribeWorkshopIds(wids) // 调用 appStore 的统一方法
}


// 2. 仅下载缺失项 (SteamCMD)
const handleDownloadMissing = () => {
  const wids = wsStore.activeChildrenWithStatus.filter(m => (!m.is_workshop && !m.is_self && !m.is_local)).map(m => String(m.workshop_id))
  
  if (!wids.length) {
    toast.info(t('workspace.collection.allReady'))
    return
  }
  appStore.downloadWorkshopItems(wids)
}

// 3. 单项操作
const handleSubscribeSingle = (wid) => appStore.subscribeWorkshopIds([String(wid)])
const handleUnsubscribeSingle = (wid) => appStore.unsubscribeWorkshopIds([String(wid)]) // 默认不删除文件
const handleDownloadSingle = (wid) => appStore.downloadWorkshopItems([String(wid)])

// --- 动作：应用加载顺序 ---
const applyAsLoadOrder = async () => {
  if (missingCount.value > 0) {
    const ok = await confirmStore.confirmAction(
      t('workspace.collection.warning'),
      t('workspace.collection.missingApplyMessage', { count: missingCount.value }),
      { type: 'warning' },
    )
    if (!ok) return
  }

  const officialIds = modStore.activeIds
    .map(id => normalizePackageId(id))
    .filter(id => id && isOfficialPackageId(id))

  const collectionIds = []
  const seenPackageIds = new Set(officialIds)
  let unresolvedCount = 0
  let duplicateCount = 0

  wsStore.activeChildrenWithStatus.forEach(child => {
    const pid = normalizePackageId(child.package_id)
    if (!pid) {
      unresolvedCount += 1
      return
    }
    if (seenPackageIds.has(pid)) {
      duplicateCount += 1
      return
    }
    seenPackageIds.add(pid)
    collectionIds.push(pid)
  })

  const nextActiveIds = [...officialIds, ...collectionIds]
  if (nextActiveIds.length === 0) {
    toast.error(t('workspace.collection.noPackageIds'))
    return
  }
  if (unresolvedCount > 0) {
    toast.warning(t('workspace.collection.unresolvedWarning', { count: unresolvedCount }))
  }
  if (duplicateCount > 0) {
    toast.info(t('workspace.collection.duplicateInfo', { count: duplicateCount }))
  }

  await modStore.runListHistoryTransaction({
    type: 'apply-collection-order',
    label: t('workspace.collection.historyLabel')
  }, async () => {
    modStore.setListIds('active', nextActiveIds)
    modStore.updateInactiveIds()
  })
  toast.success(t('workspace.collection.applySuccess'))
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: 4px; border: 1px solid transparent; background-clip: padding-box; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(var(--rgb-accent-warn),0.5); }
</style>
