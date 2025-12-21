/**
 * 文件保存错误类
 * @class
 * @extends Error
 */
export class SaveFileError extends Error {
  /**
   * 创建文件保存错误实例
   * @param {string} message - 错误消息
   * @param {Error} [originalError] - 原始错误
   */
  constructor(message, originalError = null) {
    super(message);
    this.name = 'SaveFileError';
    this.originalError = originalError;
  }
}
