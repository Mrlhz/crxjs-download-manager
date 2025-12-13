// ========== Chalk 实现 ==========
const styles = {
  // 前景色 (Text Colors)
  black: 'color: #000000;',
  red: 'color: #ff0000;',
  green: 'color: #00ff00;',
  yellow: 'color: #ffff00;',
  blue: 'color: #0000ff;',
  magenta: 'color: #ff00ff;',
  cyan: 'color: #00ffff;',
  white: 'color: #ffffff;',

  blackBright: 'color: #808080;',
  redBright: 'color: #ff5555;',
  greenBright: 'color: #55ff55;',
  yellowBright: 'color: #ffff55;',
  blueBright: 'color: #5555ff;',
  magentaBright: 'color: #ff55ff;',
  cyanBright: 'color: #55ffff;',
  whiteBright: 'color: #ffffff; text-shadow: 0 0 4px rgba(255,255,255,0.7);', // 白亮色加发光效果

  // 背景色 (Background Colors)
  bgBlack: 'background-color: #000000;',
  bgRed: 'background-color: #ff0000;',
  bgGreen: 'background-color: #00ff00;',
  bgYellow: 'background-color: #ffff00;',
  bgBlue: 'background-color: #0000ff;',
  bgMagenta: 'background-color: #ff00ff;',
  bgCyan: 'background-color: #00ffff;',
  bgWhite: 'background-color: #ffffff;',

  bgBlackBright: 'background-color: #808080;',
  bgRedBright: 'background-color: #ff5555;',
  bgGreenBright: 'background-color: #55ff55;',
  bgYellowBright: 'background-color: #ffff55;',
  bgBlueBright: 'background-color: #5555ff;',
  bgMagentaBright: 'background-color: #ff55ff;',
  bgCyanBright: 'background-color: #55ffff;',
  bgWhiteBright: 'background-color: #ffffff; box-shadow: inset 0 0 8px rgba(255,255,255,0.5);',

  // 文本样式
  bold: 'font-weight: bold;',
  underline: 'text-decoration: underline;',
  italic: 'font-style: italic;'
};

// 别名映射
const aliases = {
  gray: 'blackBright',
  grey: 'blackBright',
  bgGray: 'bgBlackBright',
  bgGrey: 'bgBlackBright'
};

// 创建 chalk 函数
function createChalk(accStyle = '') {
  const handler = {
    get(target, prop) {
      let key = prop;
      if (aliases[prop]) {
        key = aliases[prop];
      }
      if (styles[key]) {
        return createChalk(accStyle + ' ' + styles[key]);
      }
      // 支持直接调用无参数获取样式（用于高级组合）
      if (prop === '__style') {
        return accStyle;
      }
      return createChalk(accStyle); // 未知属性忽略（容错）
    }
  }
  const chalk = new Proxy(function (text) {
    if (typeof text === 'string') {
      console.log(`%c${text}`, accStyle);
    } else {
      // 如果不传参数，返回当前样式字符串（用于组合）
      return {
        __style: accStyle
      };
    }
  }, handler);

  return chalk;
}

const chalk = createChalk();