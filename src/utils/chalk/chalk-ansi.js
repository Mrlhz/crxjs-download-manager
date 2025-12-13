const ansiColors = {
  // 前景色（Foreground colors）
  black: '\x1b[30m', // #000000
  red: '\x1b[31m', // #ff0000
  green: '\x1b[32m', // #00ff00
  yellow: '\x1b[33m', // #ffff00
  blue: '\x1b[34m', // #0000ff
  magenta: '\x1b[35m', // #ff00ff
  cyan: '\x1b[36m', // #00ffff
  white: '\x1b[37m', // #ffffff

  // Bright 前景色（等效于 90–97）
  blackBright: '\x1b[90m',
  redBright: '\x1b[91m',
  greenBright: '\x1b[92m',
  yellowBright: '\x1b[93m',
  blueBright: '\x1b[94m',
  magentaBright: '\x1b[95m',
  cyanBright: '\x1b[96m',
  whiteBright: '\x1b[97m',

  // 别名
  gray: '\x1b[90m',
  grey: '\x1b[90m',

  // 背景色（Background colors）
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',

  // Bright 背景色（等效于 100–107）
  bgBlackBright: '\x1b[100m',
  bgRedBright: '\x1b[101m',
  bgGreenBright: '\x1b[102m',
  bgYellowBright: '\x1b[103m',
  bgBlueBright: '\x1b[104m',
  bgMagentaBright: '\x1b[105m',
  bgCyanBright: '\x1b[106m',
  bgWhiteBright: '\x1b[107m',

  // 背景别名
  bgGray: '\x1b[100m',
  bgGrey: '\x1b[100m',

  // 重置
  reset: '\x1b[0m'
};

function createChalk(styles = []) {
  const chalkInstance = (text) => {
    if (typeof text === 'string') {
      return `${styles.map(style => ansiColors[style]).join('')}${text}${ansiColors.reset}`;
    }
    return text;
  }
  const handler = {
    get(target, prop) {
      console.log({ target, prop })
      let key = String(prop);
      if (ansiColors.hasOwnProperty(key)) {
        console.log({ styles }, key)
        return createChalk([...styles, key])
      }
      return target[prop];
    }
  }
  // 返回 Proxy 函数
  const chalk = new Proxy(chalkInstance, handler);
  return chalk;
}

const chalk = createChalk();

export default chalk;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = chalk;
} else if (typeof globalThis !== 'undefined') {
  globalThis.chalk = chalk;
} else if (typeof window !== 'undefined') {
  window.chalk = chalk;
}
