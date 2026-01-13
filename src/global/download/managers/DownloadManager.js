import { DownloadError } from '../errors/DownloadError.js';
import { DownloadErrorType } from '../utils/constants.js';
import { DownloadState } from '../utils/constants.js';

/**
 * @typedef {import('../types.js').DownloadOptions} DownloadOptions
 * @typedef {import('../types.js').DownloadMetadata} DownloadMetadata
 */

/**
 * 下载管理器 - 负责管理Chrome下载API的调用和事件监听
 * @class
 */
export class DownloadManager {
  constructor() {
    /** @private @type {Map<number, Function>} */
    this._listeners = new Map();
    
    /** @private @type {Map<number, DownloadMetadata>} */
    this._downloadMap = new Map();
    
    this._setupGlobalListener();
  }

  /**
   * 设置全局下载监听器
   * @private
   */
  _setupGlobalListener() {
    chrome.downloads.onChanged.addListener(this._handleDownloadChange.bind(this));
  }

  /**
   * 处理下载变化事件
   * @private
   * @param {chrome.downloads.DownloadDelta} delta - 下载变化数据
   */
  _handleDownloadChange(delta) {
    const listener = this._listeners.get(delta.id);
    if (listener) {
      listener(delta);
    }
  }

  /**
   * 开始下载文件
   * @param {DownloadOptions} options - 下载选项
   * @returns {Promise<DownloadResult>} 下载结果
   */
  download(options) {
    return new Promise((resolve, reject) => {
      chrome.downloads.download(
        { url: options.url, filename: options.filename },
        (downloadId) => {
          if (chrome.runtime.lastError || downloadId === undefined) {
            const error = chrome.runtime.lastError || new Error('下载失败');
            console.log('下载初始化失败:', error);
            return reject(new DownloadError(
              error.message,
              DownloadErrorType.DOWNLOAD_FAILED,
              error
            ));
          }
          
          this._setupDownloadListener(downloadId, options, resolve, reject);
        }
      );
    });
  }

  /**
   * 设置下载监听器
   * @private
   * @param {number} downloadId - 下载ID
   * @param {DownloadOptions} options - 下载选项
   * @param {Function} resolve - Promise resolve函数
   * @param {Function} reject - Promise reject函数
   */
  _setupDownloadListener(downloadId, options, resolve, reject) {
    const listener = (delta) => {
      if (delta.id === downloadId) {
        this._updateDownloadMetadata(downloadId, delta, options);
      
        const state = delta?.state?.current;
        if (state === DownloadState.COMPLETE) {
          const metadata = this._downloadMap.get(downloadId);
          this._cleanupListener(downloadId);
          resolve({
            downloadId,
            delta: metadata,
            options
          });
        } else if (state === DownloadState.INTERRUPTED) {
          this._cleanupListener(downloadId);
          reject(new DownloadError('下载被中断', DownloadErrorType.DOWNLOAD_INTERRUPTED));
        } else if (delta?.error || delta?.error?.current) {
          this._cleanupListener(downloadId);
          reject(new DownloadError(`下载失败: ${delta?.error?.current || delta?.error}`, DownloadErrorType.DOWNLOAD_ERROR));
        }
      }
    };
    
    this._listeners.set(downloadId, listener);
  }
  
  /**
   * 更新下载元数据
   * @private
   * @param {number} downloadId - 下载ID
   * @param {chrome.downloads.DownloadDelta} delta - 下载变化数据
   * @param {DownloadOptions} options - 下载选项
   */
  _updateDownloadMetadata(downloadId, delta, options) {
    const metadata = {
      filename: delta.filename?.current,
      size: delta.fileSize?.current,
      sourcePlatform: options.sourcePlatform || 'douyin',
      sourceUrl: options.sourceUrl,
      sourcePageUrl: options.sourcePageUrl || '',
      platformMetadata: {
        authorName: options.name,
        contentId: options.noteId,
        title: options.title,
        ...(options.metadata || {})
      }
    };

    if (this._downloadMap.has(downloadId)) {
      const existing = this._downloadMap.get(downloadId);
      this._downloadMap.set(downloadId, {
        ...existing,
        filename: existing.filename ?? metadata?.filename,
        size: existing.size ?? metadata?.size
      });
    } else {
      this._downloadMap.set(downloadId, metadata);
    }
  }

  /**
   * 清理监听器
   * @private
   * @param {number} downloadId - 下载ID
   */
  _cleanupListener(downloadId) {
    this._listeners.delete(downloadId);
    this._downloadMap.delete(downloadId);
  }
}
