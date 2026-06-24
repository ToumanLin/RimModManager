import { getAllCommands } from './commandRegistry'
import { normalizeKeybindingList } from './keybindingParser'
import { t } from '../../app/i18n'

export const createDefaultKeybindingConfig = () => ({
  version: 1,
  bindings: {},
  disabledDefaults: {},
})

export const normalizeKeybindingConfig = (config = {}) => {
  // 后端只保存用户覆盖项；前端读取时统一补齐结构，避免设置页和运行时各自兜底。
  const source = config && typeof config === 'object' ? config : {}
  const bindings = {}
  Object.entries(source.bindings || {}).forEach(([commandId, values]) => {
    bindings[commandId] = normalizeKeybindingList(values)
  })
  return {
    version: Number(source.version || 1),
    bindings,
    disabledDefaults: { ...(source.disabledDefaults || {}) },
  }
}

export const getCommandEffectiveKeys = (command, config = {}) => {
  const normalizedConfig = normalizeKeybindingConfig(config)
  const hasUserBinding = Object.prototype.hasOwnProperty.call(normalizedConfig.bindings, command.id)
  // 用户一旦设置过某个命令，就完全接管它的可编辑默认键位；锁定键永远保留。
  const editableKeys = hasUserBinding
    ? normalizedConfig.bindings[command.id]
    : (normalizedConfig.disabledDefaults[command.id] ? [] : command.defaultKeys)
  return normalizeKeybindingList([...(command.lockedKeys || []), ...(editableKeys || [])])
}

export const getCommandDisplayKeys = (command, config = {}) => {
  return normalizeKeybindingList([...(getCommandEffectiveKeys(command, config) || []), ...(command.displayKeys || [])])
}

export const buildEffectiveKeybindingMap = (commandList = getAllCommands(), config = {}) => {
  const map = new Map()
  commandList.forEach(command => {
    map.set(command.id, getCommandEffectiveKeys(command, config))
  })
  return map
}

const buildConflictKeybindingMap = (commandList = getAllCommands(), config = {}) => {
  const map = new Map()
  commandList.forEach(command => {
    map.set(command.id, getCommandDisplayKeys(command, config))
  })
  return map
}

const scopesAreRelated = (left = 'global', right = 'global') => {
  if (left === right) return true
  if (left === 'global' || right === 'global') return true
  return left.startsWith(`${right}:`) || right.startsWith(`${left}:`)
}

const classifyConflict = (left, right, keybinding) => {
  // 锁定键和展示键通常代表固定交互，重复时优先提示为严重问题。
  const locked = [left.lockedKeys, left.displayKeys, right.lockedKeys, right.displayKeys]
    .some(keys => (keys || []).includes(keybinding))
  if (locked) {
    return {
      level: 'critical',
      message: t('settings.keybindings.conflictLocked'),
    }
  }
  if (left.scope === right.scope) {
    return {
      level: 'critical',
      message: t('settings.keybindings.conflictSameScope'),
    }
  }
  if (left.scope === 'global' || right.scope === 'global') {
    return {
      level: 'high',
      message: t('settings.keybindings.conflictGlobalScope'),
    }
  }
  if (scopesAreRelated(left.scope, right.scope)) {
    return {
      level: 'medium',
      message: t('settings.keybindings.conflictRelatedScope'),
    }
  }
  return {
    level: 'medium',
    message: t('settings.keybindings.conflictDifferentScope'),
  }
}

export const detectKeybindingConflicts = (commandList = getAllCommands(), config = {}) => {
  // 冲突检测包含 displayKeys，用于把 Alt+左键这类固定手势也展示到设置页提示中。
  const effectiveMap = buildConflictKeybindingMap(commandList, config)
  const conflicts = []
  for (let leftIndex = 0; leftIndex < commandList.length; leftIndex += 1) {
    const left = commandList[leftIndex]
    const leftKeys = effectiveMap.get(left.id) || []
    for (let rightIndex = leftIndex + 1; rightIndex < commandList.length; rightIndex += 1) {
      const right = commandList[rightIndex]
      const rightKeys = effectiveMap.get(right.id) || []
      leftKeys.forEach(keybinding => {
        if (!rightKeys.includes(keybinding)) return
        const detail = classifyConflict(left, right, keybinding)
        conflicts.push({
          keybinding,
          level: detail.level,
          message: detail.message,
          commandIds: [left.id, right.id],
          commandTitles: [left.title, right.title],
          scopes: [left.scope, right.scope],
        })
      })
    }
  }
  return conflicts
}
