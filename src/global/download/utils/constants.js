/**
 * 下载状态常量
 * @enum {string}
 */
export const DownloadState = {
  COMPLETE: 'complete',
  INTERRUPTED: 'interrupted'
};

/**
 * 错误类型常量
 * @enum {string}
 */
export const DownloadErrorType = {
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  DOWNLOAD_INTERRUPTED: 'DOWNLOAD_INTERRUPTED',
  DOWNLOAD_ERROR: 'DOWNLOAD_ERROR',
  SAVE_FAILED: 'SAVE_FAILED'
};
