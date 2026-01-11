import { getMissingIds, focusPageContentTabsSequentially } from '@/global/global.js';
import { getNoteId } from '@/utils/index.js';
import {
  DOWNLOAD_STOP,
  DOWNLOAD_REVERSE,
  TOBE_DOWNLOADED_LIST,
  LIST_SELECTORS,
  WAIT_TIME_BEFORE_NEXT_LINK,
  DELAY_LEVEL_5_MS,
  MAX_ITERATIONS_VALUE,
  PREFETCH_LINKS_KEY,
  PREFETCH_LINKS_COUNT
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
  const {
    DOWNLOAD_REVERSE: reverse,
    PREFETCH_LINKS_KEY: prefetchCount,
    MAX_ITERATIONS_VALUE: maxIterations,
  } = await chrome.storage.local.get(null);
  const links = await getLimitedListLinks(tab, options, maxIterations ? parseInt(maxIterations) : MAX_ITERATIONS_VALUE);
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
  if (Array.isArray(missingIds) && missingIds.length === 0) {
    console.log('All noteIds already exist, stopping further processing.');
    return;
  }
  while (task.length > 0) {
    const stop = await chrome.storage.local.get([DOWNLOAD_STOP]).then(res => res[DOWNLOAD_STOP]);
    if (stop === '0') {
      console.log('Download process stopped by user.');
      break;
    }
    // 预取接下来的3个链接
    const prefetchLinks = task.splice(0, prefetchCount ? parseInt(prefetchCount) : PREFETCH_LINKS_COUNT);
    // 过滤掉已存在的noteIds对应的链接
    const prefetchTasks = prefetchLinks.filter(link => {
      const noteId = getNoteId(link);
      return noteId && missingIds.includes(noteId);
    });
    console.log('Prefetching links:', prefetchTasks);
    if (prefetchTasks.length === 0) {
      console.log('No prefetch tasks needed for existing noteIds.');
      continue;
    }
    try {
      console.log('Prefetching links by opening tabs:', prefetchTasks);
      // 逐个打开标签页预取内容
      const prefetchTabs = [];
      for (const link of prefetchTasks) {
        const tab = await new Promise((resolve) => {
          chrome.tabs.create({ url: link, active: false }, (tab) => {
            // 等待标签页加载完成
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {
              if (changeInfo.status === 'complete' && tabId === tab?.id) {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve(updatedTab);
              }
            });
          });
        });
        prefetchTabs.push(tab);
        await focusPageContentTabsSequentially([tab], 1500);
      }
      console.log('Prefetched tabs loaded:', prefetchTabs);
      // if (task.length) {
      //   // 等待一段时间
      //   const delay = await chrome.storage.local.get([WAIT_TIME_BEFORE_NEXT_LINK]).then(res => res[WAIT_TIME_BEFORE_NEXT_LINK]);
      //   console.log(`Waiting ${(delay || DELAY_LEVEL_5_MS)/1000} seconds before processing next task`);
      //   await new Promise(resolve => setTimeout(resolve, delay || DELAY_LEVEL_5_MS));
      // }
      // await focusPageContentTabsSequentially(prefetchTabs, 1500);
      // 将预取的标签页加入下载队列
      const res = await downloadTabsBatch(prefetchTabs, options);
      console.log('downloadTabsBatch result for prefetched tabs:--------------------', res);
      console.log('downloadTabsBatch result:--------------------', res);
      console.log('Finished prefetching links:', prefetchTasks, 'links remaining in main task:', task.length);
    } catch (error) {
      console.log('Error prefetching links:', prefetchTasks, error);
      continue;
    }
  }
}

// 批量打开标签页预取内容
function prefetchLinksInTabs(links = [], options = {}) {
  const completeTabs = links.map(link => new Promise((resolve) => {
    chrome.tabs.create({ url: link, active: options?.active || false }, (completeTab) => {
      // 等待标签页加载完成
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {
        if (changeInfo.status === 'complete' && tabId === completeTab?.id) {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(updatedTab);
        }
      });
    });
  }));

  return Promise.all(completeTabs);
}

// 先预先3个链接，循环所有作品列表链接，执行下载任务，再次优化预取逻辑
export async function processListLinksWithPrefetch(tab, options = {}) {
  try {
    const {
      DOWNLOAD_REVERSE: reverse,
      PREFETCH_LINKS_KEY: prefetchCount,
      MAX_ITERATIONS_VALUE: maxIterations,
    } = await chrome.storage.local.get(null);
    const links = await getLimitedListLinks(tab, options, maxIterations ? parseInt(maxIterations) : MAX_ITERATIONS_VALUE);
    console.log('Complete list of links:', links);

    // 正序或倒序处理链接
    const task = reverse === '1' ? [...links].reverse() : [...links];
    // 过滤已下载的noteIds对应的链接
    const noteIds = links.map(link => getNoteId(link)).filter(id => id !== null);
    // 待下载保存的noteIds
    const missingIds = await getMissingIds(noteIds);
    if (Array.isArray(missingIds)) {
      const list = await getToBeDownloadedList(TOBE_DOWNLOADED_LIST);
      missingIds.push(...list);
    }
    console.log('Existing noteIds:', missingIds);

    // nodeId作为key, value为link的Map
    const noteIdToLinkMap = new Map(task.map(link => [getNoteId(link), link]));
    // 筛选出需要下载的链接
    const prefetchTasks = missingIds.map(id => noteIdToLinkMap.get(id)).filter(link => link !== undefined);
    console.log('Filtered task list:', prefetchTasks);

    if (Array.isArray(missingIds) && missingIds.length === 0 || prefetchTasks.length === 0) {
      console.log('All noteIds already exist, stopping further processing.');
      return;
    }

    const prefetchLinks = [];
    const prefetchTabs = [];
    while (prefetchTasks.length > 0 || prefetchTabs.length > 0) {
      try {
        const stop = await chrome.storage.local.get([DOWNLOAD_STOP]).then(res => res[DOWNLOAD_STOP]);
        if (stop === '0') {
          console.log('Download process stopped by user.');
          break;
        }
        // 如果prefetchLinks不够，则继续从prefetchTasks中取
        if (prefetchTasks.length > 0 && prefetchTabs.length < (prefetchCount || PREFETCH_LINKS_COUNT)) {
          console.log('Not enough prefetch links, continuing to fetch from main task.');
          const _prefetchLinks = prefetchTasks.splice(0, (prefetchCount ? parseInt(prefetchCount) : PREFETCH_LINKS_COUNT) - prefetchTabs.length);
          prefetchLinks.push(..._prefetchLinks);
          // 批量预取链接
          const _prefetchTabs = await prefetchLinksInTabs(_prefetchLinks, { active: _prefetchLinks.length === 1 });
          prefetchTabs.push(..._prefetchTabs);
        }

        const results = [];
        const preDownloadTabs = prefetchTasks.length > 0 ? prefetchTabs.splice(0, 1) : prefetchTabs.splice(0, prefetchTabs.length);
        for (const tab of preDownloadTabs) {
          const res = await downloadTabsBatch([tab], options);
          results.push(res);
        }
        console.log('downloadTabsBatch result for prefetched tabs:--------------------', results);
        console.log('Finished prefetching links, remaining prefetch tasks:', prefetchTasks.length, 'remaining prefetch tabs:', prefetchTabs.length);
      } catch (error) {
        console.log('Error prefetching links:', error);
        continue;
      }
    }
  } catch (error) {
    console.log('Error in [processListLinksWithPrefetch]:', error);
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
