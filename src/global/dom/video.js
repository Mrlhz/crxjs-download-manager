
export function getVideo(tab, options) {
  return chrome.scripting.executeScript({ target: { tabId: tab.id }, function: getSources, args: [tab, options] });
}

function getSources(tab, options = {}) {
  // 验证码
  if (!document.querySelector('#douyin-right-container')) {
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
    const noteId = options.noteId || (new URL(tab?.url)).pathname.split('/').at(-1) || 'unknown_note_id';

    const filenamePrefix = `${name}`;
    const sources = [...document.querySelectorAll('video source')]
      .map(source => source.getAttribute('src'))
      .filter(src => src && !src.endsWith('.mp3'))
      .map((url, index) => {
        const extensionMatch = url.match(/\.(mp4|webm|ogg)(\?|$)/i);
        const extension = extensionMatch ? extensionMatch[1] : 'mp4';
        const filename = title === noteId ? `${filenamePrefix}/${noteId}.${extension}` : `${filenamePrefix}/${title}_${noteId}.${extension}`;
        return {
          type: 'video',
          name,
          url,
          filename,
          fileName: `${title}_${noteId}.${extension}`,
          tabId: tab.id,
          noteId,
          title,
          ...(options.all ? { all: true } : {}),
          __source: []
        };
      });

    // 设置source，重试下载时用到
    sources.forEach(item => {
      item.__source = [...sources].map(V => V);
    });

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


console.log('video.js loaded');

(function () {
	'use strict';
  console.log('video.js executing...');
  if (typeof browser !== 'undefined') {
    console.log('browser is defined');
  } else {
    console.log('browser is not defined');
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.browser === 'undefined') {
    Object.defineProperty(globalThis, 'browser', {
      get() {
        return {
          getVideo,
          getSources
        };
      },
      configurable: true,
      enumerable: true
    });
    console.log('browser has been defined on globalThis');
  }
})();