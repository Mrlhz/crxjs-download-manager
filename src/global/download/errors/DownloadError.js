import { DownloadErrorType } from '../utils/constants.js';

/**
 * 自定义下载错误类
 * @class
 * @extends Error
 */
export class DownloadError extends Error {
  /**
   * 创建下载错误实例
   * @param {string} message - 错误消息
   * @param {string} type - 错误类型
   * @param {Error} [originalError] - 原始错误
   */
  constructor(message, type, originalError = null) {
    super(message);
    this.name = 'DownloadError';
    this.type = type;
    this.originalError = originalError;
  }
}
