<template>
  <CommonModalShell :show="appStore.uiState.showTextureOptModal" :show-header="false" size="page" :z-index="100" accent="highlight" content-class="h-full flex flex-col"
    @close="closeModal" >
      <div data-tour="texture-opt-modal" class="flex h-full w-full flex-col overflow-hidden">
        <header class="shrink-0 border-b border-border-base/5 bg-[linear-gradient(135deg,rgba(var(--rgb-bg-deep),0.88),rgba(var(--rgb-bg-inset),0.96))] px-6 py-2">
          <div class="flex items-center justify-between">

            <h2 data-tour="texture-opt-title" class="shrink-0 flex items-center gap-3 min-w-0 text-2xl font-black tracking-wider text-text-main">
              <Images class="w-6 h-6 text-accent-highlight" />
              <span>{{ t('textureOpt.title') }}</span>
              <span v-tooltip="textureOptHelpText" class="inline-flex size-5 cursor-help items-center justify-center text-lg font-bold text-text-dim hover:text-text-main hover:border-border-base/18">?</span>
            </h2>

            <div data-tour="texture-opt-summary" class="bg-bg-surface/80 mx-5 min-w-0 flex-1 rounded-xl px-4 py-2 text-xs">
              <div class="grid grid-cols-4 gap-x-4 gap-y-2">
                <div class="min-w-0">
                  <span class="text-accent-tip/80">PNG</span>
                  <span class="ml-1 text-text-dim">{{ t('textureOpt.imageCount', { count: summary.source_total_count || 0 }) }}</span>
                  <span class="ml-1 font-mono font-bold text-accent-tip">{{ formatFileSize(summary.source_total_bytes || 0) }}</span>
                </div>
                <div class="min-w-0">
                  <span class="text-accent-primary/80">DDS</span>
                  <span class="ml-1 text-text-dim">{{ t('textureOpt.imageCount', { count: summary.dds_output_count || 0 }) }}</span>
                  <span class="ml-1 font-mono font-bold text-accent-primary">{{ formatFileSize(summary.dds_output_bytes || 0) }}</span>
                  <span v-if="summary.zstd_output_count" class="ml-2 text-accent-secondary/80">ZSTD</span>
                  <span v-if="summary.zstd_output_count" class="ml-1 text-text-dim">{{ t('textureOpt.imageCount', { count: summary.zstd_output_count }) }}</span>
                  <span v-if="summary.zstd_output_count" class="ml-1 font-mono font-bold text-accent-secondary">{{ formatFileSize(summary.zstd_output_bytes || 0) }}</span>
                </div>
                <div class="min-w-0 truncate text-accent-highlight">
                  {{ t('textureOpt.vramEstimate') }}
                  <span class="ml-1 line-through opacity-50">{{ formatFileSize(summary.source_vram_bytes_est || 0) }}</span>
                  <span class="mx-1">→</span>
                  <span class="font-mono font-bold">{{ formatFileSize(summary.output_vram_bytes_est || 0) }}</span>
                </div>
                <div class="min-w-0 text-text-dim">
                  {{ t('textureOpt.mods') }} <span class="ml-1 font-mono font-bold text-text-main">{{ summary.mod_count || 0 }}</span>
                </div>

                <div class="min-w-0 text-accent-warning/80">
                  {{ t('textureOpt.pending') }} <span class="ml-1 font-mono font-bold text-text-main">{{ summary.generate_required_count || 0 }}</span>
                </div>
                <div class="col-span-3 min-w-0 flex items-center gap-4">
                  <span class="shrink-0 text-accent-tip/80">
                    {{ t('textureOpt.scaled') }} <span class="ml-1 font-mono font-bold text-text-main">{{ summary.scaled_count || 0 }}</span>
                  </span>
                  <span class="shrink-0 text-accent-secondary/80">
                    {{ t('textureOpt.fallback') }} <span class="ml-1 font-mono font-bold text-text-main">{{ summary.fallback_scaled_count || 0 }}</span>
                  </span>
                  <span class="shrink-0 text-text-dim">
                    {{ t('textureOpt.originalSize') }} <span class="ml-1 font-mono font-bold text-text-main">{{ summary.keep_original_count || 0 }}</span>
                  </span>
                  <div class="min-w-0 text-text-dim">
                    {{ t('textureOpt.outOfRange') }} <span class="ml-1 font-mono font-bold text-text-main">{{ summary.skip_small_count || 0 }}</span>
                  </div>
                  <span v-if="summary.unsupported_source_count" class="shrink-0 cursor-help text-accent-warning" v-tooltip="unsupportedSummaryTooltip">
                    {{ t('textureOpt.invalidPng') }} <span class="ml-1 font-mono font-bold text-text-main">{{ summary.unsupported_source_count }}</span>
                  </span>
                  <div class="min-w-0 text-accent-danger/80">
                    {{ t('textureOpt.excluded') }} <span class="ml-1 font-mono font-bold text-text-main">{{ summary.excluded_count || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-end">
              <button @click="closeModal" class="modal-close-button" :aria-label="t('loadOrderDiff.close')">
                <X class="w-5 h-5" />
              </button>
            </div>

          </div>
        </header>

        <div class="relative flex flex-1 min-h-0">
          <section class="flex min-w-0 flex-1 flex-col border-r border-border-base/5">
            <div data-tour="texture-opt-list-toolbar" class="toolbar-surface shrink-0 px-6 py-3">
              <div class="flex items-center gap-2">

                <div class="flex items-center gap-1 rounded-lg bg-bg-overlay/5 p-1">
                  <button v-for="mode in viewModes" :key="mode.value" @click="textureStore.viewMode = mode.value" class="px-3 py-1 rounded-md text-xs font-bold transition-all"
                    :class="textureStore.viewMode === mode.value ? 'bg-bg-overlay/10 text-text-main shadow-sm' : 'text-text-dim hover:text-text-main'" >
                    {{ mode.label }}
                  </button>
                </div>
                <button class="rounded-lg border border-border-base/10 bg-bg-overlay/5 px-1 py-2 text-xs font-bold text-text-dim transition-colors hover:text-text-main"
                  @click="textureStore.isResultDrawerOpen = !textureStore.isResultDrawerOpen" >
                  {{ textureStore.isResultDrawerOpen ? t('textureOpt.hideResultPanel') : t('textureOpt.showResultPanel') }}
                </button>

                <div class="input-glass flex items-center gap-1 px-2 py-2.5 min-w-0">
                  <Search class="w-4 h-4 text-text-dim" />
                  <input v-model.trim="searchQuery" type="text" class="flex-1 min-w-0 bg-transparent text-xs text-text-main outline-none"
                    :placeholder="t('textureOpt.filterModsPlaceholder')" >
                </div>
                <CommonSelect class="w-44" v-model="sortMetric" :options="sortOptions" />
                <div class="text-xs italic text-text-dim shrink-0">{{ t('textureOpt.resultCount', { count: displayRows.length }) }}</div>
              </div>

            </div>

            <!-- 结果列表 -->
            <div data-tour="texture-opt-list" class=" relative min-h-0 flex-1 overflow-hidden">
              <div v-if="displayRows.length === 0" class="absolute inset-0 flex flex-col items-center justify-center text-text-disabled" >
                <Inbox class="mb-4 w-16 h-16 opacity-50" />
                <p>{{ t('textureOpt.noData') }}</p>
              </div>

              <DynamicScroller v-else :items="displayRows" :min-item-size="textureListMinItemSize" key-field="mod_instance_key"
                class="h-full min-h-0 px-3 py-2" v-slot="{ item, index, active }" >
                <DynamicScrollerItem :item="item" :active="active" :data-index="index" :size-dependencies="getRowSizeDependencies(item)" >
                    <div class="pb-1">
                    <TextureModCard :mod="item" :view-mode="textureStore.viewMode" :max-bytes="maxBytesInCurrentView"
                      :is-excluded="textureStore.isModExcluded(item.package_id)"
                      @toggle-mod-exclusion="handleToggleModExclusion"
                      @open-mod-menu="openTextureModMenu"
                    />
                  </div>
                </DynamicScrollerItem>
              </DynamicScroller>
            </div>

            <!-- 状态栏 -->
            <footer class="min-h-16 shrink-0 border-t border-border-base/5 bg-bg-inset/80 px-6 py-3">
              <div v-if="showProgressBlock" class="space-y-2">
                <div class="flex items-center gap-3">
                  <component :is="progressStatusIcon" class="w-4 h-4 shrink-0" :class="progressStatusIconClass" />
                  <div class="min-w-0 flex-1 overflow-hidden rounded-full bg-bg-overlay/10 h-2">
                    <div class="h-full transition-all duration-300" :class="progressBarClass" :style="{ width: `${progressDisplayPercent}%` }"></div>
                  </div>
                  <span class="shrink-0 text-xs font-mono" :class="progressPercentClass">{{ progressDisplayPercent }}%</span>
                  <span class="shrink-0 text-xs font-mono text-text-dim">{{ progressElapsedLabel }}</span>
                </div>
                <div class="flex items-center justify-between gap-3 text-xs">
                  <span class="min-w-0 truncate text-text-dim" v-tooltip="progressFullMessage">
                    {{ progressFullMessage }}
                  </span>
                  <div class="shrink-0 whitespace-nowrap text-text-dim">
                    <span v-if="progressCountLabel">{{ progressCountLabel }}</span>
                  </div>
                </div>
              </div>

              <div v-else class="flex items-center gap-2 text-xs text-text-dim">
                <CheckCircle2 class="w-4 h-4 text-accent-success" />
                {{ t('ui.ready') }}
              </div>
            </footer>
          </section>

          <!-- 选项面板 -->
          <aside class="flex w-96 shrink-0 flex-col bg-bg-surface">
            <div data-tour="texture-opt-options"  class="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-4">
              <div class="space-y-2">
                <div class="rounded-lg border p-3 text-xs"
                  :class="toolStatus.available ? 'bg-accent-success/10 border-accent-success/20 text-accent-success' : 'bg-accent-danger/10 border-accent-danger/20 text-accent-danger'">
                  <div class="font-bold">{{ toolStatus.available ? t('textureOpt.toolReady') : t('textureOpt.toolNotReady') }}</div>
                  <div class="mt-1 break-all opacity-90">{{ toolStatus.message || t('textureOpt.checkingEnv') }}</div>
                  <div v-if="toolStatus.resolved_path" class="mt-2 break-all text-xs opacity-70">{{ toolStatus.resolved_path }}</div>
                </div>

                <button v-if="!toolStatus.available && !isBusy" @click="textureStore.downloadTool()"
                  class="w-full rounded-xl bg-bg-overlay/10 py-2 text-sm font-bold transition-colors hover:bg-bg-overlay/10" >
                  {{ t('textureOpt.downloadTodds') }}
                </button>

                <section class="modal-section space-y-3 p-3">
                  <h3 class="text-xs font-black uppercase tracking-widest text-text-main">{{ t('textureOpt.scope') }}</h3>
                  <CommonSelect v-model="targetScope"
                    :options="[
                      { label: t('textureOpt.activeModsOnly'), value: 'active' },
                      { label: t('textureOpt.allInstalledMods'), value: 'all' }
                    ]"
                  />
                </section>

                <section class="modal-section space-y-2 p-3">
                  <h3 class="text-xs font-black uppercase tracking-widest text-text-main">{{ t('textureOpt.generationOptions') }}</h3>
                  <CommonSelect :label="t('textureOpt.generationScope')" v-model="config.process_mode" @change="saveConfig"
                    :description="t('textureOpt.generationScopeDesc')"
                    :options="[
                      { label: t('textureOpt.processAllOverwrite'), value: 'all_overwrite' },
                      { label: t('textureOpt.processIncremental'), value: 'all_skip_existing' },
                      { label: t('textureOpt.processScaledOnlyOverwrite'), value: 'scaled_only_overwrite' }
                    ]"
                  />
                  <CommonSelect :label="t('textureOpt.outputFormat')" v-model="config.output_format" @change="saveConfig"
                    :description="t('textureOpt.outputFormatDesc')"
                    :options="[
                      { label: 'DDS', value: 'dds' },
                      { label: 'ZSTD（Image Opt）', value: 'zstd' }
                    ]"
                  />
                  <div v-if="isZstdMode && !isImageOptEnabled" class="rounded-lg border border-accent-warning/25 bg-accent-warning/10 p-2 text-xs text-accent-warning">
                    <div class="flex items-start gap-2">
                      <AlertTriangle class="mt-0.5 size-4 shrink-0" />
                      <div class="min-w-0 flex-1">
                        <div class="font-bold">{{ isImageOptInstalled ? t('textureOpt.imageOptNotEnabled') : t('textureOpt.imageOptNotInstalled') }}</div>
                        <div class="mt-1 text-text-dim">{{ imageOptWarningText }}</div>
                      </div>
                      <button v-if="!isImageOptInstalled" class="shrink-0 rounded-md border border-accent-warning/30 px-2 py-1 font-bold text-accent-warning hover:bg-accent-warning/10"
                        @click="openImageOptWorkshop">
                        {{ t('textureOpt.openWorkshop') }}
                      </button>
                    </div>
                  </div>
                  <CommonSwitch v-if="isZstdMode" :label="t('textureOpt.cleanOldDdsAfterZstd')" :description="t('textureOpt.cleanOldDdsAfterZstdDesc')"
                    v-model="config.zstd_clean_old_dds" @change="saveConfig" mini />
                  <CommonSwitch :label="t('textureOpt.generateMipmap')" :description="t('textureOpt.generateMipmapDesc')" v-model="config.generate_mipmaps"
                    @change="saveConfig" mini />
                </section>

                <section class="modal-section space-y-3 p-3">
                  <h3 class="text-xs font-black uppercase tracking-widest text-text-main">{{ t('textureOpt.scaleTexturesTitle') }}</h3>
                  <CommonSelect :label="t('textureOpt.scaleRatio')" v-model.number="config.scale_factor" @change="saveConfig"
                    :description="t('textureOpt.scaleRatioDesc')"
                    :options="[
                      { label: t('textureOpt.noCompression'), value: 1.0 },
                      { label: '80%', value: 0.8 },
                      { label: '75%', value: 0.75 },
                      { label: '60%', value: 0.6 },
                      { label: '50%', value: 0.5 },
                      { label: '40%', value: 0.4 },
                      { label: '25%', value: 0.25 },
                      { label: '20%', value: 0.2 }
                    ]"
                  />
                  <CommonSelect :label="t('textureOpt.minClarity')" v-model.number="config.max_size" @change="saveConfig"
                    :disabled="isNoCompressionMode"
                    :description="maxSizeDescription"
                    :options="[
                      { label: '256 px', value: 256 },
                      { label: '128 px', value: 128 }
                    ]"
                  />
                  <CommonSwitch :label="t('textureOpt.skipOutOfRange')" :description="t('textureOpt.skipOutOfRangeDesc')"
                    v-model="config.skip_small_textures" @change="saveConfig" mini />
                </section>

                <section class="modal-section space-y-2 p-3">
                  <h3 class="text-xs font-black uppercase tracking-widest text-text-main">{{ t('textureOpt.cleanupNotes') }}</h3>
                  <div class=" text-xs text-text-dim">
                    {{ cleanDescription }}
                  </div>
                  <CommonSwitch :label="t('textureOpt.cleanZstd')" :description="t('textureOpt.cleanZstdDesc')"
                    v-model="cleanZstdMode" @change="saveConfig" mini />
                  <div class="grid grid-cols-2 gap-2">
                    <button type="button" class="inline-flex min-w-0 items-center justify-center gap-1 rounded-md border border-accent-warning/25 px-2 py-1 text-xs font-bold text-accent-warning transition-colors hover:bg-accent-warning/10 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="!toolStatus.available || isBusy" @click="handleCleanResidue" v-tooltip="residueCleanButtonLabel">
                      <BrushCleaning class="size-3.5 shrink-0" />
                      <span class="truncate">{{ residueCleanButtonLabel }}</span>
                    </button>
                    <button type="button" class="inline-flex min-w-0 items-center justify-center gap-1 rounded-md border border-accent-danger/25 px-2 py-1 text-xs font-bold text-accent-danger transition-colors hover:bg-accent-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="isBusy" @click="handleCleanWithoutSource" v-tooltip="orphanCleanButtonLabel">
                      <Trash2 class="size-3.5 shrink-0" />
                      <span class="truncate">{{ orphanCleanButtonLabel }}</span>
                    </button>
                  </div>
                </section>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="modal-footer shrink-0 p-4">
              <div data-tour="texture-opt-actions" class="space-y-2">
                <div class="flex gap-2">
                  <button data-tour="texture-opt-analyze" @click="handleAnalyze" :disabled="isBusy"
                    class="flex min-w-0 flex-1 basis-0 @container items-center justify-center gap-2 rounded-xl border border-accent-secondary/30 bg-accent-secondary/10 py-2.5 font-bold text-accent-secondary transition-all hover:scale-102 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    v-tooltip="t('textureOpt.scanStats')">
                    <ScanSearch class="w-4 h-4 shrink-0" />
                    <span class="min-w-0 truncate whitespace-nowrap text-[clamp(0.7rem,9cqw,1rem)]">{{ t('textureOpt.scanStats') }}</span>
                  </button>
                  <button data-tour="texture-opt-clean" @click="handleCleanGenerated" :disabled="!toolStatus.available || isBusy"
                    class="flex min-w-0 flex-1 basis-0 @container items-center justify-center gap-2 rounded-xl border border-accent-warning/30 bg-accent-warning/10 py-2.5 font-bold text-accent-warning transition-all hover:scale-102 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    v-tooltip="cleanButtonLabel">
                    <BrushCleaning class="w-4 h-4 shrink-0" />
                    <span class="min-w-0 truncate whitespace-nowrap text-[clamp(0.7rem,9cqw,1rem)]">{{ cleanButtonLabel }}</span>
                  </button>
                </div>

                <button v-if="!isBusy" data-tour="texture-opt-generate" @click="handleOptimize" :disabled="!toolStatus.available"
                  class="flex min-w-0 w-full @container items-center justify-center gap-2 rounded-xl bg-accent-primary py-3 font-black text-on-accent-primary shadow-[0_0_15px_rgba(var(--rgb-accent-cool),0.3)] transition-all hover:scale-102 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  v-tooltip="processModeLabel">
                  <Rocket class="w-5 h-5 shrink-0" />
                  <span class="min-w-0 truncate whitespace-nowrap text-[clamp(0.8rem,8cqw,1.15rem)]">{{ processModeLabel }}</span>
                </button>

                <button v-else @click="handleCancel" class="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-danger py-3 font-black text-on-accent-danger shadow-[0_0_15px_rgba(var(--rgb-accent-danger),0.3)] transition-all hover:scale-102 active:scale-95 cursor-pointer">
                  <Ban class="w-5 h-5" /> {{ t('textureOpt.stopCurrentTask') }}
                </button>
              </div>
            </div>
          </aside>

          <!-- 结果面板 -->
          <transition name="panel-slide">
            <aside v-if="textureStore.isResultDrawerOpen" class="absolute inset-y-0 right-0 z-20 flex w-md flex-col border-l border-border-base/10 bg-[linear-gradient(180deg,rgba(var(--rgb-bg-inset),0.98),rgba(var(--rgb-bg-deep),0.98))] shadow-2xl" >
              <div class="flex items-center justify-between border-b border-border-base/10 px-4 py-3">
                <div>
                  <div class="text-sm font-black tracking-wider text-text-main">{{ t('textureOpt.resultPanel') }}</div>
                  <div class="text-xs text-text-dim">{{ t('textureOpt.resultPanelDesc') }}</div>
                </div>
                <button class="rounded-lg p-1.5 text-text-dim hover:bg-bg-overlay/10 hover:text-text-main" @click="textureStore.isResultDrawerOpen = false">
                  <X class="w-4 h-4" />
                </button>
              </div>

              <div class="flex-1 space-y-4 overflow-y-auto custom-scrollbar p-4 text-xs">
                <section class="modal-section space-y-2 p-3">
                  <h3 class="font-black uppercase tracking-widest text-text-main">{{ t('textureOpt.currentStatus') }}</h3>
                  <div class="text-text-dim">{{ progressFullMessage }}</div>
                  <div class="flex items-center gap-3 text-text-dim">
                    <span>{{ progressCountLabel || t('textureOpt.noTaskProgress') }}</span>
                    <span>{{ progressElapsedLabel }}</span>
                  </div>
                </section>

                <section class="modal-section space-y-2 p-3">
                  <div class="flex items-center justify-between gap-2">
                    <h3 class="font-black uppercase tracking-widest text-text-main">{{ t('textureOpt.recentResults') }}</h3>
                    <button class="text-text-dim hover:text-text-main" @click="textureStore.loadResultHistory()">{{ t('ui.refresh') }}</button>
                  </div>
                  <div v-if="resultHistory.length === 0" class="text-text-dim">{{ t('textureOpt.noHistoryResults') }}</div>
                  <button v-for="item in resultHistory" :key="item.result_path" class="w-full rounded-lg border px-3 py-2 text-left transition-colors"
                    :class="textureStore.selectedResultPath === item.result_path ? 'border-accent-primary/30 bg-accent-primary/10 text-text-main' : 'border-border-base/10 bg-bg-overlay/5 text-text-dim hover:text-text-main'"
                    @click="textureStore.selectedResultPath = item.result_path" >
                    <div class="flex items-center justify-between gap-3">
                      <span class="font-bold">{{ item.action === 'clean_generated' ? t('textureOpt.cleanTask') : t('textureOpt.generateTask') }}</span>
                      <span class="font-mono">{{ formatDateTime(item.updated_at) }}</span>
                    </div>
                    <div class="mt-1 text-[0.8rem] opacity-80">
                      {{ t('textureOpt.historySummary', { success: item.summary?.current_output_count || 0, failed: item.failed_items?.length || 0 }) }}
                    </div>
                  </button>
                </section>

                <section class="modal-section space-y-2 p-3">
                  <div class="flex items-center justify-between gap-2">
                    <h3 class="font-black uppercase tracking-widest text-text-main">{{ t('textureOpt.failedItems') }}</h3>
                    <input v-model.trim="failedSearchQuery" type="text" :placeholder="t('textureOpt.filterFailedItems')"
                      class="input-glass w-40 px-2 py-1 text-xs text-text-main outline-none" >
                  </div>
                  <div v-if="filteredFailedItems.length === 0" class="text-text-dim">{{ t('textureOpt.noFailedItems') }}</div>
                  <div v-for="item in filteredFailedItems" :key="`${item.mod_path}-${item.rel_path}-${item.error}`" class="modal-section-subtle p-2">
                    <div class="font-bold text-text-main">{{ item.mod_name || item.package_id || t('textureOpt.unknownMod') }}</div>
                    <div class="mt-1 break-all font-mono text-text-dim">{{ item.rel_path }}</div>
                    <div class="mt-1 text-accent-warning">{{ item.error }}</div>
                    <div class="mt-2 flex justify-end gap-2">
                      <button class="rounded-lg border border-border-base/10 bg-bg-overlay/5 p-1.5 text-text-dim transition-colors hover:text-text-main"
                        @click="handleOpenTextureFile(item)" v-tooltip="t('loadOrderBackup.menu.openFile')" >
                        <FileText class="w-4 h-4" />
                      </button>
                      <button class="rounded-lg border border-border-base/10 bg-bg-overlay/5 p-1.5 text-text-dim transition-colors hover:text-text-main"
                        @click="handleOpenTextureFolder(item)" v-tooltip="t('loadOrderBackup.menu.openContainingFolder')" >
                        <FolderOpen class="w-4 h-4" />
                      </button>
                      <button v-if="getFailedItemLogPath(item)" v-tooltip="t('textureOpt.openToddsLog')"
                        class="rounded-lg border border-border-base/10 bg-bg-overlay/5 p-1.5 text-text-dim transition-colors hover:text-text-main"
                        @click="handleOpenToddsLog(item)" >
                        <ScrollText class="w-4 h-4" />
                      </button>
                      <button class="inline-flex items-center gap-1 rounded-lg border border-accent-warning/20 bg-accent-warning/10 px-2 py-1 font-bold text-accent-warning transition-colors hover:bg-accent-warning/20"
                        @click="handleAddFailedItemExclusion(item)" v-tooltip="t('textureOpt.addFileExclusion')" >
                        <Plus class="w-3.5 h-3.5" />
                        {{ t('textureOpt.excludeFile') }}
                      </button>
                    </div>
                  </div>
                </section>

                <section class="modal-section space-y-2 p-3">
                  <div class="flex items-center justify-between gap-2">
                    <h3 class="font-black uppercase tracking-widest text-text-main">{{ t('textureOpt.modExclusions') }}</h3>
                    <input v-model.trim="excludeModQuery" type="text" :placeholder="t('textureOpt.filterExcluded')"
                      class="input-glass w-40 px-2 py-1 text-xs text-text-main outline-none" >
                  </div>
                  <div v-if="filteredExcludedModRows.length === 0" class="text-text-dim">
                    {{ excludedModRows.length === 0 ? t('textureOpt.noModExclusions') : t('textureOpt.noMatchingExcludedMods') }}
                  </div>
                  <div class="max-h-48 space-y-2 overflow-y-auto custom-scrollbar">
                    <div v-for="item in filteredExcludedModRows" :key="item.package_id"
                      class="modal-section-subtle flex items-center justify-between gap-3 px-2 py-2" >
                      <div class="min-w-0">
                        <div class="truncate font-bold text-text-main">{{ item.mod_name }}</div>
                        <div class="truncate font-mono text-text-dim">{{ item.package_id }}</div>
                        <div v-if="item.mod_path" class="truncate text-[0.8rem] text-text-dim">{{ item.mod_path }}</div>
                      </div>
                      <button class="shrink-0 rounded-lg border border-accent-danger/20 bg-accent-danger/10 p-1.5 text-accent-danger transition-colors hover:bg-accent-danger/20"
                        @click="handleRemoveModExclusion(item)" v-tooltip="t('textureOpt.removeModExclusion')" >
                        <Trash2 class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </section>

                <section class="modal-section space-y-2 p-3">
                  <div class="flex items-center justify-between gap-2">
                    <h3 class="font-black uppercase tracking-widest text-text-main">{{ t('textureOpt.fileExclusions') }}</h3>
                    <input v-model.trim="excludeFileQuery" type="text" :placeholder="t('textureOpt.filterExcluded')"
                      class="input-glass w-40 px-2 py-1 text-xs text-text-main outline-none" >
                  </div>
                  <div class="flex gap-2">
                    <textarea v-model.trim="pathExclusionInput" rows="2" :placeholder="t('textureOpt.pathExclusionPlaceholder')"
                      class="input-glass min-h-12 flex-1 resize-none px-2 py-1 text-xs text-text-main outline-none" >
                    </textarea>
                    <button class="inline-flex items-center gap-1 rounded-lg border border-border-base/10 bg-bg-overlay/5 px-3 py-1 font-bold text-text-dim hover:text-text-main" @click="handleAddPathExclusion">
                      <Plus class="w-3.5 h-3.5" />
                      {{ t('textureOpt.identify') }}
                    </button>
                  </div>
                  <div v-if="filteredFileExclusionRows.length === 0" class="text-text-dim">
                    {{ fileExclusionRows.length === 0 ? t('textureOpt.noFileExclusions') : t('textureOpt.noMatchingExcludedFiles') }}
                  </div>
                  <div v-for="item in filteredFileExclusionRows" :key="`${item.mod_path}:${item.rel_path}`" class="modal-section-subtle p-2">
                    <div class="font-bold text-text-main">{{ item.mod_name }}</div>
                    <div class="mt-1 break-all font-mono text-text-main">{{ item.rel_path }}</div>
                    <div class="mt-1 break-all text-text-dim">{{ item.mod_path }}</div>
                    <div class="mt-2 flex justify-end gap-2">
                      <button class="rounded-lg border border-border-base/10 bg-bg-overlay/5 p-1.5 text-text-dim transition-colors hover:text-text-main"
                        @click="handleOpenTextureFile(item)" v-tooltip="t('loadOrderBackup.menu.openFile')" >
                        <FileText class="w-4 h-4" />
                      </button>
                      <button class="rounded-lg border border-border-base/10 bg-bg-overlay/5 p-1.5 text-text-dim transition-colors hover:text-text-main"
                        @click="handleOpenTextureFolder(item)" v-tooltip="t('loadOrderBackup.menu.openContainingFolder')" >
                        <FolderOpen class="w-4 h-4" />
                      </button>
                      <button class="rounded-lg border border-accent-danger/20 bg-accent-danger/10 p-1.5 text-accent-danger transition-colors hover:bg-accent-danger/20"
                        @click="handleRemoveFileExclusion(item)" v-tooltip="t('textureOpt.removeFileExclusion')" >
                        <Trash2 class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </aside>
          </transition>
        </div>
      </div>
  </CommonModalShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import { useNow } from '@vueuse/core'
