import { DownloadManager } from '../managers/DownloadManager.js';
import { ApiService } from './ApiService.js';
import { SaveFileError } from '../errors/SaveFileError.js';

/**
 * @typedef {import('../types.js').DownloadOptions} DownloadOptions
 * @typedef {import('../types.js').DownloadResult} DownloadResult
 */

/**
 * 主下载服务 - 整合下载管理和API调用
 * @class
 */
export class DownloadService {
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
