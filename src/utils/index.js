
// https://github.com/vuejs/router/blob/main/packages/router/src/encoding.ts
export const PLUS_RE = /\+/g // %2B
export function decode(text) {
  try {
    return decodeURIComponent('' + text)
  } catch (err) {
    console.error(`Error decoding "${text}". Using original value`)
  }
  return '' + text
}

/**
 * @link https://github.com/vuejs/router/blob/main/packages/router/src/query.ts
 * @param {*} search 
 * @returns 
 */
export function parseQuery(search = '') {
  const query = {}
  // avoid creating an object with an empty key and empty value
  // because of split('&')
  if (search === '' || search === '?') return query
  if (search?.includes('?')) {
    search = search.split('?')[1]
  }
  const hasLeadingIM = search[0] === '?'
  const searchParams = (hasLeadingIM ? search.slice(1) : search).split('&')
  for (let i = 0; i < searchParams.length; ++i) {
    // pre decode the + into space
    const searchParam = searchParams[i].replace(PLUS_RE, ' ')
    // allow the = character
    const eqPos = searchParam.indexOf('=')
    const key = decode(eqPos < 0 ? searchParam : searchParam.slice(0, eqPos))
    const value = eqPos < 0 ? null : decode(searchParam.slice(eqPos + 1))

    if (key in query) {
      // an extra variable for ts types
      let currentValue = query[key]
      if (!isArray(currentValue)) {
        currentValue = query[key] = [currentValue]
      }
      // we force the modification
      ;currentValue.push(value)
    } else {
      query[key] = value
    }
  }
  return query
}

export function safeFileName2(str, replace = '-') {
  // return str.replace(/[\\\/\:\*\?\"\<\>\|]/g, replace)
  // str.replace(/[^\u4e00-\u9fa5a-zA-Z0-9，。]/g, '')
  // str.replace(/[^\u4e00-\u9fa5\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEFa-zA-Z\s\.,!?;:()\-“”‘’“”\[\]\{\}\/\<\>\@\#\$\%\^\&\*\_\+\=\\\|~`]/g, '');

  // 正则表达式解释：
  // \p{Script=Han} 匹配汉字
  // \p{L} 匹配任何字母（包括汉字、拉丁字母等）‌
  // [a-zA-Z] 匹配英文字母
  // \d 匹配数字
  // \p{P} 匹配标点符号（包括全角和半角）
  // [^...] 匹配不在括号内的任何字符，在这里用于匹配非中英文和非数字标点符号的部分
  // 全局替换为空字符串，即移除这些字符
  return str
    // .replace(/\n/g, ' ')
    .replace(/[\\\/\:\：\*\?\"\<\>\|]/g, replace)
    .replace(/[^\p{Script=Han}\p{L}\d\p{P}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/\./g, '_')
    // .replace(/[^\u4e00-\u9fa5\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEFa-zA-Z\s\.,!?;()\-“”‘’“”\[\]\{\}\/\<\>\@\#\$\%\^\&\*\_\+\=\\\|~•`]/g, '')
}

export function safeFileName(str, replace = '-') {
  return str
    // 替换 Windows 文件名非法字符
    .replace(/[\\/:：*?"<>|]/g, replace)
    // 移除不可识别或非语言字符（保留汉字、字母、数字、标点、空格）
    .replace(/[^\p{Script=Han}\p{L}\d\p{P}\s]/gu, '')
    // 合并多余空格
    .replace(/\s+/g, ' ')
    // 替换点号，避免隐藏文件或扩展名冲突
    .replace(/\./g, '_')
    // 去除首尾空格
    .trim();
}

// 保留扩展名
export function safeFileNameWithExtension(filename, replace = '-') {
  const parts = filename.split('.');
  const ext = parts.length > 1 ? parts.pop() : '';
  const name = parts.join('.');
  const safeName = safeFileName(name, replace);
  return ext ? `${safeName}.${ext}` : safeName;
}

// 防止保留名称（Windows）
function isReservedName(name) {
  return /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(name);
}

export function safeFileNameFinal(str, replace = '-') {
  let name = safeFileName(str, replace);
  if (isReservedName(name)) {
    name = '_' + name;
  }
  return name;
}


// 格式特征‌
// 该字符串以 "MS4" 开头，总长度为76个字符
// 包含大写字母、小写字母、数字、加号(+)、斜杠(/)、下划线(_)等字符
// 符合Base64编码的典型特征
// 编码类型判断‌
// Base64编码特征：‌
// 字符串长度是4的倍数（76 ÷ 4 = 19）
// 字符集符合Base64标准：A-Z, a-z, 0-9, +, /, =
// 开头"MS4"解码后可能表示特定标识
function extractPageUserId(url) {
  // 精确匹配MS4开头且长度为76的ID
  const regex = /\/user\/(MS4[\w+/=]{72})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}
export function getPageUserIdFromUrl(url) {
  // return extractPageUserId(url);
  try {
    const { pathname } = new URL(url);
    const [_, id] = pathname.split('user/');
    if (id && id.startsWith('MS4')) {
      return id;
    }
  } catch (error) {
    return null;
  }
  return ''
}

// 获取https://www.xxxxx.com/video/6852149717439089928 或者https://www.xxxxx.com/note/7578455648053453193 中的ID
export function getNoteId(url) {
  try {
    const { pathname } = new URL(url);
    const parts = pathname.split('/');
    if (parts.length >= 3) {
      const id = parts[2];
      return id;
    }
  } catch (error) {
    return null;
  }
  return null;
}

// lodash pick function
export function pick(obj = {}, keys = []) {
  return keys.reduce((result, key) => {
    if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = obj[key];
    }
    return result;
  }, {});
}