import { AlertTriangle, Ban, BrushCleaning, CheckCircle2, Cpu, FileText, FolderOpen, Images, Inbox, Loader2, Plus, Rocket, ScanSearch, ScrollText, Search, Trash2, X } from 'lucide-vue-next'
import { useAppStore } from '../../app/stores/appStore'
import { useTextureStore } from './textureStore'
import { useModStore } from '../mod/stores/modStore'
import CommonSwitch from '../../shared/components/input/CommonSwitch.vue'
import CommonSelect from '../../shared/components/input/CommonSelect.vue'
import CommonModalShell from '../../shared/components/modal/CommonModalShell.vue'
import { useConfirmStore } from '../../shared/components/modal/confirmStore'
import { useContextMenuStore } from '../../shared/components/context-menu/contextMenuStore'
import TextureModCard from './TextureModCard.vue'
import { formatFileSize } from '../../shared/lib/format'
import { toast } from '../../shared/lib/common'

const appStore = useAppStore()
const textureStore = useTextureStore()
const modStore = useModStore()
const confirmStore = useConfirmStore()
const contextMenuStore = useContextMenuStore()
const { t } = useI18n()

const IMAGE_OPT_PACKAGE_ID = 'dev.soeur.imageopt'
const IMAGE_OPT_WORKSHOP_ID = '3543873568'

