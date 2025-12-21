/**
 * @typedef {Object} DownloadOptions
 * @property {string} url - 要下载的文件的URL
 * @property {string} filename - 下载后的文件名
 * @property {string} [sourcePlatform='douyin'] - 来源平台
 * @property {string} [sourceUrl] - 源文件URL
 * @property {string} [sourcePageUrl] - 源页面URL
 * @property {string} [name] - 作者名称
 * @property {string} [noteId] - 内容ID
 * @property {string} [title] - 标题
 * @property {Object} [metadata] - 额外的元数据
 */

/**
 * @typedef {Object} DownloadMetadata
 * @property {string} [filename] - 文件名
 * @property {number} [size] - 文件大小
 * @property {string} sourcePlatform - 来源平台
 * @property {string} [sourceUrl] - 源文件URL
 * @property {string} [sourcePageUrl] - 源页面URL
 * @property {Object} platformMetadata - 平台元数据
 * @property {string} [platformMetadata.authorName] - 作者名称
 * @property {string} [platformMetadata.contentId] - 内容ID
 * @property {string} [platformMetadata.title] - 标题
 */

/**
 * @typedef {Object} DownloadResult
 * @property {number} downloadId - 下载ID
 * @property {DownloadMetadata} delta - 下载元数据
 * @property {DownloadOptions} options - 下载选项
 */

/**
 * @typedef {Object} SaveFileRequest
 * @property {string} [filename] - 文件名
 * @property {number} [size] - 文件大小
 * @property {string} sourcePlatform - 来源平台
 * @property {string} [sourceUrl] - 源文件URL
 * @property {string} [sourcePageUrl] - 源页面URL
 * @property {Object} platformMetadata - 平台元数据
 * @property {string} [platformMetadata.authorName] - 作者名称
 * @property {string} [platformMetadata.contentId] - 内容ID
 * @property {string} [platformMetadata.title] - 标题
 */

/**
 * 下载状态常量
 * @enum {string}
 */
const DownloadState = {
  COMPLETE: 'complete',
  INTERRUPTED: 'interrupted'
};

/**
 * 错误类型常量
 * @enum {string}
 */
const DownloadErrorType = {
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  DOWNLOAD_INTERRUPTED: 'DOWNLOAD_INTERRUPTED',
  DOWNLOAD_ERROR: 'DOWNLOAD_ERROR',
  SAVE_FAILED: 'SAVE_FAILED'
};

/**
 * 自定义下载错误类
 * @class
 * @extends Error
 */
