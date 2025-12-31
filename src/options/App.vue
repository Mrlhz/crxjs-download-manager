<template>
  <div class="config">
    <el-form :model="form" label-width="auto">
      <el-form-item label="启用下载">
        <el-switch v-model="form[DOWNLOAD_STOP]" />
      </el-form-item>
      <el-form-item label="倒序下载">
        <el-switch v-model="form[DOWNLOAD_REVERSE]" />
      </el-form-item>
      <el-form-item label="下载完成是否关闭页面">
        <el-switch v-model="form[CLOSE_TAB_ON_DOWNLOAD_COMPLETE]" />
      </el-form-item>
      <el-form-item label="处理下一个链接的等待时间">
        <el-input-number v-model="form[WAIT_TIME_BEFORE_NEXT_LINK]" :min="1" :max="60000">
          <template #suffix>
            <span>ms</span>
          </template>
        </el-input-number>
      </el-form-item>
      <el-form-item label="最大循环次数">
        <el-input-number v-model="form[MAX_ITERATIONS_KEY]" :min="1" :max="100">
        </el-input-number>
      </el-form-item>
      <el-form-item label=""></el-form-item>
      <el-form-item label=""></el-form-item>
      <el-form-item label=""></el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSubmit">保存</el-button>
        <el-button>Cancel</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue';
import {
  DOWNLOAD_STOP,
  DOWNLOAD_REVERSE,
  WAIT_TIME_BEFORE_NEXT_LINK,
  DELAY_LEVEL_5_MS,
  CLOSE_TAB_ON_DOWNLOAD_COMPLETE,
  MAX_ITERATIONS_KEY,
  MAX_ITERATIONS_VALUE
} from '@/global/globalConfig.js';

const form = reactive({
  [DOWNLOAD_STOP]: true,
  [DOWNLOAD_REVERSE]: false,
  [WAIT_TIME_BEFORE_NEXT_LINK]: DELAY_LEVEL_5_MS,
  [MAX_ITERATIONS_KEY]: MAX_ITERATIONS_VALUE,
  [CLOSE_TAB_ON_DOWNLOAD_COMPLETE]: true
});

onMounted(async () => {
  const config = await chrome.storage.local.get(null).then(res => res);
  Object.keys(config).forEach(key => {
    if ([DOWNLOAD_STOP, DOWNLOAD_REVERSE, CLOSE_TAB_ON_DOWNLOAD_COMPLETE].includes(key)) {
      form[key] = config[key] === '1';
    }
    if ([WAIT_TIME_BEFORE_NEXT_LINK].includes(key)) {
      form[key] = config[key];
    }
  });
});

const onSubmit = async () => {
  const config = {
    [DOWNLOAD_STOP]: form[DOWNLOAD_STOP] ? '1' : '0',
    [DOWNLOAD_REVERSE]: form[DOWNLOAD_REVERSE] ? '1' : '0',
    [CLOSE_TAB_ON_DOWNLOAD_COMPLETE]: form[CLOSE_TAB_ON_DOWNLOAD_COMPLETE] ? '1' : '0',
    [WAIT_TIME_BEFORE_NEXT_LINK]: form[WAIT_TIME_BEFORE_NEXT_LINK],
    [MAX_ITERATIONS_KEY]: form[MAX_ITERATIONS_KEY],
  }

  await chrome.storage.local.set({ ...config });
  console.log('submit!');
}
</script>
<style lang="less" scoped>
.config {
  display: flex;
  justify-content: center;
}
</style>