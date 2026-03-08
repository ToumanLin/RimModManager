// frontend/src/stores/guideStore.js
import { defineStore } from 'pinia'
import { useAppStore } from './appStore'
import { nextTick } from 'vue'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { GUIDE_VERSION, mainGuideSteps, workspaceGuideSteps, modListGuideSteps } from '../modules/guide/guideConfig'

export const useGuideStore = defineStore('guide', () => {

  // 通用执行引擎
  const runGuide = (guideKey, stepsConfig, force = false) => {
    const storageKey = `rim_guide_${guideKey}_${GUIDE_VERSION}`
    
    if (!force && localStorage.getItem(storageKey) === 'done') {
      return // 已经看过了，跳过
    }

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: false,
      doneBtnText: '我知道了',
      closeBtnText: '跳过',
      nextBtnText: '下一步',
      prevBtnText: '上一步',
      // 【关键配置】针对高 z-index 的弹窗，如果不加这个，遮罩可能会被你的弹窗盖住！
      // 我们的弹窗通常 z-index 是 100 左右，这里设个大的
    //   popoverClass: 'driver-popover', 
      onDestroyStarted: () => {
        localStorage.setItem(storageKey, 'done')
        driverObj.destroy()
      },
      // 当某个步骤即将开始高亮时触发
      onHighlightStarted: async (element, step, { config }) => {
        // 如果步骤配置里写了自定义的 onHighlightStarted 动作
        if (step.onHighlightStarted) {
          step.onHighlightStarted(element, step, { config })
          await nextTick()
          // 【核心技巧】：给 Vue 渲染 DOM 的时间
          // 如果打开了弹窗，元素可能还没出现在页面上
          // 我们先暂时隐藏引导，等一会再强制寻找元素
          if (step.element && !document.querySelector(step.element)) {
            await nextTick()
            // 如果有动画，可能需要延时
            await new Promise(r => setTimeout(r, 400)) 
            // 重新定位
            driverObj.refresh() 
          }
        }
      },
      steps: stepsConfig
    })

    // 【重要延迟】如果是弹窗刚打开，需要等弹窗的 CSS Transition 动画播放完毕（通常300ms）
    // 否则获取到的坐标是动画过程中的坐标，会导致高亮框错位
    setTimeout(() => {
      driverObj.drive()
    }, 400) 
  }

  // 暴露具体的场景触发器
  const startMainGuide = (force = false) => runGuide('main', mainGuideSteps, force)
  const startWorkspaceGuide = (force = false) => runGuide('workspace', workspaceGuideSteps, force)
  const startModListGuide = (force = false) => { 
    // 检测主页引导是否完成
    const mainGuideDone = localStorage.getItem('rim_guide_main_' + GUIDE_VERSION) === 'done'
    if (!mainGuideDone) return
    runGuide('modList', modListGuideSteps, force) 
  }
  
  /**
   * 清除引导记录 (用于重置)
   */
  const resetGuideRecord = () => {
     // 遍历所有本地存储的 Key
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      // 如果匹配我们的引导前缀，则标记删除
      if (key && key.startsWith('rim_guide_')) {
        keysToRemove.push(key)
      }
    }
    // 执行删除
    keysToRemove.forEach(key => localStorage.removeItem(key))
    // 提示用户并刷新页面，或重新开始主引导
    window.location.reload()
    startMainGuide()
  }

  return { startMainGuide, startWorkspaceGuide, resetGuideRecord, startModListGuide }
})