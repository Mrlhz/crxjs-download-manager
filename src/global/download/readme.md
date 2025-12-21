当前所有逻辑（类型定义、错误类、下载管理器、API 服务、主服务、批量服务、导出函数）都按功能模块拆分

### 📁 目录结构

```
src/
├── types.js                     // JSDoc 类型定义
├── utils/
│   └── constants.js             // DownloadState, DownloadErrorType
├── errors/                      // 自定义错误类
│   ├── DownloadError.js
│   └── SaveFileError.js
├── managers/                    // 下载管理器
│   └── DownloadManager.js
├── services/
│   ├── ApiService.js
│   ├── DownloadService.js
│   └── BatchDownloadService.js
├── factories.js                 // ✅ 新增：工厂函数
├── legacy.js                    // ✅ 新增：兼容旧 API
└── index.js                     // 统一导出
```


## ✅ 拆分后的优势

| 优势 | 说明 |
|------|------|
| **模块清晰** | 每个文件只做一件事 |
| **易于测试** | 可对 `ApiService`、`DownloadManager` 单独单元测试 |
| **便于协作** | 多人开发不会冲突 |
| **Tree-shaking 友好** | 构建工具可剔除未使用的模块 |
| **类型安全增强** | 配合 JSDoc 或迁移到 TS 更平滑 |

---

## 🔜 下一步建议

- 如果项目允许，**迁移到 TypeScript**，类型定义更可靠。
- 使用 **ESLint + Prettier** 统一代码风格。
- 为关键模块编写 **单元测试**（如 Jest + mock chrome API）。
