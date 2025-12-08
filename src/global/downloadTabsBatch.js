import { downloadTabResources } from './downloadTabResources.js';
import { tryCloseTab } from './tryCloseTab.js';

/**
 * 批量下载多个 tab（并发控制）。
 *
 * @param {Array<chrome.tabs.Tab|string>} tabs - Tab 对象数组或 url 字符串数组
 * @param {Object} [options]
 * @param {number} [options.concurrency=2] 并发处理 tab 的数量
 * @param {boolean} [options.all=false] 传给 downloadTabResources 的 all 参数
 * @param {boolean} [options.save=false] 传给 downloadTabResources 的 save 参数
 * @returns {Promise<{ success: boolean, message: string, results: Array }>}
 */
export async function downloadTabsBatch(tabs = [], options = {}) {
  const { concurrency = 2, all = false, save = false } = options;
  const log = (...args) => console.log('[downloadTabsBatch]', ...args);

  if (!Array.isArray(tabs) || tabs.length === 0) {
    return { success: false, message: 'No tabs provided', results: [] };
  }

  // normalize and filter invalid entries
  const queue = tabs
    .map(t => (typeof t === 'string' ? { url: t } : t))
    .filter(t => t && t.url);

  if (queue.length === 0) {
    return { success: false, message: 'No valid tabs with url', results: [] };
  }

  const results = [];
  const workers = Math.max(1, Math.floor(concurrency));

  async function worker() {
    while (queue.length) {
      const tab = queue.shift();
      try {
        log('start tab', tab);
        const res = await downloadTabResources(tab, { all, save });
        results.push({ ...tab, result: res });
        if (all) {
          await tryCloseTab(tab);
        }
        log('done tab', tab.id ?? tab.url, res && res.success ? 'ok' : 'failed');
      } catch (error) {
        results.push({ ...tab, error });
        log('error tab', tab.id ?? tab.url, error);
      }
    }
  }

  // start workers
  await Promise.all(Array.from({ length: workers }).map(() => worker()));

  return { success: true, message: 'Batch completed', results };
}
