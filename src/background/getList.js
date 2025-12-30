import { getMissingIds } from '@/global/global.js';
import { getNoteId } from '@/utils/index.js';
import {
  DOWNLOAD_STOP,
  DOWNLOAD_REVERSE,
  TOBE_DOWNLOADED_LIST,
  LIST_SELECTORS,
  WAIT_TIME_BEFORE_NEXT_LINK,
  DELAY_LEVEL_5_MS,
  MAX_ITERATIONS_VALUE
} from '@/global/globalConfig.js';
import { downloadTabsBatch } from '@/global/downloadTabsBatch.js';

export function getList(tab, options) {
  return chrome.scripting.executeScript({ target: { tabId: tab.id }, function: getLinks, args: [tab, options] });
}

function getLinks(tab, options = {}) {
  const formatLink = (list) => {
    return Array.from(list)
      .map(item => {
        return (item.href?.startsWith('http') ? item.href : location.origin + item.href);
      })
      .filter(href => href !== null);
  };
  try {
    // 获取作品列表链接
    const userDetailElement = document.querySelector("#user_detail_element ul[data-e2e=\"scroll-list\"]");
    const size = document.querySelector("#semiTabpost span[data-e2e=\"user-tab-count\"]")?.innerText || 0;
    if (userDetailElement) {
      const listItems = userDetailElement.querySelectorAll("li a");
      const links = formatLink(listItems);
      console.log('scroll-list', links);
      return { size, result: links };
    } else if (document.querySelector("#user_detail_element div[data-e2e=\"user-post-list\"]")) {
      const list = document.querySelectorAll("#user_detail_element div[data-e2e=\"user-post-list\"] .video-card-in-user-timeline-list a");
      const links = formatLink(list);
      console.log('user-post-list', links);
      return { size, result: links };
    }

    console.log("User detail element not found.");
    return { size, result: [] };
  } catch (error) {
    return { size: 0, result: [] }
  }
}

// 循环获取所有作品列表链接，直到没有新链接为止，或达到最大循环次数
export async function getLimitedListLinks(tab, options = {}, maxIterations = MAX_ITERATIONS_VALUE) {
  let allLinks = [];
  let newLinksFound = true;
  let iteration = 0;

  while (newLinksFound && iteration < maxIterations) {
    const { size, result: links } = await getList(tab, options).then(([{ result }]) => result);
    const uniqueLinks = Array.from(new Set(links));
    const previousCount = allLinks.length;
    allLinks = Array.from(new Set([...allLinks, ...uniqueLinks]));

    console.log(`Iteration ${iteration + 1}: Found ${links?.length} links, Total unique links: ${allLinks.length}`, size);
    if (isApproximatelyEqual(allLinks.length, previousCount) || isApproximatelyEqual(allLinks.length, parseInt(size))) {
      console.log('Reached maximum links or no new links found.', size, allLinks.length);
      newLinksFound = false; // 没有新链接，停止循环
    } else {
      // 滚动到底部
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: (selector) => {
          document.querySelector(selector)?.scrollIntoView({ behavior: "instant", block: "end" })
        },
        args: [LIST_SELECTORS]
      });

      // 等待一段时间让页面加载新内容
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    iteration++;
  }

  return allLinks;
}

// 两个数相减绝对值小于给定值则认为相等
function isApproximatelyEqual(a, b, threshold = 6) {
  return Math.abs(a - b) < threshold;
}

// 循环所有作品列表链接，执行下载任务
export async function processListLinks(tab, options = {}) {
  const links = await getLimitedListLinks(tab, options);
  const reverse = await chrome.storage.local.get([DOWNLOAD_REVERSE]).then(res => res[DOWNLOAD_REVERSE]);
  console.log('Complete list of links:', links);

  // 一次处理一个链接，避免打开过多标签页
  const task = reverse === '1' ? [...links].reverse() : [...links];
  const noteIds = links.map(link => getNoteId(link)).filter(id => id !== null);
  console.log('Extracted noteIds:', noteIds);
  // 待下载保存的noteIds
  const missingIds = await getMissingIds(noteIds);
  if (Array.isArray(missingIds)) {
    const list = await getToBeDownloadedList(TOBE_DOWNLOADED_LIST);
    missingIds.push(...list);
  }
  console.log('Existing noteIds:', missingIds);
  console.log('Filtered task list:', task);
  while (task.length > 0) {
    const stop = await chrome.storage.local.get([DOWNLOAD_STOP]).then(res => res[DOWNLOAD_STOP]);
    if (stop === '0') {
      console.log('Download process stopped by user.');
      break;
    }
    const link = task.shift();
    // 过滤掉已存在的noteIds对应的链接
    if (Array.isArray(missingIds) && missingIds.length === 0) {
      console.log('All noteIds already exist, stopping further processing.');
      break;
    }
    const noteId = getNoteId(link);
    if (noteId && !missingIds.includes(noteId)) {
      console.log('Skipping already existing noteId link:', link);
      continue;
    }
    try {
      console.log('Processing link:', link);
      // 在这里添加对每个链接的处理逻辑，例如打开新标签页并下载内容
      const newTab = await new Promise((resolve) => {
        chrome.tabs.create({ url: link, active: true }, (tab) => {
          // 等待标签页加载完成
          chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {
            if (changeInfo.status === 'complete' && tabId === tab?.id) {
              chrome.tabs.onUpdated.removeListener(listener);
              resolve(updatedTab);
            }
          });
        });
      });
      if (task.length) {
        // 等待一段时间
        const delay = await chrome.storage.local.get([WAIT_TIME_BEFORE_NEXT_LINK]).then(res => res[WAIT_TIME_BEFORE_NEXT_LINK]);
        console.log(`Waiting ${(delay || DELAY_LEVEL_5_MS)/1000} seconds before processing next link`);
        await new Promise(resolve => setTimeout(resolve, delay || DELAY_LEVEL_5_MS));
      }

      console.log('New tab loaded:', newTab);
      const res = await downloadTabsBatch([newTab], options);
      console.log('downloadTabsBatch result:--------------------', res);
      console.log('Finished processing link:', link, task.length, 'links remaining.');
    } catch (error) {
      console.log('Error processing link:', link, error);
      continue;
    }
  }
}

async function getToBeDownloadedList(key = TOBE_DOWNLOADED_LIST) {
  // await chrome.storage.local.set({ TOBE_DOWNLOADED_LIST: [] });
  const result = await chrome.storage.local.get([key]).then(res => res[key]);

  if (Array.isArray(result)) {
    return result.filter(v => v);
  }

  return [];
}
