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