const config = computed(() => appStore.settings.texture_opt)
const summary = computed(() => textureStore.globalSummary || {})
const progressState = computed(() => textureStore.progressState)
const toolStatus = computed(() => textureStore.toolStatus)
const isBusy = computed(() => textureStore.isAnalyzing || textureStore.isOptimizing)
const isNoCompressionMode = computed(() => Math.abs(Number(config.value?.scale_factor || 1) - 1) <= 1e-6)
const isZstdMode = computed(() => String(config.value?.output_format || 'dds') === 'zstd')
const isImageOptInstalled = computed(() => (
  getInstalledMods().some(mod => String(mod?.package_id || '').trim().toLowerCase() === IMAGE_OPT_PACKAGE_ID)
))
const isImageOptEnabled = computed(() => (
  modStore.activeIds.some(id => {
    const mod = modStore.takeModById(id)
    return String(mod?.package_id || id || '').trim().toLowerCase() === IMAGE_OPT_PACKAGE_ID
  })
))
const imageOptWarningText = computed(() => (
  isImageOptInstalled.value
    ? t('textureOpt.imageOptNotEnabledDesc')
    : t('textureOpt.imageOptNotInstalledDesc')
))
const maxSizeDescription = computed(() => (
  isNoCompressionMode.value
    ? t('textureOpt.minClarityDisabledDesc')
    : t('textureOpt.minClarityDesc')
))
const cleanZstdMode = computed({
  get: () => String(config.value?.clean_output_format || 'dds') === 'zstd',
  set: value => {
    config.value.clean_output_format = value ? 'zstd' : 'dds'
  },
})
const cleanOutputFormat = computed(() => cleanZstdMode.value ? 'zstd' : 'dds')
const cleanOutputLabel = computed(() => cleanZstdMode.value ? 'ZSTD' : 'DDS')
const cleanButtonLabel = computed(() => t('textureOpt.cleanGenerated', { format: cleanOutputLabel.value }))
const residueCleanButtonLabel = computed(() => t('textureOpt.cleanResidue', { format: cleanOutputLabel.value }))
const orphanCleanButtonLabel = computed(() => t('textureOpt.deleteOrphan', { format: cleanOutputLabel.value }))
const cleanDescription = computed(() => (
  t('textureOpt.cleanDescription', { format: cleanOutputLabel.value })
))
const resultHistory = computed(() => textureStore.resultHistory)
const textureExclusions = computed(() => textureStore.textureExclusions)
const now = useNow({ interval: 1000 })
const targetScope = ref('active')
const searchQuery = ref('')
const sortMetric = ref('impact')
const failedSearchQuery = ref('')
const excludeModQuery = ref('')
const excludeFileQuery = ref('')
const pathExclusionInput = ref('')
const textureOptHelpText = computed(() => t('textureOpt.helpText'))
const textureListMinItemSize = computed(() => appStore.scalePx(101, 14))
const viewModes = computed(() => [
  { label: t('textureOpt.viewAll'), value: 'ALL' },
  { label: t('textureOpt.viewPng'), value: 'PNG' },
  { label: t('textureOpt.viewDds'), value: 'DDS' },
  { label: t('textureOpt.viewZstd'), value: 'ZSTD' },
])

