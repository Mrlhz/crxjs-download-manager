import { PAGE_HOST } from '@/global/globalConfig.js';
import { waitForTitle } from '@/global/dom/title.js';

/**
 * @fileoverview 抖音笔记页面数据提取器（在页面上下文执行的函数被注入到目标 tab）。
 *
 * 导出函数：
 *   - getNote(tab, options) -> 调用 chrome.scripting.executeScript 在指定 tab 中运行 pageExtractNote。
 *
 * pageExtractNote 在页面上下文返回对象：
 *   {
 *     name,
 *     images: [{ name, url, filename, fileName, exts, tabId, noteId, title, ... }],
 *     files: images,
 *     noteId,
 *     title,
 *     size,
 *     getSources: () => string[]
 *   }
 *
 * 可能返回错误：{ error: 'CAPTCHA_REQUIRED' } 当页面未包含预期的容器节点（可能被验证码挡住）。
 */
export async function getNote(tab, options) {
  const r = await chrome.scripting.executeScript({ target: { tabId: tab.id }, function: waitForTitle, args: [{ domain: PAGE_HOST }] });
  console.log('[getNote]', r)

  return chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: pageExtractNote,
    args: [tab, options]
  });
}

// 注入到页面中执行：提取笔记信息和图片资源
function pageExtractNote(tab, options = {}) {
  // 当页面被验证码或其它原因阻断时，提前返回
  function isBlockedByCaptcha() {
    return document.querySelector('#captcha_container') || !document.querySelector('#douyin-right-container');
  }

  if (isBlockedByCaptcha()) {
    return { error: 'CAPTCHA_REQUIRED' };
  }

  const { type, noteId } = options || {};
  console.log('tab', tab);

  if (type === '/user') {
    const userInfo = parseUserInfo();
    return {
        ...extractDetails(tab, { ...options, ...userInfo }),
        ...userInfo,
        noteId
    };
  }

  return extractDetails(tab, options);

  // 解析页面中可能存在的用户名与标题（针对 /user 类型页面）
  function parseUserInfo() {
    const userSelectors = "#video-info-wrap > div.video-info-detail.isVideoInfoOptimise > div > div.account > div.account-name.userAccountTextHover > span > span > span > span > span > span > span";
    const titleSelectors = "#video-info-wrap > div.video-info-detail.isVideoInfoOptimise > div > div.title > div > div > span > span";
    const users = Array.from(document.querySelectorAll(userSelectors)).map(el => el.innerText);
    const titles = Array.from(document.querySelectorAll(titleSelectors)).map(el => el.innerText);

    if (users.length === 2) {
      return { name: users[0].replace('@', ''), title: titles[0] };
    } else if (users.length === 3) {
      return { name: users[1].replace('@', '') || 'unknown_user', title: titles[1] || 'unknown_title' };
    }
    return {};
  }

  // 提取笔记的核心信息（标题、用户名、图片列表等）
  function extractDetails(tab, options = {}) {
    let title = options.title || tab?.title;
    if (title.startsWith('douyin.com') && document?.title) {
      title = document.title;
    }
    title = (title ? title.replace(' - 抖音', '') : options?.noteId) || '-';
    const name = options.name || document.querySelector('#douyin-right-container a[href*="//www.douyin.com/user/"] > div > span > span > span > span > span > span')?.innerText || 'unknown_user';
    const resolvedNoteId = options.noteId || (() => {
      try {
        return (new URL(tab?.url)).pathname.split('/').at(-1) || 'unknown_note_id';
      } catch (e) {
        return 'unknown_note_id';
      }
    })();

    const sources = collectImageSources();
    const images = buildImageObjects({ sources, title, name, noteId: resolvedNoteId, tabId: tab?.id }, options);

    return {
      name,
      images,
      files: images,
      noteId: resolvedNoteId,
      title,
      size: images.length,
      getSources() { return sources; }
    };
  }

  // 收集并去重页面中图片资源链接
  function collectImageSources() {
    const nodes = Array.from(document.querySelectorAll('#douyin-right-container .focusPanel img'));
    const srcs = nodes.map(img => img.getAttribute('src')).filter(Boolean);
    return Array.from(new Set(srcs));
  }

  // 根据源数组构建可下载的图片对象数组
  function buildImageObjects({ sources, title, name, noteId, tabId, all = false }, options = {}) {
    const { all } = options;
    const filenamePrefix = `${name}`;
    return sources
      .filter(src => src && !src.endsWith('.mp3'))
      .map((url, index) => {
        const extMatch = url.match(/\.(jpg|jpeg|png|gif|webp|bmp|tiff)(\?|$)/i);
        const extension = extMatch ? extMatch[1] : 'jpg';
        const fileName = title === noteId ? `${noteId}-${index + 1}.${extension}` : `${title}_${noteId}-${index + 1}.${extension}`;
        const filename = `${filenamePrefix}/${fileName}`;
        return {
          type: 'note',
          name,
          url,
          filename,
          fileName,
          exts: ['.jpg', '.jpeg'],
          tabId,
          noteId,
          title,
          sourcePlatform: options?.platform || '',
          sourceUrl: url,
          sourcePageUrl: tab.url,
          ...(all ? { all: true } : {})
        };
      });
  }
}
