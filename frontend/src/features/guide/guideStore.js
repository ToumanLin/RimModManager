// -----------------------------------------------------------------
// 新手引导 Store
// -----------------------------------------------------------------
// 这里集中维护：
// 1. 各教程入口的元数据
// 2. 启动前的场景检查
// 3. driver.js 的统一执行与完成标记
import { defineStore } from 'pinia'
import { useAppStore } from '../../app/stores/appStore'
import { useAiStore } from '../ai/aiStore'
import { useModStore } from '../mod/stores/modStore'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { t, translateText } from '../../app/i18n'
import {
  GUIDE_VERSION,
  mainGuideSteps,
  workflowGuideSteps,
  modListGuideSteps,
  issueGuideSteps,
  profileGuideSteps,
  backupGuideSteps,
  workspaceGuideSteps,
  workshopBrowserGuideSteps,
  collectionGuideSteps,
  githubGuideSteps,
  ruleCenterGuideSteps,
  conflictGuideSteps,
  textureOptGuideSteps,
  aiConfigGuideSteps,
  aiReviewGuideSteps,
  logAnalysisGuideSteps,
} from './guideConfig'
import { useToast } from 'vue-toastification'

// -----------------------------------------------------------------
// 引导定义 (Guide Definitions)
// -----------------------------------------------------------------
export const allGuides = [
  {
    key: 'main',
    // zh: 主界面快速上手 / 了解软件的基本功能及功能分布，还有一些常用操作。
    titleKey: 'guide.definitions.main.title',
    descriptionKey: 'guide.definitions.main.description',
    steps: mainGuideSteps
  },
  {
    key: 'workflow',
    // zh: 主线操作闭环 / 掌握 刷新 -> 排序 -> 保存 -> 启动 的标准流程。
    titleKey: 'guide.definitions.workflow.title',
    descriptionKey: 'guide.definitions.workflow.description',
    steps: workflowGuideSteps,
  },
  {
    key: 'modList',
    // zh: 模组列表快速上手 / 了解如何在模组列表中查看、启用、禁用、搜索模组。
    titleKey: 'guide.definitions.modList.title',
    descriptionKey: 'guide.definitions.modList.description',
    steps: modListGuideSteps
  },
  {
    key: 'issues',
    // zh: 问题处理与一键修复 / 学会看问题汇总、快速补缺失项和逐项排查。
    titleKey: 'guide.definitions.issues.title',
    descriptionKey: 'guide.definitions.issues.description',
    steps: issueGuideSteps,
  },
  {
    key: 'backup',
    // zh: 备份管理快速上手 / 了解如何备份和管理排序文件。
    titleKey: 'guide.definitions.backup.title',
    descriptionKey: 'guide.definitions.backup.description',
    steps: backupGuideSteps
  },
  {
    key: 'profile',
    // zh: 环境管理快速上手 / 了解如何管理游戏环境、路径设置和其他相关配置。
    titleKey: 'guide.definitions.profile.title',
    descriptionKey: 'guide.definitions.profile.description',
    steps: profileGuideSteps
  },
  {
    key: 'rules',
    // zh: 规则中心快速上手 / 了解规则来源、优先级、动态规则与全局启停。
    titleKey: 'guide.definitions.rules.title',
    descriptionKey: 'guide.definitions.rules.description',
    steps: ruleCenterGuideSteps,
    beforeStart: () => {
      const appStore = useAppStore();
      appStore.uiState.showRuleDrawer = true;
    }
  },
  {
    key: 'textureOpt',
    // zh: 贴图优化快速上手 / 了解贴图优化中心的统计含义、生成/清理规则，以及 todds 的基本使用方式。
    titleKey: 'guide.definitions.textureOpt.title',
    descriptionKey: 'guide.definitions.textureOpt.description',
    steps: textureOptGuideSteps,
  },
  {
    key: 'aiConfig',
    // zh: AI 配置快速上手 / 了解如何启用 AI、配置接口并完成连通性测试。
    titleKey: 'guide.definitions.aiConfig.title',
    descriptionKey: 'guide.definitions.aiConfig.description',
    steps: aiConfigGuideSteps,
    beforeStart: () => {
      const appStore = useAppStore();
      appStore.openSettingsPanel();
    }
  },
  {
    key: 'aiReview',
    // zh: AI 结果检阅 / 了解如何复核批量生成结果、单项修订并统一写回。
    titleKey: 'guide.definitions.aiReview.title',
    descriptionKey: 'guide.definitions.aiReview.description',
    steps: aiReviewGuideSteps,
    beforeStart: () => {
      const appStore = useAppStore();
      const aiStore = useAiStore();
      const hasResults = aiStore.modAliasReviewItemCount > 0;
      if (!hasResults) return false;
      appStore.uiState.showModAliasReviewModal = false;
      return true;
    }
  },
  {
    key: 'logAnalysis',
    // zh: 日志分析快速上手 / 了解如何切换日志、发起 AI 分析，并利用侧栏持续追问排错。
    titleKey: 'guide.definitions.logAnalysis.title',
    descriptionKey: 'guide.definitions.logAnalysis.description',
    steps: logAnalysisGuideSteps,
    beforeStart: () => {
      const appStore = useAppStore();
      const ai = appStore.settings.ai || {};
      const provider = String(ai.provider || 'openai_compatible').trim().toLowerCase();
      const baseUrl = String(ai.base_url || '').trim();
      const apiKey = String(ai.api_key || '').trim();
      const normalizedProvider = provider === 'openai' || provider === 'custom_openai'
        ? 'openai_compatible'
        : provider;
      let baseHost = '';
      try {
        baseHost = new URL(baseUrl || 'https://api.openai.com/v1').hostname || '';
      } catch {
        baseHost = '';
      }
      const usesDefaultOpenAI = normalizedProvider === 'openai_compatible' && (
        !baseUrl || /(^|\.)openai\.com$/i.test(baseHost)
      );
      const requiresApiKey = ['anthropic', 'gemini'].includes(normalizedProvider) || usesDefaultOpenAI;
      const hasMinimalAiConfig = !!(
        ai.enabled &&
        String(ai.model || '').trim() &&
        normalizedProvider &&
        (!requiresApiKey || apiKey)
      );
      if (!hasMinimalAiConfig) {
        return {
          blocked: true,
          message: t('guide.messages.configureAiBeforeLogAnalysis')
        };
      }
      appStore.uiState.showLogDrawer = false;
      return true;
    }
  },
  {
    key: 'workspace',
    // zh: 库存枢纽导览 / 了解如何在库存枢纽中查看、管理和操作库存。
    titleKey: 'guide.definitions.workspace.title',
    descriptionKey: 'guide.definitions.workspace.description',
    steps: workspaceGuideSteps,
    // 【关键】增加一个 pre-action，告诉引导中心在开始前要先打开某个弹窗
    beforeStart: () => {
      const appStore = useAppStore();
      appStore.uiState.showWorkspace = true;
    }
  },
  {
    key: 'workspaceWorkshop',
    // zh: 创意工坊检索 / 了解如何搜索工坊模组并决定订阅、下载或继续查看依赖。
    titleKey: 'guide.definitions.workspaceWorkshop.title',
    descriptionKey: 'guide.definitions.workspaceWorkshop.description',
    steps: workshopBrowserGuideSteps,
    beforeStart: () => {
      const appStore = useAppStore();
      appStore.uiState.showWorkspace = true;
    }
  },
  {
    key: 'workspaceCollection',
    // zh: 合集订阅管理 / 了解如何导入合集、补齐缺失项并应用合集顺序。
    titleKey: 'guide.definitions.workspaceCollection.title',
    descriptionKey: 'guide.definitions.workspaceCollection.description',
    steps: collectionGuideSteps,
    beforeStart: () => {
      const appStore = useAppStore();
      appStore.uiState.showWorkspace = true;
    }
  },
  {
    key: 'workspaceGithub',
    // zh: Git 仓库订阅 / 了解如何解析仓库、订阅来源并查看部署时间线。
    titleKey: 'guide.definitions.workspaceGithub.title',
    descriptionKey: 'guide.definitions.workspaceGithub.description',
    steps: githubGuideSteps,
    beforeStart: () => {
      const appStore = useAppStore();
      appStore.uiState.showWorkspace = true;
    }
  },
  {
    key: 'conflict',
    // zh: 重复模组冲突处理 / 了解如何保留正确副本，并批量禁用或删除其余副本。
    titleKey: 'guide.definitions.conflict.title',
    descriptionKey: 'guide.definitions.conflict.description',
    steps: conflictGuideSteps,
    beforeStart: () => {
      const modStore = useModStore();
      const hasConflicts =
        (Array.isArray(modStore.conflictList) && modStore.conflictList.length > 0) ||
        (Array.isArray(modStore.coexistenceList) && modStore.coexistenceList.length > 0);
      return hasConflicts;
    }
  },
]

