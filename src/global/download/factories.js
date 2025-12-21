// factories.js

import { DownloadService } from './services/DownloadService.js';
import { BatchDownloadService } from './services/BatchDownloadService.js';

/**
 * 创建并配置下载服务
 * @param {Object} config - 配置选项
 * @param {string} [config.apiBaseUrl='http://localhost:3000'] - API基础URL
 * @param {Function} [config.onDownloadComplete] - 下载完成回调
 * @param {Function} [config.onError] - 错误回调
 * @returns {DownloadService} 配置好的下载服务实例
 */
export function createDownloadService(config = {}) {
  return new DownloadService(config);
}

/**
 * 创建并配置批量下载服务
 * @param {Object} config - 配置选项
 * @param {number} [config.maxConcurrent=3] - 最大并发数
 * @param {string} [config.apiBaseUrl='http://localhost:3000'] - API基础URL
 * @returns {BatchDownloadService} 配置好的批量下载服务实例
 */
export function createBatchDownloadService(config = {}) {
  const { maxConcurrent = 3, apiBaseUrl } = config;
  const downloadService = new DownloadService({ apiBaseUrl });
  return new BatchDownloadService(downloadService, maxConcurrent);
}
