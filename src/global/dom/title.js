/**
 * 等待DOM元素出现（基于 requestAnimationFrame）
 * @param {Object} [options] - 配置选项
 * @param {number} [options.timeout=5000] - 超时时间(毫秒)
 * @returns {Promise} - 元素出现时resolve，超时时reject
 */
export function waitForTitle(options = {}) {
  console.log(options);
  const { timeout = 5000, domain = '' } = options;

  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const tick = (now) => {
      console.log('[tick]', now, document.title);
      // 检查是否超时
      if (now - startTime >= timeout) {
        resolve({ title: document.title, t: now - startTime, timeout: true });
        return;
      }

      // 执行检查
      const checkTitle = document.title && !document.title?.startsWith(domain);

      if (checkTitle) {
        resolve({ title: document.title, t: now - startTime, timeout: false, now, startTime });
      } else {
        requestAnimationFrame(tick);
      }
    };

    // 启动
    requestAnimationFrame(tick);
  });
}