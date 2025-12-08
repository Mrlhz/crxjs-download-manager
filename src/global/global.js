import { download, downloadWithConcurrency } from  './download.js';

export async function saveOne(notes = {}) {
  const result = await fetch(`http://localhost:3000/douyin/saveOne`, {
    method: 'post',
    body: JSON.stringify({ ...notes }),
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    }
  })
    .then(res => res.json())
    .catch(error => {
      console.log(error)
    })

  return result
}

export async function includes(noteIds = []) {
  const result = await fetch(`http://localhost:3000/douyin/includes`, {
    method: 'post',
    body: JSON.stringify(noteIds),
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    }
  })
    .then(res => res.json())
    .catch(error => {
      console.log(error)
    })

  return result
}

export async function getMissingIds(noteIds = []) {
  const result = await fetch(`http://localhost:3000/douyin/findMissingIds`, {
    method: 'post',
    body: JSON.stringify({ noteIds}),
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    }
  })
    .then(res => res.json())
    .catch(error => {
      console.log(error)
    })

  return result
}

/**
 * 切换并聚焦所有包含抖音内容路径 (/video 或 /note) 的页签（按当前浏览器所有标签）
 * @param {number} delayMs
 */
export async function focusPageContentTabsSequentially(tabs = [], delayMs = 3000) {
  for (const tab of tabs) {
    try {
      console.log('[focusDouyinTabs] focusing', tab.id, tab.url);
      await chrome.tabs.update(tab.id, { active: true });
    } catch (e) {
      console.warn('[focusDouyinTabs] failed', tab.id, e);
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
}

/**
 * 获取所有路径以 /video 或 /note 开头的标签
 * @returns {Promise<chrome.tabs.Tab[]>}
 */
export async function listDouyinContentTabs() {
  const tabs = await chrome.tabs.query({});
  const result = [];
  for (const t of tabs) {
    try {
      const url = new URL(t?.url);
      if (isDouyinContentPath(url.pathname)) {
        result.push(t);
      }
    } catch (e) {
      // 忽略无法解析的 tab.url
    }
  }
  return result;
}

/** 判断 pathname 是否为抖音内容页路径 */
export function isDouyinContentPath(pathname = '') {
  return pathname.startsWith('/video') || pathname.startsWith('/note');
}

export {
  download,
  downloadWithConcurrency
}