const sortOptions = computed(() => [
  { label: t('textureOpt.sortImpact'), value: 'impact' },
  { label: t('textureOpt.sortPending'), value: 'pending' },
  { label: t('textureOpt.sortVram'), value: 'vram' },
  { label: t('textureOpt.sortVramSaved'), value: 'vram_saved' },
  { label: t('textureOpt.sortName'), value: 'name' },
])

const resolvedRows = computed(() => (
  textureStore.modsData.map(item => ({
    ...item,
    mod_name: resolveModName(item),
    mod_path: item.mod_path || '',
    vram_saved: Math.max(0, Number(item.source_vram_bytes_est || 0) - Number(item.output_vram_bytes_est || 0)),
  }))
))

const getViewMetricBytes = (item) => {
  if (textureStore.viewMode === 'PNG') return Number(item.source_total_bytes || 0)
  if (textureStore.viewMode === 'DDS') return Number(item.dds_output_bytes || 0)
  if (textureStore.viewMode === 'ZSTD') return Number(item.zstd_output_bytes || 0)
  return Number(item.combined_total_bytes || 0)
}

const sortRows = (rows) => {
  rows.sort((a, b) => {
    if (sortMetric.value === 'name') {
      return a.mod_name.localeCompare(b.mod_name, globalThis.__RMM_UI_FORMAT_LOCALE__ || 'zh-CN')
    }
    if (sortMetric.value === 'pending') {
      return (Number(b.generate_required_count || 0) - Number(a.generate_required_count || 0))
        || (Number(b.unsupported_source_count || 0) - Number(a.unsupported_source_count || 0))
        || (Number(b.combined_total_bytes || 0) - Number(a.combined_total_bytes || 0))
    }
    if (sortMetric.value === 'vram') {
      return Number(b.output_vram_bytes_est || 0) - Number(a.output_vram_bytes_est || 0)
    }
    if (sortMetric.value === 'vram_saved') {
      return Number(b.vram_saved || 0) - Number(a.vram_saved || 0)
    }
    const aMetric = getViewMetricBytes(a)
    const bMetric = getViewMetricBytes(b)
    return bMetric - aMetric
      || Number(b.generate_required_count || 0) - Number(a.generate_required_count || 0)
      || Number(b.unsupported_source_count || 0) - Number(a.unsupported_source_count || 0)
  })
  return rows
}

const displayRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const rows = resolvedRows.value.filter(item => {
    if (!query) return true
    return item.mod_name.toLowerCase().includes(query) || item.mod_path.toLowerCase().includes(query)
  })

  return sortRows(rows)
})

const maxBytesInCurrentView = computed(() => {
  const list = displayRows.value
  if (list.length === 0) return 1
  return list.reduce((maxBytes, item) => {
    const currentBytes = getViewMetricBytes(item)
    return Math.max(maxBytes, currentBytes)
  }, 1)
})

const getRowSizeDependencies = (item) => [
  Number(appStore.settings.ui.font_size || 14),
  textureStore.viewMode,
  String(item?.mod_name || ''),
  Number(item?.generate_required_count || 0),
  Number(item?.unsupported_source_count || 0),
  JSON.stringify(item?.scale_breakdown || []),
  Number(item?.source_total_count || 0),
  Number(item?.output_total_count || 0),
  Number(item?.source_total_bytes || 0),
  Number(item?.output_total_bytes || 0),
  Number(item?.dds_output_bytes || 0),
  Number(item?.zstd_output_bytes || 0),
]
const unsupportedSummaryTooltip = computed(() => {
  const preview = Array.isArray(summary.value.engine_unsupported_preview) ? summary.value.engine_unsupported_preview : []
  if (!preview.length) return t('textureOpt.invalidPngTooltip')
  return [
    t('textureOpt.invalidPngExcludedListTitle'),
    ...preview.map(item => `${item.mod_name} / ${item.rel_path}${item.reason ? ` - ${item.reason}` : ''}`),
  ].join('\n')
})

