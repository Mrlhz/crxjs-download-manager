import { PAGE_HOST } from '@/global/globalConfig.js';
import { waitForTitle } from '@/global/dom/title.js';

/**
 * Injects a content script into the given tab to extract video metadata and download targets.
 *
 * @param {chrome.tabs.Tab} tab - Chrome tab object.
 * @param {Object} [options] - Options forwarded to the page script.
 * @returns {Promise<*>} Result of chrome.scripting.executeScript invocation.
 */
export async function getVideo(tab, options) {
  const r = await chrome.scripting.executeScript({ target: { tabId: tab.id }, function: waitForTitle, args: [{ domain: PAGE_HOST }] });
  console.log('[getVideo]', r)
  return chrome.scripting.executeScript({ target: { tabId: tab.id }, function: extractVideoData, args: [tab, options] });
}

/**
 * Run in page context: extract video sources and metadata for the current Douyin page.
 *
 * @param {Object} tab - Tab object passed from extension context.
 * @param {Object} [options={}] - Extraction options (e.g. type, noteId, name, title, all).
 * @returns {Object} Extraction result or error object.
 */
function extractVideoData(tab, options = {}) {
  // 验证码
  if (document.querySelector('#captcha_container') || !document.querySelector('#douyin-right-container')) {
    return { error: 'CAPTCHA_REQUIRED' };
  }
  const { type, noteId } = options || {};
  if (type === '/user') {
    const info = getUserInfo(tab, options);
    return {
      ...getVideoDetails(tab, { ...options, ...info }),
      ...info,
      noteId
    }
  }

  return getVideoDetails(tab, options);

  function getUserInfo(tab, options = {}) {
    const users = [...document.querySelectorAll("#video-info-wrap > div.video-info-detail.isVideoInfoOptimise > div > div.account > div.account-name.userAccountTextHover > span > span > span > span > span > span > span")].map(v => v.innerText);
    const titles = Array.from(document.querySelectorAll("#video-info-wrap > div.video-info-detail.isVideoInfoOptimise > div > div.title > div > div > span > span")).map(v => v.innerText);
    if (users.length === 2) {
      return {
        name: users[0]?.replace('@', ''),
        title: titles[0],
      }
    } else if (users.length === 3) {
      return {
        name: users[1]?.replace('@', '') || 'unknown_user',
        title: titles[1] || 'unknown_title',
      }
    }
  }

  function getVideoDetails(tab, options = {}) {
    console.log('tab', tab);
    // 标题
    let title = options.title || tab?.title;
    if (title.startsWith('douyin.com') && document?.title) {
      title = document.title;
    }
    title = (title ? title.replace(' - 抖音', '') : options?.noteId) || '-';
    // 用户名
    const name = options.name || document.querySelector('#douyin-right-container a[href*="//www.douyin.com/user/"] > div > span > span > span > span > span > span')?.innerText;
    const noteId = options?.noteId || (new URL(tab?.url)).pathname.split('/').at(-1) || 'unknown_note_id';

    const filenamePrefix = `${name}`;
    const sources = [...document.querySelectorAll('video source')]
      .map(source => source.getAttribute('src'))
      .filter(src => src && !src.endsWith('.mp3'))
      .map((url, index) => {
        const extensionMatch = url.match(/\.(mp4|webm|ogg)(\?|$)/i);
        const extension = extensionMatch ? extensionMatch[1] : 'mp4';
        const fileName = title === noteId ? `${noteId}.${extension}` : `${title}_${noteId}.${extension}`;
        return {
          type: 'video',
          name,
          url,
          filename: `${filenamePrefix}/${fileName}`,
          fileName,
          tabId: tab.id,
          noteId,
          title,
          sourcePlatform: options?.platform || '',
          sourceUrl: url,
          sourcePageUrl: tab.url,
          ...(options.all ? { all: true } : {})
        };
      });

    console.log({ sources });

    return {
      name,
      videos: sources,
      files: [sources.at(-1)],
      noteId,
      title,
      size: sources.length,
      getSources() {
        return sources;
      }
    }
  }
}
