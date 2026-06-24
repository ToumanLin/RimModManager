import { computed, ref, watch } from 'vue'
import { t } from '../../../app/i18n'

const EMPTY_MISSING_INSTALL_SUMMARY = {
  dangerTotal: 0,
  warnTotal: 0,
  infoTotal: 0,
  unknownTotal: 0,
  actionableTotal: 0,
  visibleEntryTotal: 0,
}

export function useModListQuickActions({
  props,
  profileStore,
  supplementStore,
  missingInstallStore,
  issuesSummary,
  missingFileIssueType,
}) {
  const missingInstallSummary = ref({ ...EMPTY_MISSING_INSTALL_SUMMARY })
  let missingInstallSummarySeq = 0

  const refreshMissingInstallSummary = async () => {
    const seq = ++missingInstallSummarySeq
    if (props.listId !== 'active') {
      missingInstallSummary.value = { ...EMPTY_MISSING_INSTALL_SUMMARY }
      return
    }
    const summary = await missingInstallStore.getSummaryForActiveList(props.modelValue)
    if (seq !== missingInstallSummarySeq) return
    missingInstallSummary.value = summary
  }

  watch(
    () => [props.listId, props.modelValue.join('|'), profileStore.activeContext?.game_version || ''],
    () => { refreshMissingInstallSummary() },
    { immediate: true }
  )

  const missingInstallTooltip = computed(() => {
    if ((missingInstallSummary.value.dangerTotal || 0) + (missingInstallSummary.value.warnTotal || 0) + (missingInstallSummary.value.unknownTotal || 0) === 0) {
      return t('modListQuickActions.noMissingInstallItems')
    }
    const lines = []
    if (missingInstallSummary.value.dangerTotal > 0) {
      lines.push(t('modListQuickActions.dangerCountMarkup', { count: missingInstallSummary.value.dangerTotal }))
    } else if (missingInstallSummary.value.unknownTotal > 0) {
      lines.push(t('modListQuickActions.unknownCountMarkup', { count: missingInstallSummary.value.unknownTotal }))
    } else if (missingInstallSummary.value.warnTotal > 0) {
      lines.push(t('modListQuickActions.warnCountMarkup', { count: missingInstallSummary.value.warnTotal }))
    }
    if (missingInstallSummary.value.dangerTotal > 0) lines.push(t('modListQuickActions.requiredLine', { count: missingInstallSummary.value.dangerTotal }))
    if (missingInstallSummary.value.warnTotal > 0) lines.push(t('modListQuickActions.warningLine', { count: missingInstallSummary.value.warnTotal }))
    if (missingInstallSummary.value.unknownTotal > 0) lines.push(t('modListQuickActions.unknownLine', { count: missingInstallSummary.value.unknownTotal }))
    lines.push('')
    lines.push(t('modListQuickActions.openMissingInstallDialog'))
    return lines.join('\n')
  })

  const missingInstallButtonClass = computed(() => {
    if (missingInstallSummary.value.dangerTotal > 0 || missingInstallSummary.value.unknownTotal > 0) {
      return 'bg-accent-danger/80 text-text-disabled hover:bg-accent-danger hover:text-text-main'
    }
    const hasWarnOnly = missingInstallSummary.value.warnTotal > 0
      && missingInstallSummary.value.dangerTotal === 0
      && missingInstallSummary.value.unknownTotal === 0
    if (hasWarnOnly) return 'bg-accent-warn/80 text-text-disabled hover:bg-accent-warn hover:text-text-main'
    return 'bg-accent-primary/80 text-text-disabled hover:bg-accent-primary hover:text-text-main'
  })

  const supplementSummary = computed(() => {
    if (props.listId !== 'active') {
      return { groups: [], count: 0, dangerCount: 0, warnCount: 0, infoCount: 0, visibleCount: 0, urgency: 'none' }
    }
    return supplementStore.getSuggestionSummary(props.modelValue)
  })

  const supplementButtonClass = computed(() => {
    if (supplementSummary.value.urgency === 'danger') {
      return 'bg-accent-danger/80 text-text-disabled hover:bg-accent-danger hover:text-text-main'
    }
    if (supplementSummary.value.urgency === 'warn') {
      return 'bg-accent-warn/80 text-text-disabled hover:bg-accent-warn hover:text-text-main'
    }
    return 'bg-accent-warn/80 text-text-disabled hover:bg-accent-warn hover:text-text-main'
  })

  const supplementTooltip = computed(() => {
    if (supplementSummary.value.visibleCount === 0) return t('modListQuickActions.noSupplementItems')
    const groupLines = supplementSummary.value.groups
      .filter(group => group.severity !== 'info')
      .map(group => t('modListQuickActions.groupLine', { title: group.title, count: group.count }))
      .join('\n')
    const lines = []
    if (supplementSummary.value.dangerCount > 0) {
      lines.push(t('modListQuickActions.dangerCountMarkup', { count: supplementSummary.value.dangerCount }))
    } else if (supplementSummary.value.warnCount > 0) {
      lines.push(t('modListQuickActions.warnCountMarkup', { count: supplementSummary.value.warnCount }))
    }
    lines.push(t('modListQuickActions.supplementFound', { count: supplementSummary.value.visibleCount }))
    if (supplementSummary.value.dangerCount > 0) lines.push(t('modListQuickActions.requiredSupplementLine', { count: supplementSummary.value.dangerCount }))
    if (supplementSummary.value.warnCount > 0) lines.push(t('modListQuickActions.suggestedSupplementLine', { count: supplementSummary.value.warnCount }))
    if (groupLines) lines.push(groupLines)
    lines.push('')
    lines.push(t('modListQuickActions.openSupplementDialog'))
    return lines.join('\n')
  })

  const invalidModsToRemove = computed(() => (
    issuesSummary.value.stats[missingFileIssueType] || []
  ))

  const openMissingInstallDialog = async () => {
    await missingInstallStore.openForActiveList(props.modelValue)
  }

  const openSupplementDialog = async () => {
    if (props.listId !== 'active') return
    await supplementStore.openForActiveList({
      activeIds: props.modelValue,
      message: t('modListQuickActions.selectModsToEnable'),
    })
  }

  return {
    missingInstallSummary,
    missingInstallTooltip,
    missingInstallButtonClass,
    supplementSummary,
    supplementTooltip,
    supplementButtonClass,
    invalidModsToRemove,
    openMissingInstallDialog,
    openSupplementDialog,
  }
}
