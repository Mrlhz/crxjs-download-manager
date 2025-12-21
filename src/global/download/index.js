// 错误类
export { DownloadError } from './errors/DownloadError.js';
export { SaveFileError } from './errors/SaveFileError.js';

// 服务类
export { ApiService } from './services/ApiService.js';
export { DownloadManager } from './managers/DownloadManager.js';
export { DownloadService } from './services/DownloadService.js';
export { BatchDownloadService } from './services/BatchDownloadService.js';

// 常量
export { DownloadState, DownloadErrorType } from './utils/constants.js';

// 工厂函数
// export { createDownloadService, createBatchDownloadService } from './factories.js';

// 兼容旧 API（函数式调用）
export { download, downloadWithSave, saveFile } from './legacy.js';