class DownloadError extends Error {
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

/**
 * 文件保存错误类
 * @class
 * @extends Error
 */
class SaveFileError extends Error {
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

/**
 * 下载管理器 - 负责管理Chrome下载API的调用和事件监听
 * @class
 */
class DownloadManager {
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
            console.error('下载初始化失败:', error);
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
      console.log(delta);
      if (delta.id === downloadId) {
      // if (delta.id !== downloadId) {
      //   console.log('下载ID不匹配，跳过:', delta.id, downloadId);
      //   return;
      // }
      
      this._updateDownloadMetadata(downloadId, delta, options);
      
      if (delta?.state?.current === DownloadState.COMPLETE) {
        const metadata = this._downloadMap.get(downloadId);
        console.log({ metadata })
        this._cleanupListener(downloadId);
        resolve({
          downloadId,
          delta: metadata,
          options
        });
      } else if (delta?.state?.current === DownloadState.INTERRUPTED) {
        this._cleanupListener(downloadId);
        reject(new DownloadError(
          '下载被中断',
          DownloadErrorType.DOWNLOAD_INTERRUPTED
        ));
      } else if (delta?.error || delta?.error?.current) {
        this._cleanupListener(downloadId);
        reject(new DownloadError(
          `下载失败: ${delta?.error?.current || delta?.error}`,
          DownloadErrorType.DOWNLOAD_ERROR
        ));
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
    if (!this._downloadMap.has(downloadId)) {
      this._downloadMap.set(downloadId, {
        filename: delta.filename ? delta.filename.current : undefined,
        size: delta.fileSize ? delta.fileSize.current : undefined,
        sourcePlatform: options.sourcePlatform || 'douyin',
        sourceUrl: options.sourceUrl,
        sourcePageUrl: options.sourcePageUrl || '',
        platformMetadata: {
          authorName: options.name,
          contentId: options.noteId,
          title: options.title,
          ...(options.metadata || {})
        }
      });
    } else {
      const existing = this._downloadMap.get(downloadId);
      this._downloadMap.set(downloadId, {
        ...existing,
        filename: existing.filename || (delta.filename ? delta.filename.current : undefined),
        size: existing.size ?? (delta.fileSize ? delta.fileSize.current : undefined)
      });
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

/**
 * API服务 - 负责与后端API通信
 * @class
 */
class ApiService {
  /**
   * 创建API服务实例
   * @param {string} [baseUrl='http://localhost:3000'] - 基础URL
   */
  constructor(baseUrl = 'http://localhost:3000') {
    /** @private @type {string} */
    this._baseUrl = baseUrl;
  }
  
  /**
   * 保存文件元数据到服务器
   * @param {SaveFileRequest} data - 要保存的数据
   * @returns {Promise<Object>} 服务器响应
   */
  async saveFile(data) {
    try {
      const response = await fetch(`${this._baseUrl}/douyin/saveFile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      throw new SaveFileError(
        '保存文件元数据失败',
        error
      );
    }
  }
}

/**
 * 主下载服务 - 整合下载管理和API调用
 * @class
 */
class DownloadService {
  /**
   * 创建下载服务实例
   * @param {Object} config - 配置选项
   * @param {string} [config.apiBaseUrl='http://localhost:3000'] - API基础URL
   * @param {Function} [config.onDownloadComplete] - 下载完成回调
   * @param {Function} [config.onError] - 错误回调
   */
  constructor(config = {}) {
    /** @private @type {DownloadManager} */
    this._downloadManager = new DownloadManager();
    
    /** @private @type {ApiService} */
    this._apiService = new ApiService(config.apiBaseUrl);
    
    /** @private @type {Function|undefined} */
    this._onDownloadComplete = config.onDownloadComplete;
    
    /** @private @type {Function|undefined} */
    this._onError = config.onError;
  }
  
  /**
   * 下载文件
   * @param {DownloadOptions} options - 下载选项
   * @returns {Promise<DownloadResult>} 下载结果
   */
  async download(options) {
    try {
      const result = await this._downloadManager.download(options);
      
      if (typeof this._onDownloadComplete === 'function') {
        this._onDownloadComplete(result);
      }
      
      return result;
    } catch (error) {
      this._handleError(error, { operation: 'download', options });
      throw error;
    }
  }
  
  /**
   * 下载文件并保存元数据到服务器
   * @param {DownloadOptions} options - 下载选项
   * @returns {Promise<DownloadResult>} 下载结果
   */
  async downloadAndSave(options) {
    try {
      const result = await this.download(options);
      await this._saveMetadata(result);
      return result;
    } catch (error) {
      this._handleError(error, { operation: 'downloadAndSave', options });
      throw error;
    }
  }
  
  /**
   * 保存元数据到服务器
   * @private
   * @param {DownloadResult} result - 下载结果
   * @returns {Promise<void>}
   */
  async _saveMetadata(result) {
    if (!result?.delta) {
      this._handleError(new SaveFileError('无元数据', error), { operation: 'saveMetadata', result });
      return;
    }
    try {
      await this._apiService.saveFile(result?.delta);
    } catch (error) {
      console.warn('保存元数据失败:', error);
      
      if (error instanceof SaveFileError) {
        this._handleError(error, {
          operation: 'saveMetadata',
          result
        });
      }
    }
  }
  
  /**
   * 处理错误
   * @private
   * @param {Error} error - 错误对象
   * @param {Object} context - 错误上下文
   */
  _handleError(error, context) {
    console.error('下载服务错误:', error, context);
    
    if (typeof this._onError === 'function') {
      this._onError(error, context);
    }
  }
}

/**
 * 批量下载服务 - 支持批量下载和并发控制
 * @class
 */
class BatchDownloadService {
  /**
   * 创建批量下载服务实例
   * @param {DownloadService} downloadService - 下载服务实例
   * @param {number} [maxConcurrent=3] - 最大并发数
   */
  constructor(downloadService, maxConcurrent = 3) {
    /** @private @type {DownloadService} */
    this._downloadService = downloadService;
    
    /** @private @type {number} */
    this._maxConcurrent = maxConcurrent;
    
    /** @private @type {Array<Object>} */
    this._queue = [];
    
    /** @private @type {number} */
    this._activeDownloads = 0;
  }
  
  /**
   * 添加下载任务到队列
   * @param {DownloadOptions} options - 下载选项
   * @returns {Promise<DownloadResult>} 下载结果
   */
  addToQueue(options) {
    return new Promise((resolve, reject) => {
      this._queue.push({ options, resolve, reject });
      this._processQueue();
    });
  }
  
  /**
   * 处理下载队列
   * @private
   * @returns {Promise<void>}
   */
  async _processQueue() {
    if (this._activeDownloads >= this._maxConcurrent || this._queue.length === 0) {
      return;
    }
    
    const task = this._queue.shift();
    if (!task) return;
    
    this._activeDownloads++;
    
    try {
      const result = await this._downloadService.downloadAndSave(task.options);
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    } finally {
      this._activeDownloads--;
      this._processQueue();
    }
  }
  
  /**
   * 批量添加下载任务
   * @param {DownloadOptions[]} optionsList - 下载选项列表
   * @returns {Promise<Array<DownloadResult|Error>>} 下载结果数组
   */
  async addBatchToQueue(optionsList) {
    const promises = optionsList.map(options => 
      this.addToQueue(options).catch(error => error)
    );
    return Promise.all(promises);
  }
  
  /**
   * 清空下载队列
   */
  clearQueue() {
    this._queue = [];
  }
  
  /**
   * 获取队列状态
   * @returns {Object} 队列状态
   */
  getQueueStatus() {
    return {
      queueLength: this._queue.length,
      activeDownloads: this._activeDownloads,
      maxConcurrent: this._maxConcurrent
    };
  }
}

/**
 * 保存文件到服务器（原始函数，保持向后兼容）
 * @param {Object} [file={}] - 文件数据
 * @returns {Promise<Object>} 服务器响应
 */
export async function saveFile(file = {}) {
  const apiService = new ApiService();
  return apiService.saveFile(file);
}

/**
 * 下载文件（原始函数，保持向后兼容）
 * @param {DownloadOptions} [downloadOptions={}] - 下载选项
 * @returns {Promise<DownloadResult>} 下载结果
 */
export function download(downloadOptions = {}) {
  const downloadManager = new DownloadManager();
  return downloadManager.download(downloadOptions);
}

/**
 * 下载文件并保存元数据（原始函数，保持向后兼容）
 * @param {DownloadOptions} [downloadOptions={}] - 下载选项
 * @returns {Promise<DownloadResult|Error>} 下载结果或错误
 */
export async function downloadWithSave(downloadOptions = {}) {
  const downloadService = new DownloadService();
  try {
    return await downloadService.downloadAndSave(downloadOptions);
  } catch (error) {
    return error;
  }
}

// 导出主要类
export {
  DownloadError,
  SaveFileError,
  DownloadService,
  BatchDownloadService,
  ApiService
};

// 导出类型定义（仅用于文档目的）
export const Types = {
  DownloadOptions: /** @type {DownloadOptions} */ ({}),
  DownloadMetadata: /** @type {DownloadMetadata} */ ({}),
  DownloadResult: /** @type {DownloadResult} */ ({}),
  SaveFileRequest: /** @type {SaveFileRequest} */ ({})
};

/**
 * 创建并配置下载服务
 * @param {Object} config - 配置选项
 * @returns {DownloadService} 配置好的下载服务
 */
export function createDownloadService(config = {}) {
  return new DownloadService(config);
}

/**
 * 创建并配置批量下载服务
 * @param {Object} config - 配置选项
 * @param {number} [config.maxConcurrent=3] - 最大并发数
 * @param {string} [config.apiBaseUrl] - API基础URL
 * @returns {BatchDownloadService} 配置好的批量下载服务
 */
export function createBatchDownloadService(config = {}) {
  const downloadService = new DownloadService({
    apiBaseUrl: config.apiBaseUrl
  });
  return new BatchDownloadService(downloadService, config.maxConcurrent);
}
