import {
  listDouyinContentTabs,
  focusPageContentTabsSequentially
} from '@/global/global.js'
import { downloadTabResources } from '@/global/downloadTabResources.js';
import { PAGE_HOST } from '@/global/globalConfig.js';

export async function downloadMatchTabsBatch(options = {}) {
  const contentTabs = await listDouyinContentTabs();

  for (const tab of contentTabs) {
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: (tab) => document.title || tab.title,
      args: [tab]
    })
    .then(([{ documentId, frameId, result }]) => result);

    console.log(result);

    if (result?.startsWith(PAGE_HOST)) {
      await focusPageContentTabsSequentially([tab])
    }
  }

  for (const tab of contentTabs) {
    const result = await downloadTabResources(tab, options);
    console.log(`${tab.title}: `, result)
  }
}
