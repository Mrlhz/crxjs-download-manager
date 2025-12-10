import { parseQuery } from '@/utils/index.js';
import { DOWNLOAD_STOP } from '@/global/globalconfig.js';
import { processListLinks } from './getList.js';
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
  if (command === 'RUN_ALT_L') {
    await processListLinks(tab, { all: true, save: true });
  }
  if (command === 'RUN_ALT_S') {
    console.log('Current Tab:', tab);
    const result = await downloadTabResources(tab, { all: false, save: true });
    console.log('Download Tab Resources Result:', result);
  }

  if (command === 'RUN_ALT_A') {
    await downloadMatchTabsBatch()
  }

  if (command === 'RUN_ALT_T') {

  }
}
