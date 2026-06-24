<template>
              <section class="animate-in fade-in slide-in-from-right-4">
                <h3 class="text-lg font-bold text-text-main mb-6">{{ t('settings.network.title') }}</h3>
                <div class="space-y-8">
                  <div class="modal-section space-y-6 p-4">
                    <!-- 原文：启用代理服务 -->
                    <CommonSwitch :label="t('settings.network.enableProxy')" v-model="formData.network.proxy.enabled" :description="t('settings.network.enableProxyDesc')" mini />
                    <div v-if="formData.network.proxy.enabled" class="grid grid-cols-6 gap-3 animate-in zoom-in-95">
                      <CommonSelect class="col-span-2" :label="t('settings.network.protocol')" v-model="formData.network.proxy.type" :options="[{label:'HTTP', value:'http'},{label:'SOCKS5', value:'socks5'}]" />
                      <CommonInput class="col-span-3" :label="t('settings.network.host')" v-model="formData.network.proxy.host" placeholder="127.0.0.1" />
                      <CommonNumber class="col-span-1" :label="t('settings.network.port')" v-model="formData.network.proxy.port" :step="1" :min="1" :max="65535" />
                      <CommonInput class="col-span-3" :label="t('settings.network.username')" v-model="formData.network.proxy.username" />
                      <CommonInput class="col-span-3" :label="t('settings.network.password')" v-model="formData.network.proxy.password" is-password />
                      <div class="col-span-6">
                        <CommonTagInput :label="t('settings.network.bypass')" v-model="formData.network.proxy.bypass_list" />
                      </div>

                      <div class="col-span-6 grid grid-cols-2 gap-3">
                        <CommonSwitch :label="t('settings.network.useSteamcmdProxy')" v-model="formData.network.use_proxy_on_steamcmd" :description="t('settings.network.useSteamcmdProxyDesc')" />
                        <CommonSwitch :label="t('settings.network.useAiProxy')" v-model="formData.network.use_proxy_on_ai" :description="t('settings.network.useAiProxyDesc')" />
                      </div>
                    </div>
                  </div>
                  <CommonKVEditor :label="t('settings.network.customHosts')" v-model="formData.network.hosts" />
                  <CommonSwitch :label="t('settings.network.writeHosts')" v-model="formData.network.write_to_system_hosts" :description="t('settings.network.writeHostsDesc')" />
                
                  <div class="modal-section space-y-4 p-4">
                    <CommonSwitch :label="t('settings.network.enhancedWorkshop')" v-model="formData.enable_steam_enhanced_api" mini :description="t('settings.network.enhancedWorkshopDesc')" />
                    <div class="flex items-end gap-2" :class="{'cursor-not-allowed opacity-50 pointer-events-none': !formData.enable_steam_enhanced_api}">
                      <CommonInput class="flex-1" :label="t('settings.network.steamApiKey')" v-model="formData.steam_web_api_key" is-password :placeholder="t('settings.network.steamApiKeyPlaceholder')" :description="t('settings.network.steamApiKeyDesc')" />
                      <button @click="openUrlOnSteam('https://steamcommunity.com/dev/apikey')"
                        class="px-2 py-2 m-0.5 bg-bg-overlay/5 hover:bg-bg-overlay/10 border border-border-base/10 rounded-lg text-xs font-bold cursor-pointer transition-all">
                        <span class="flex items-center gap-2">
                          {{ t('settings.network.visit') }}<p class="text-accent-cool">{{ t('settings.network.apiKey') }}</p>{{ t('settings.network.page') }}
                        </span>
                      </button>
                    </div>
                    <div class="text-xs ">
                      <p class="mt-1 leading-relaxed text-text-dim">
                        {{ t('settings.network.steamWebApiDesc') }}
                      </p>
                      <span class="text-accent-warn">{{ t('settings.network.steamWebApiWarning') }}</span>
                      <p>{{ t('settings.network.steamWebApiDanger') }}</p>
                    </div>
                  </div>

                </div>
              </section>
</template>

<script setup>
import CommonSwitch from '../../../shared/components/input/CommonSwitch.vue'
import CommonInput from '../../../shared/components/input/CommonInput.vue'
import CommonNumber from '../../../shared/components/input/CommonNumber.vue'
import CommonSelect from '../../../shared/components/input/CommonSelect.vue'
import CommonTagInput from '../../../shared/components/input/CommonTagInput.vue'
import CommonKVEditor from '../../../shared/components/input/CommonKVEditor.vue'
import { useI18n } from 'vue-i18n'

defineProps({
  formData: { type: Object, required: true },
})

const { t } = useI18n()

const openUrlOnSteam = (url) => {
  window.open('steam://openurl/' + url, '_blank')
}
</script>
