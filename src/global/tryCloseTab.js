// 尝试关闭tab
export async function tryCloseTab(tab) {
  const { id: tabId } = tab;
  console.log('Force closing tab:', tab);
  if (!tabId) {
    console.log('Invalid tabId, cannot close tab.');
    return false;
  }
  await chrome.tabs.remove(tabId).then(() => {
    console.log(`Tab ${tabId} force closed.`);
    return true;
  }).catch((error) => {
    console.log('Error force closing tab:', { error, tab });
    return false;
  });
}
