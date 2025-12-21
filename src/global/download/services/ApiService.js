import { SaveFileError } from '../errors/SaveFileError.js';

/**
 * API服务 - 负责与后端API通信
 * @class
 */
export class ApiService {
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
      throw new SaveFileError('保存文件元数据失败', error);
    }
  }
}
