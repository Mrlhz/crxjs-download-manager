import { safeFileName, safeFileNameWithExtension } from '@/utils/index.js';
import { pathExists } from '@/global/pathExists.js';
import { getNote } from '@/global/dom/note.js';
import { getVideo } from '@/global/dom/video.js';
import { saveOne } from '@/global/global.js';
import { NOTE_ID_KEY } from '@/global/globalConfig.js';
import { download } from '@/global/download.js';
import { tryCloseTab } from '@/global/tryCloseTab.js';

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
export async function downloadTabResources(tab = {}, options = {}) {
  const { all = false, save = false } = options;
  console.log('Starting download for tab:', tab.id, 'with options:', options);
  let resourceInfo;
  try {
    resourceInfo = await getTabResourceInfo(tab, {});
  } catch (error) {
    console.log('Error getting resource info for tab:', tab.id, error);
    return { success: false, message: 'Failed to get resource info' };
  }
  const { files = [] } = resourceInfo;
  console.log('Resource info for tab:', tab.id, resourceInfo);
  // 通过pathExists过滤已存在的文件
  const filesToDownload = await pathExists(files);
  if (filesToDownload.length === 0) {
    console.log('All files already exist for tab:', tab.id);
    // 尝试关闭当前tab
    if (all) {
      await tryCloseTab(tab);
    }
    return { success: false, message: 'All files already exist' };
  }

  // 记录tab对应的下载文件数量
  // if (tabDownloadMap.has(tab.id)) {
  //   const currentCount = tabDownloadMap.get(tab.id);
  //   tabDownloadMap.set(tab.id, currentCount + filesToDownload.length);
  // } else {
  //   tabDownloadMap.set(tab.id, filesToDownload.length);
  // }
  try {
    const results = [];
    for (const file of filesToDownload) {
      const response = await downloadWithRetry(file);
      if (response.error) {
        console.log(response);
        continue
      }
      results.push(response);
    }
    if (save && resourceInfo?.[NOTE_ID_KEY]) {
      const r = await saveOne({ ...resourceInfo, url: tab.url, download: true });
      console.log('Resource info saved for tab:', tab.id, resourceInfo, r);
    }
    // 尝试关闭当前tab
    if (all) {
      await tryCloseTab(tab);
    }
    console.log('Download initiated for tab:', tab.id, results);
    return { success: true, message: 'Download started', results };
  } catch (error) {
    console.log('Download failed for tab:', tab.id, 'Error:', error);
    return { success: false, message: 'Download failed' };
  }
}

// 根据url pathname决定下载视频或笔记
async function getTabResourceInfo(tab, options = {}) {
  const { pathname } = new URL(tab?.url);
  // 根据不同的pathname注入不同的脚本获取资源信息
  if (pathname.startsWith('/video')) {
    // 获取tab页面的资源信息
    const result = await getVideo(tab, options).then(([{ documentId, frameId, result }]) => result);
    if (!result || !result.files) {
      console.log('No video resources found in tab:', tab.id);
      return { error: 'Failed to get video resources' };
    }
    return result;
  }
  if (pathname.startsWith('/note')) {
    const result = await getNote(tab, options).then(([{ documentId, frameId, result }]) => result);
    if (!result || !result.files) {
      console.log('No note resources found in tab:', tab.id);
      return { error: 'Failed to get note resources' };
    }
    return result;
  }
  return {};
}

// 下载失败后调整参数重新下载一次
async function downloadWithRetry(file = {}) {
  if (file.type === 'note') {
    return downloadNoteWithRetry(file);
  } else if (file.type === 'video') {
    return downloadVideoWithRetry(file);
  }
}
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

async function downloadVideoWithRetry(file = {}) {
  try {
    const response = await download(file);
    return response;
  } catch (error) {
    if (error?.message === 'Download interrupted') {
      const { __source: videos } = file;
      console.log('-------------------', videos)
      if (Array.isArray(videos) && videos.length > 1 && videos[0]) {
        const response = await download(videos[0]);
        return response;
      }
    }

    return { error }
  }
}