const processedCount = computed(() => {
  const details = progressState.value.details || {}
  return Number((details.phase_done ?? details.done ?? details.processed_mods) || 0)
})

const totalCount = computed(() => {
  const details = progressState.value.details || {}
  return Number((details.phase_total ?? details.total ?? details.total_mods) || 0)
})

const progressPhaseLabel = computed(() => {
  const details = progressState.value.details || {}
  return String(details.phase_label || '')
})

const processModeLabel = computed(() => {
  if (config.value.process_mode === 'all_overwrite') return t('textureOpt.processAllOverwrite')
  if (config.value.process_mode === 'all_skip_existing') return t('textureOpt.processIncremental')
  return t('textureOpt.processScaledOnly')
})

const progressCountLabel = computed(() => {
  if (!totalCount.value) return ''
  const details = progressState.value.details || {}
  const unit = String(details.phase_unit || (details.total_mods != null || details.processed_mods != null ? t('textureOpt.unitMods') : t('textureOpt.unitItems')))
  const phase = progressPhaseLabel.value ? `${progressPhaseLabel.value} ` : ''
  return `${phase}${processedCount.value}/${totalCount.value} ${unit}`
})

const progressFullMessage = computed(() => String(progressState.value.message || t('textureOpt.processing')))
const showProgressBlock = computed(() => isBusy.value || showFinishedProgress.value)
const progressDisplayPercent = computed(() => {
  if (showFinishedProgress.value) return 100
  const details = progressState.value.details || {}
  return Number((progressState.value.percent ?? details.phase_percent) || 0)
})
const progressStatusIcon = computed(() => (showFinishedProgress.value ? CheckCircle2 : Loader2))
const progressStatusIconClass = computed(() => (showFinishedProgress.value ? 'text-accent-success' : 'text-accent-primary animate-spin'))
const progressBarClass = computed(() => (showFinishedProgress.value ? 'bg-accent-success' : 'bg-accent-primary'))
const progressPercentClass = computed(() => (showFinishedProgress.value ? 'text-accent-success' : 'text-accent-primary'))

const progressElapsedLabel = computed(() => {
  const details = progressState.value.details || {}
  const startedAt = Number(details.local_started_at || 0)
  if (!startedAt) return '--:--'
  const totalElapsed = Number(details.local_total_elapsed_ms || 0)
  const isTerminal = ['success', 'failed', 'cancelled'].includes(String(details.local_status || ''))
  if (isTerminal && totalElapsed > 0) {
    return t('textureOpt.totalElapsed', { time: formatDuration(totalElapsed) })
  }
  return t('textureOpt.elapsed', { time: formatDuration(Math.max(0, Number(now.value) - startedAt)) })
})

const showFinishedProgress = computed(() => {
  const status = String(progressState.value.details?.local_status || '')
  return ['success', 'failed', 'cancelled'].includes(status)
})

const selectedHistoryResult = computed(() => (
  resultHistory.value.find(item => item.result_path === textureStore.selectedResultPath) || resultHistory.value[0] || null
))

const currentFailedItems = computed(() => {
  const liveItems = Array.isArray(progressState.value.details?.failed_items) ? progressState.value.details.failed_items : []
  if (isBusy.value) return liveItems
  if (selectedHistoryResult.value) return selectedHistoryResult.value.failed_items || []
  return liveItems
})

const filteredFailedItems = computed(() => {
  const query = failedSearchQuery.value.trim().toLowerCase()
  return currentFailedItems.value.filter(item => {
    if (!query) return true
    return (
      String(item.mod_name || '').toLowerCase().includes(query)
      || String(item.rel_path || '').toLowerCase().includes(query)
      || String(item.error || '').toLowerCase().includes(query)
    )
  })
})

