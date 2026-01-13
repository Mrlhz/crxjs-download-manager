import { parseQuery } from '@/utils/index.js';
import { DOWNLOAD_STOP, CLOSE_TAB_ON_DOWNLOAD_COMPLETE } from '@/global/globalconfig.js';
import { processListLinks, processListLinksWithPrefetch } from './getList.js';
import { downloadTabResources } from '@/global/downloadTabResources.js';
import { downloadMatchTabsBatch } from '@/global/downloadMatchTabsBatch.js';

chrome.commands.onCommand.addListener(listener);

async function listener(command, tab) {
  // const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const { pathname, query } = await Promise.try(() => {
    const { pathname } = new URL(tab?.url);
    const query = parseQuery(tab.url);
    return { pathname, query };
  });
  console.log(`Command "${command}" triggered`);
  await chrome.storage.local.set({ [DOWNLOAD_STOP]: '1' });
  const closeTabOnDownloadComplete = await chrome.storage.local.get([CLOSE_TAB_ON_DOWNLOAD_COMPLETE]).then(res => res[CLOSE_TAB_ON_DOWNLOAD_COMPLETE]);
  const close = closeTabOnDownloadComplete === '1';
  if (command === 'RUN_ALT_L') {
    // await processListLinks(tab, { all: close, save: true });
    await processListLinksWithPrefetch(tab, { all: close, save: true });
  }
  if (command === 'RUN_ALT_S') {
    console.log('Current Tab:', tab);
    const result = await downloadTabResources(tab, { all: close, save: true });
    console.log('Download Tab Resources Result:', result);
  }

  if (command === 'RUN_ALT_A') {
    await downloadMatchTabsBatch({ all: close, save: true });
  }

  if (command === 'RUN_ALT_T') {

  }
}

chrome.storage.local.get([DOWNLOAD_STOP]).then(async res => {
  const stop = res[DOWNLOAD_STOP];
  const text = stop === '0' ? 'STOP' : 'ON';
  await chrome.action.setBadgeText({ text });
});

chrome.action.onClicked.addListener(async (tab) => {
  const stop = await chrome.storage.local.get([DOWNLOAD_STOP]).then(res => res[DOWNLOAD_STOP]);
  const before = stop === '0';
  // 取反
  const after = !before;
  console.log('stop before:', stop, before, after);
  
  await chrome.storage.local.set({ [DOWNLOAD_STOP]: after ? '0' : '1' });
  const text = after ? 'STOP' : 'ON';
  await chrome.action.setBadgeText({ text });

  if (after) {
    // chrome.action.disable();
  } else {
    // chrome.action.enable();
  }
});
