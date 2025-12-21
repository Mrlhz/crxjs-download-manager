/**
 * @typedef {import('../types.js').DownloadOptions} DownloadOptions
 * @typedef {import('../types.js').DownloadResult} DownloadResult
 */

/**
 * 批量下载服务 - 支持批量下载和并发控制
 * @class
 */
export class BatchDownloadService {
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