export const useGuideStore = defineStore('guide', () => {

  // -----------------------------------------------------------------
  // Store 依赖 (Stores)
  // -----------------------------------------------------------------
  const appStore = useAppStore();
  const toast = useToast();

  // -----------------------------------------------------------------
  // 内部工具 (Utils)
  // -----------------------------------------------------------------
  const markAsDone = async (uniqueKey) => {
    if (window.pywebview && window.pywebview.api) {
      await window.pywebview.api.guide_mark_as_done(uniqueKey)
      appStore.settings.completed_guides[uniqueKey] = 'done'
    }
  }

  // 所有教程最终都走同一执行器，保证“前置检查 -> 启动 -> 完成标记”的流程一致。
  const runGuide = async (guideKey, stepsConfig, force = false, beforeStartCallback = null) => {
    const uniqueKey  = `${guideKey}_${GUIDE_VERSION}`
    const completedGuides = appStore.settings.completed_guides || {}

    if (!force && completedGuides[uniqueKey] === 'done') {
      return
    }
    if (beforeStartCallback) {
      const canStart = await beforeStartCallback()
      if (typeof canStart === 'string') {
        toast.info(canStart)
        return
      }
      if (canStart && typeof canStart === 'object' && canStart.blocked) {
        toast.info(canStart.message || t('guide.messages.preconditionRequired'))
        return
      }
      if (canStart === false) {
        toast.info(t('guide.messages.sceneRequired'))
        return
      }
      // 等待弹窗动画
      await new Promise(r => setTimeout(r, 400))
    }

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: false,
      doneBtnText: t('guide.driver.done'),
      closeBtnText: t('guide.driver.skip'),
      nextBtnText: t('guide.driver.next'),
      prevBtnText: t('guide.driver.prev'),
      // 【关键配置】针对高 z-index 的弹窗，如果不加这个，遮罩可能会被你的弹窗盖住！
      // 我们的弹窗通常 z-index 是 100 左右，这里设个大的
    //   popoverClass: 'driver-popover',
      onDestroyStarted: () => {
        markAsDone(uniqueKey) // 调用统一的标记函数
        driverObj.destroy()
      },
      steps: stepsConfig.map(step => ({
        ...step,
        popover: {
          ...step.popover,
          title: translateText(step.popover?.title),
          description: translateText(step.popover?.description),
          // 拦截下一步点击
          onNextClick: async () => {
            // 如果当前步骤定义了“前往下一步之前”的动作
            if (step.onNextBefore) {
              await step.onNextBefore();
              // 如果有异步操作（比如打开弹窗），这里等待一下动画
              await new Promise(r => setTimeout(r, 400));
            }
            driverObj.moveNext();
          }
        }
      }))
    });

    // 【重要延迟】如果是弹窗刚打开，需要等弹窗的 CSS Transition 动画播放完毕（通常300ms）
    // 否则获取到的坐标是动画过程中的坐标，会导致高亮框错位
    setTimeout(() => {
      driverObj.drive()
    }, 400)
  }

  // 暴露具体的场景触发器
  // const startMainGuide = (force = false) => runGuide('main', mainGuideSteps, force)
  // const startWorkspaceGuide = (force = false) => runGuide('workspace', workspaceGuideSteps, force)
  // const startModListGuide = (force = false) => {
  //   // 检测主页引导是否完成
  //   const mainGuideDone = localStorage.getItem('rim_guide_main_' + GUIDE_VERSION) === 'done'
  //   if (!mainGuideDone) return
  //   runGuide('modList', modListGuideSteps, force)
  // }

  // 根据 key 动态启动引导
  const startGuideByKey = (guideKey, force = false) => {
    const guide = allGuides.find(g => g.key === guideKey)
    if (guide) {
      runGuide(guide.key, guide.steps, force, guide.beforeStart)
    }
  }
  // 跳过单个引导
  const skipGuideByKey = (guideKey) => {
    const uniqueKey = `${guideKey}_${GUIDE_VERSION}`
    markAsDone(uniqueKey)
    // toast.info(`已跳过教程: ${allGuides.find(g=>g.key===guideKey)?.title || ''}`)
  }
  // 跳过全部引导
  const skipAllGuides = () => {
    allGuides.forEach(guide => {
      skipGuideByKey(guide.key)
    })
    toast.info(t('guide.messages.allSkipped'))
  }

   // 重置所有引导状态
  const resetAllGuides = async () => {
    if (window.pywebview && window.pywebview.api) {
      appStore.closeSettingsPanel()
      await window.pywebview.api.guide_reset_all()
      appStore.settings.completed_guides = {}
      toast.success(t('guide.messages.allReset'))
    }
  }

  return {
    // 引导入口
    startGuideByKey,
    // 跳过与重置
    skipGuideByKey, skipAllGuides, resetAllGuides,
  }
})