const normalizePackageKey = (value) => String(value || '').trim().toLowerCase()
const normalizePathKey = (value) => String(value || '').trim().replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
const stripPathQuotes = (value) => String(value || '').trim().replace(/^[\s"'`“”‘’]+|[\s"'`“”‘’]+$/g, '')
const getInstalledMods = () => Array.from(modStore.allModsMap instanceof Map ? modStore.allModsMap.values() : [])

const resolvedRowByPackageId = computed(() => {
  const map = new Map()
  for (const row of resolvedRows.value) {
    const key = normalizePackageKey(row.package_id)
    if (key && !map.has(key)) map.set(key, row)
  }
  return map
})

const resolvedRowByModPath = computed(() => {
  const map = new Map()
  for (const row of resolvedRows.value) {
    const key = normalizePathKey(row.mod_path)
    if (key && !map.has(key)) map.set(key, row)
  }
  return map
})

const installedModByPackageId = computed(() => {
  const map = new Map()
  for (const mod of getInstalledMods()) {
    const key = normalizePackageKey(mod?.package_id)
    if (key && !map.has(key)) map.set(key, mod)
  }
  return map
})

const installedModByPath = computed(() => {
  const map = new Map()
  for (const mod of getInstalledMods()) {
    const key = normalizePathKey(mod?.path)
    if (key && !map.has(key)) map.set(key, mod)
  }
  return map
})

const pathExclusionCandidates = computed(() => {
  const rows = []
  const seen = new Set()
  const pushCandidate = (item) => {
    const modPath = String(item?.mod_path || item?.path || '').trim()
    const key = normalizePathKey(modPath)
    if (!key || seen.has(key)) return
    seen.add(key)
    rows.push({
      mod_path: modPath,
      package_id: item?.package_id || '',
      mod_name: item?.mod_name || item?.alias_name || item?.display_name || item?.name || item?.package_id || t('textureOpt.unknownMod'),
    })
  }
  resolvedRows.value.forEach(pushCandidate)
  getInstalledMods().forEach(pushCandidate)
  return rows.sort((left, right) => normalizePathKey(right.mod_path).length - normalizePathKey(left.mod_path).length)
})

const excludedModRows = computed(() => {
  const rows = []
  const seen = new Set()
  for (const item of textureExclusions.value.mods || []) {
    const packageId = String(item?.package_id || '').trim()
    const key = normalizePackageKey(packageId)
    if (!key || seen.has(key)) continue
    seen.add(key)
    const statsRow = resolvedRowByPackageId.value.get(key)
    const installedMod = installedModByPackageId.value.get(key)
    rows.push({
      ...item,
      package_id: packageId,
      mod_name: statsRow?.mod_name || installedMod?.alias_name || installedMod?.display_name || installedMod?.name || packageId,
      mod_path: statsRow?.mod_path || installedMod?.path || '',
    })
  }
  return rows.sort((left, right) => String(left.mod_name || '').localeCompare(String(right.mod_name || ''), globalThis.__RMM_UI_FORMAT_LOCALE__ || 'zh-CN'))
})

const filteredExcludedModRows = computed(() => {
  const query = excludeModQuery.value.trim().toLowerCase()
  return excludedModRows.value.filter(item => {
    if (!query) return true
    return (
      String(item.mod_name || '').toLowerCase().includes(query)
      || String(item.package_id || '').toLowerCase().includes(query)
      || String(item.mod_path || '').toLowerCase().includes(query)
    )
  })
})

const fileExclusionRows = computed(() => {
  const rows = []
  const seen = new Set()
  for (const item of textureExclusions.value.files || []) {
    const modPath = String(item?.mod_path || '').trim()
    const relPath = String(item?.rel_path || '').trim().replace(/\\/g, '/').replace(/^\/+/, '')
    const key = `${normalizePathKey(modPath)}:${relPath.toLowerCase()}`
    if (!modPath || !relPath || seen.has(key)) continue
    seen.add(key)
    const modKey = normalizePathKey(modPath)
    const statsRow = resolvedRowByModPath.value.get(modKey)
    const installedMod = installedModByPath.value.get(modKey)
    rows.push({
      ...item,
      mod_path: modPath,
      rel_path: relPath,
      file_path: buildTextureFilePath(modPath, relPath),
      mod_name: statsRow?.mod_name || installedMod?.alias_name || installedMod?.display_name || installedMod?.name || installedMod?.package_id || t('textureOpt.unknownMod'),
    })
  }
  return rows.sort((left, right) => (
    String(left.mod_name || '').localeCompare(String(right.mod_name || ''), globalThis.__RMM_UI_FORMAT_LOCALE__ || 'zh-CN')
    || String(left.rel_path || '').localeCompare(String(right.rel_path || ''), globalThis.__RMM_UI_FORMAT_LOCALE__ || 'zh-CN')
  ))
})

const filteredFileExclusionRows = computed(() => {
  const query = excludeFileQuery.value.trim().toLowerCase()
  return fileExclusionRows.value.filter(item => {
    if (!query) return true
    return (
      String(item.mod_name || '').toLowerCase().includes(query)
      || String(item.rel_path || '').toLowerCase().includes(query)
      || String(item.mod_path || '').toLowerCase().includes(query)
    )
  })
})

const closeModal = () => {
  appStore.uiState.showTextureOptModal = false
}

const saveConfig = async () => {
  await appStore.saveSetting('texture_opt', config.value)
  await textureStore.checkToolStatus()
}

const getTargetIds = () => {
  if (targetScope.value === 'active') {
    return modStore.activeIds
  }
  return Array.from(modStore.allModsMap.values())
    .filter(mod => !mod.isMissing && mod.path)
    .map(mod => mod.package_id)
}

const warnImageOptIfNeeded = () => {
  if (isZstdMode.value && !isImageOptEnabled.value) {
    toast.warning(t('textureOpt.imageOptActiveMissingWarning'))
  }
}

const handleAnalyze = async () => {
  const ids = getTargetIds()
  await textureStore.startAnalysis(ids, targetScope.value)
}

const handleOptimize = async () => {
  warnImageOptIfNeeded()
  const ids = getTargetIds()
  await textureStore.startOptimization(ids, 'optimize', targetScope.value)
}

const handleCleanGenerated = async () => {
  const ids = getTargetIds()
  await textureStore.startOptimization(ids, 'clean_generated', targetScope.value, {
    clean_output_format: cleanOutputFormat.value,
  })
}

const handleCleanResidue = async () => {
  const ids = getTargetIds()
  await textureStore.startOptimization(ids, 'clean_generated', targetScope.value, {
    clean_uninstalled_residue_only: true,
    clean_output_format: cleanOutputFormat.value,
  })
}

const handleCleanWithoutSource = async () => {
  const ok = await confirmStore.confirmAction(
    t('textureOpt.deleteOrphan', { format: cleanOutputLabel.value }),
    t('textureOpt.deleteOrphanConfirmMessage', { format: cleanOutputLabel.value }),
    {
      type: 'error',
      confirmText: t('textureOpt.confirmDelete'),
      cancelText: t('common.cancel'),
    },
  )
  if (!ok) return
  const ids = getTargetIds()
  await textureStore.startOptimization(ids, 'clean_generated', targetScope.value, {
    clean_output_format: cleanOutputFormat.value,
    clean_without_source: true,
  })
}

const buildSingleModTarget = (item) => ({
  mod_path: String(item?.mod_path || ''),
  mod_name: String(item?.mod_name || ''),
  package_id: String(item?.package_id || ''),
  store: String(item?.store || ''),
  path_hash: String(item?.path_hash || ''),
  mod_instance_key: String(item?.mod_instance_key || item?.path_hash || item?.mod_path || ''),
})

const getSingleTargetIds = (item) => {
  const packageId = String(item?.package_id || '').trim()
  return packageId ? [packageId] : []
}

const handleOptimizeSingleMod = async (item) => {
  if (!item?.mod_path) return
  warnImageOptIfNeeded()
  await textureStore.startOptimization(getSingleTargetIds(item), 'optimize', 'single', {
    single_mod_target: buildSingleModTarget(item),
  })
}

const handleAnalyzeSingleMod = async (item) => {
  if (!item?.mod_path) return
  await textureStore.startAnalysis(getSingleTargetIds(item), 'single', {
    single_mod_target: buildSingleModTarget(item),
  })
}

const handleCleanSingleMod = async (item, outputFormat = cleanOutputFormat.value) => {
  if (!item?.mod_path) return
  await textureStore.startOptimization(getSingleTargetIds(item), 'clean_generated', 'single', {
    clean_uninstalled_residue_only: false,
    clean_output_format: outputFormat,
    single_mod_target: buildSingleModTarget(item),
  })
}

const handleCleanSingleModWithoutSource = async (item, outputFormat = cleanOutputFormat.value) => {
  if (!item?.mod_path) return
  const outputLabel = outputFormat === 'zstd' ? 'ZSTD' : 'DDS'
  const ok = await confirmStore.confirmAction(
    t('textureOpt.deleteOrphan', { format: outputLabel }),
    t('textureOpt.deleteSingleOrphanConfirmMessage', { mod: item.mod_name || t('textureOpt.currentMod'), format: outputLabel }),
    { type: 'error', confirmText: t('textureOpt.confirmDelete'), cancelText: t('common.cancel') },
  )
  if (!ok) return
  await textureStore.startOptimization(getSingleTargetIds(item), 'clean_generated', 'single', {
    clean_output_format: outputFormat,
    clean_without_source: true,
    single_mod_target: buildSingleModTarget(item),
  })
}

const openTextureModMenu = (event, item) => {
  contextMenuStore.open(event, [
    { label: t('textureOpt.refreshModStats'), icon: ScanSearch, disabled: isBusy.value || !item?.mod_path, action: () => handleAnalyzeSingleMod(item) },
    { label: t('textureOpt.generateCurrentConfig', { format: isZstdMode.value ? 'ZSTD' : 'DDS' }), icon: Rocket, disabled: isBusy.value || !toolStatus.value.available || !item?.mod_path, action: () => handleOptimizeSingleMod(item) },
    {
      label: t('textureOpt.cleanGeneratedMenu'),
      icon: BrushCleaning,
      disabled: isBusy.value || !toolStatus.value.available || !item?.mod_path,
      children: [
        { label: t('textureOpt.cleanOnlyFormat', { format: 'DDS' }), icon: BrushCleaning, action: () => handleCleanSingleMod(item, 'dds') },
        { label: t('textureOpt.cleanOnlyFormat', { format: 'ZSTD' }), icon: BrushCleaning, action: () => handleCleanSingleMod(item, 'zstd') },
      ],
    },
    {
      label: t('textureOpt.deleteOrphanMenu'),
      icon: Trash2,
      level: 'danger',
      disabled: isBusy.value || !item?.mod_path,
      children: [
        { label: t('textureOpt.deleteOnlyOrphanFormat', { format: 'DDS' }), icon: Trash2, level: 'danger', action: () => handleCleanSingleModWithoutSource(item, 'dds') },
        { label: t('textureOpt.deleteOnlyOrphanFormat', { format: 'ZSTD' }), icon: Trash2, level: 'danger', action: () => handleCleanSingleModWithoutSource(item, 'zstd') },
      ],
    },
    { divider: true },
    { label: textureStore.isModExcluded(item?.package_id) ? t('textureOpt.cancelExcludeMod') : t('textureOpt.excludeMod'), icon: Ban, disabled: !item?.package_id, action: () => handleToggleModExclusion(item) },
    { label: t('textureOpt.openModDirectory'), icon: FolderOpen, disabled: !item?.mod_path, action: () => appStore.openPath(item.mod_path) },
  ], item)
}

const openImageOptWorkshop = () => {
  appStore.openSteamWorkshopById(IMAGE_OPT_WORKSHOP_ID)
}

const handleCancel = async () => {
  await textureStore.cancelCurrentTask()
}

watch(() => appStore.uiState.showTextureOptModal, (visible) => {
  if (visible) {
    textureStore.checkToolStatus()
    textureStore.loadResultHistory()
    textureStore.loadExclusions()
  }
})

const handleToggleModExclusion = async (item) => {
  if (!item?.package_id) return
  await textureStore.toggleModExclusion(item.package_id, !textureStore.isModExcluded(item.package_id))
}

const handleRemoveModExclusion = async (item) => {
  if (!item?.package_id) return
  await textureStore.toggleModExclusion(item.package_id, false)
}

const handleAddFailedItemExclusion = async (item) => {
  if (!item?.mod_path || !item?.rel_path) return
  await textureStore.toggleFileExclusion(item.mod_path, item.rel_path, true)
}

const handleRemoveFileExclusion = async (item) => {
  if (!item?.mod_path || !item?.rel_path) return
  await textureStore.toggleFileExclusion(item.mod_path, item.rel_path, false)
}

const handleOpenTextureFile = async (item) => {
  const filePath = item?.file_path || buildTextureFilePath(item?.mod_path, item?.rel_path)
  if (!filePath) return
  await appStore.openFile(filePath)
}

const handleOpenTextureFolder = async (item) => {
  const filePath = item?.file_path || buildTextureFilePath(item?.mod_path, item?.rel_path)
  if (!filePath) return
  await appStore.openPath(filePath)
}

const handleOpenToddsLog = async (item) => {
  const logPath = getFailedItemLogPath(item)
  if (!logPath) return
  await appStore.openFile(logPath)
}

const handleAddPathExclusion = async () => {
  const rawPaths = String(pathExclusionInput.value || '')
    .split(/\r?\n/)
    .map(stripPathQuotes)
    .filter(Boolean)
  if (rawPaths.length === 0) return

  let addedCount = 0
  let unmatchedCount = 0
  for (const rawPath of rawPaths) {
    const matched = resolvePastedTexturePath(rawPath)
    if (!matched) {
      unmatchedCount += 1
      continue
    }
    const ok = await textureStore.toggleFileExclusion(matched.mod_path, matched.rel_path, true)
    if (ok) addedCount += 1
  }

  if (addedCount > 0) {
    pathExclusionInput.value = ''
  }
  if (unmatchedCount > 0) {
    toast.warning(t('textureOpt.unmatchedPaths', { count: unmatchedCount }))
  }
}

function getFailedItemLogPath(item) {
  return String(
    item?.todds_log_path
    || progressState.value.details?.todds_log_path
    || selectedHistoryResult.value?.todds_log_path
    || ''
  ).trim()
}

function resolveModName(item) {
  const match = Array.from(modStore.allModsMap.values()).find(mod => mod?.path === item.mod_path)
  return match?.alias_name || match?.display_name || match?.name || item.mod_name || t('textureOpt.unknownMod')
}

function buildTextureFilePath(modPath, relPath) {
  const root = String(modPath || '').trim().replace(/\\/g, '/').replace(/\/+$/, '')
  const rel = String(relPath || '').trim().replace(/\\/g, '/').replace(/^\/+/, '')
  if (!root) return rel
  if (!rel) return root
  return `${root}/${rel}`
}

function resolvePastedTexturePath(rawPath) {
  const normalizedPath = normalizePathKey(rawPath)
  const matchedMod = pathExclusionCandidates.value.find(item => {
    const root = normalizePathKey(item.mod_path)
    return root && (normalizedPath === root || normalizedPath.startsWith(`${root}/`))
  })
  if (!matchedMod?.mod_path) return null

  const normalizedRoot = String(matchedMod.mod_path || '').trim().replace(/\\/g, '/').replace(/\/+$/, '')
  const normalizedRaw = String(rawPath || '').trim().replace(/\\/g, '/')
  const relPath = normalizedRaw.slice(normalizedRoot.length).replace(/^\/+/, '')
  if (!relPath) return null
  return {
    mod_path: matchedMod.mod_path,
    rel_path: relPath,
  }
}


function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatDateTime(value) {
  const ts = Number(value || 0)
  if (!ts) return '--'
  return new Date(ts).toLocaleString()
}

</script>

<style scoped>
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  transform: translateX(1.5rem);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 0.375rem;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--color-border-strong);
  border-radius: 0.625rem;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--color-accent-primary);
}
</style>
