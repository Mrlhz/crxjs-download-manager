// legacy.js

import { DownloadManager } from './managers/DownloadManager.js';
import { ApiService } from './services/ApiService.js';
import { DownloadService } from './services/DownloadService.js';

/**
 * 保存文件到服务器（原始函数，保持向后兼容）
 * @param {import('./types.js').SaveFileRequest} [file={}] - 文件数据
 * @returns {Promise<Object>} 服务器响应
 */
export async function saveFile(file = {}) {
  const apiService = new ApiService();
  return apiService.saveFile(file);
}

/**
 * 下载文件（原始函数，保持向后兼容）
 * @param {import('./types.js').DownloadOptions} [downloadOptions={}] - 下载选项
 * @returns {Promise<import('./types.js').DownloadResult>} 下载结果
 */
export function download(downloadOptions = {}) {
  const downloadManager = new DownloadManager();
  return downloadManager.download(downloadOptions);
}

/**
 * 下载文件并保存元数据（原始函数，保持向后兼容）
 * @param {import('./types.js').DownloadOptions} [downloadOptions={}] - 下载选项
 * @returns {Promise<import('./types.js').DownloadResult | Error>} 下载结果或错误
 */
export async function downloadWithSave(downloadOptions = {}) {
  const downloadService = new DownloadService();
  try {
    return await downloadService.downloadAndSave(downloadOptions);
  } catch (error) {
    return error; // 注意：这里返回 Error 实例而非 throw，符合原始行为
  }
}
