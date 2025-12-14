import { createApp } from 'vue';
// import ElementPlus from 'element-plus'
// import { ElButton, ElForm, ElFormItem, ElSwitch, ElInputNumber } from 'element-plus';

// import 'element-plus/dist/index.css'

import App from './App.vue'
import './style.css'


const app = createApp(App);

// app
//   .use(ElButton)
//   .use(ElForm)
//   .use(ElFormItem)
//   .use(ElSwitch);

app.mount('#app');
