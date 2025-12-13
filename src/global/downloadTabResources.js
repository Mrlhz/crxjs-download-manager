import { safeFileName, safeFileNameWithExtension } from '@/utils/index.js';
import { pathExists } from '@/global/pathExists.js';
import { getNote } from '@/global/dom/note.js';
import { getVideo } from '@/global/dom/video.js';
import { saveOne } from '@/global/global.js';
import { NOTE_ID_KEY, DOWNLOAD_STOP } from '@/global/globalConfig.js';
import { download } from '@/global/download.js';
import { tryCloseTab } from '@/global/tryCloseTab.js';
import chalk from '@/utils/chalk/chalk-ansi.js';

// 传入一个tab页签对象下载文件
// 1. tab: chrome.tabs.Tab 对象
// 2. options: { all: boolean, save: boolean }
// 根据url pathname决定下载视频或笔记
// 获取到dom信息后判断files字段进行下载
// 通过pathExists过滤已存在的文件
// 得到过滤后的文件列表，根据文件列表长度为0与否决定是否进行下载，是否尝试关闭当前tab
// 记录tab对应的下载文件数量
// 下载文件，可通过入参控制同时下载文件数量
// 开始下载文件，通过download函数进行下载
// 返回下载结果
/**
 * Download resources from a given browser tab.
 *
 * - Determines resource type (video or note) from tab URL.
 * - Retrieves resource metadata from the page.
 * - Filters out files that already exist via pathExists.
 * - Attempts downloads with simple retry logic for known failure cases.
 * - Optionally saves resource metadata and closes the tab.
 *
 * @param {chrome.tabs.Tab} tab - Chrome tab object containing the page to inspect.
 * @param {Object} [options] - Options controlling behavior.
 * @param {boolean} [options.all=false] - Close the tab after processing when true.
 * @param {boolean} [options.save=false] - Persist resource metadata when true.
 * @returns {Promise<{ success: boolean, message: string, results?: Array }>} Result summary.
 */
export async function downloadTabResources(tab = {}, options = {}) {
  const { all = false, save = false } = options;
  const log = (...args) => console.log(chalk.blue('[downloadTabResources]: '), ...args);
  log('Starting download for tab:', tab.id, 'with options:', options);
  try {
    const resourceInfo = await getTabResourceInfo(tab, {});
    if (resourceInfo.error) {
      log('Error getting resource info for tab:', tab.id, resourceInfo.error);
      return { success: false, message: 'Failed to get resource info' };
    }
    const { files = [] } = resourceInfo;
    log('Resource info for tab:', tab.id, resourceInfo);
    // 通过pathExists过滤已存在的文件
    const filesToDownload = await pathExists(files);
    if (filesToDownload.length === 0) {
      log('All files already exist for tab:', tab.id);
      await saveResource(tab, options, resourceInfo);
      if (all) {
        await tryCloseTab(tab);
      }
      return { success: false, message: 'All files already exist' };
    }
    const results = [];
    for (const file of filesToDownload) {
      const response = await downloadWithRetry(file);
      if (response.error) {
        log(response);
        continue
      }
      results.push(response);
    }
    await saveResource(tab, options, resourceInfo);
    if (all) {
      await tryCloseTab(tab);
    }
    log('Download initiated for tab:', tab.id, results);
    return { success: true, message: 'Download started', results };
  } catch (error) {
    log('Download failed for tab:', tab.id, 'Error:', error);
    return { success: false, message: 'Download failed' };
  }
}

/**
 * Inspect tab URL and inject the appropriate content script to extract resource metadata.
 * 根据url pathname决定下载视频或笔记
 * 
 * @param {chrome.tabs.Tab} tab
 * @returns {Promise<Object>} Resource metadata object containing at least `files` array.
 */
async function getTabResourceInfo(tab, options = {}) {
  try {
    const { pathname } = new URL(tab?.url);
    // 根据不同的pathname注入不同的脚本获取资源信息
    const enums = {
      video: getVideo,
      note: getNote
    };
    const type = pathname.split('/')?.[1];
    const getSources = enums[type];
    // 获取tab页面的资源信息
    const result = await getSources(tab, options).then(([{ documentId, frameId, result }]) => result);
    if (result?.error === 'CAPTCHA_REQUIRED') {
      await chrome.storage.local.set({ [DOWNLOAD_STOP]: '0'});
    }
    if (!result?.files?.some(f => f)) {
      console.log(`${chalk.blue('[getTabResourceInfo]')}: No ${type} resources found in tab:`, tab, result);
      return { error: `Failed to get ${type} resources` };
    }
    return result;
  } catch (error) {
    return { error }
  }
}

/**
 * Dispatch download to type-specific retry handlers.
 * 下载失败后调整参数重新下载一次
 * 
 * @param {Object} file - Resource file descriptor (must include `type`).
 * @returns {Promise<Object>} download result or { error } object.
 */
async function downloadWithRetry(file = {}) {
  if (file.type === 'note') {
    return downloadNoteWithRetry(file);
  } else if (file.type === 'video') {
    return downloadVideoWithRetry(file);
  }
}

/**
 * Attempt to download a note file, retrying with a safe filename structure if needed.
 *
 * @param {Object} file
 * @returns {Promise<Object>}
 */
async function downloadNoteWithRetry(file = {}) {
  try {
    const response = await download(file);
    return response;
  } catch (error) {
    if (error.message === 'Invalid filename') {
      const { name, fileName } = file;
      const obj = { ...file, filename: `${safeFileName(name)}/${safeFileNameWithExtension(fileName)}` };
      const [filterFile] = await pathExists([obj]);
      if (filterFile) {
        const response = await download(obj);
        return response;
      }
      return { error: `files already exist: ${obj.filename}` }
    }

    return { error }
  }
}

/**
 * Attempt to download a video file, retrying with the first available source if interrupted.
 *
 * @param {Object} file
 * @returns {Promise<Object>}
 */
async function downloadVideoWithRetry(file = {}) {
  try {
    const response = await download(file);
    return response;
  } catch (error) {
    if (error?.message === 'Download interrupted') {
      const { __source: videos } = file;
      console.log(`${chalk.blue('[downloadVideoWithRetry]')}, ${chalk.red(error?.message)}`, videos)
      if (Array.isArray(videos) && videos.length > 1 && videos[0]) {
        const response = await download(videos[0]);
        return response;
      }
    }

    return { error }
  }
}

async function saveResource(tab = {}, options = {}, resource = {}) {
  const { save = false } = options;
  try {
    if (save && resource?.[NOTE_ID_KEY]) {
      const r = await saveOne({ ...resource, url: tab.url, download: true });
      console.log('[saveResource]: Resource info saved for tab:', tab.id, resource, r);
    }
  } catch (error) {
    return { error }
  }
}
