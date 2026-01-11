import { saveFile } from '@/global/global.js';
import { PLATFORM } from '@/global/globalConfig.js';
const activeDelta = new Map();

// chrome.downloads.download + chrome.downloads.onChanged.addListener 封装download方法
export function download(downloadOptions = {}) {
  const { url, filename } = downloadOptions;
  return new Promise((resolve, reject) => {
    chrome.downloads.download({ url, filename }, (downloadId) => {
      if (chrome.runtime.lastError || !downloadId) {
        console.log(chrome.runtime.lastError);
        return reject(chrome.runtime.lastError || new Error('Download failed'));
      }

      chrome.downloads.onChanged.addListener(onChangedListener);

      function onChangedListener (delta) {
        setData(activeDelta, delta, downloadOptions);
        console.log('delta', delta, activeDelta);
        if (delta.id === downloadId) {
          if (delta?.state?.current === 'complete') {
            chrome.downloads.onChanged.removeListener(onChangedListener);
            resolve({ downloadId, delta: activeDelta.get(downloadId),...downloadOptions });
          } else if (delta?.state?.current === 'interrupted') {
            chrome.downloads.onChanged.removeListener(onChangedListener);
            reject(new Error('Download interrupted'));
          } else if (delta?.error) {
            chrome.downloads.onChanged.removeListener(onChangedListener);
            reject(new Error(`Download failed: ${delta?.error?.current}`));
          }
        } else {
          console.log('Delta ID does not match download ID, ignoring.');
        }
      };

    });
  });
}

export async function downloadWithSave(downloadOptions = {}) {
  try {
    const result = await download(downloadOptions);
    const { delta } = result;
    await saveFile(delta).catch((error) => {
      console.log('[downloadWithSave]', error);
    });
    return result;
  } catch (error) {
    return error;
  }
}

function setData(map = new Map(), delta, downloadOptions) {
  const { id } = delta;
  if (!map.has(id)) {
    map.set(id, {
      filename: downloadOptions.filename || delta?.filename?.current,
      size: delta?.fileSize?.current,
      sourcePlatform: downloadOptions.sourcePlatform || PLATFORM,
      sourceUrl: downloadOptions.sourceUrl,
      sourcePageUrl: downloadOptions.sourcePageUrl || '',
      platformMetadata: {
        authorName: downloadOptions.name,
        contentId: downloadOptions.noteId,
        title: downloadOptions.title,
      }
    });
  } else {
    const old = map.get(id);
    map.set(id, {
      ...old,
      filename: old?.filename || delta?.filename?.current,
      size: old?.size || delta?.fileSize?.current
    })
  }
}


// chrome.downloads.download + chrome.downloads.onChanged.addListener 封装download方法
// 并能根据入参控制并发
export function downloadWithConcurrency(downloadOptions = [], concurrency = 6) {
  const queue = [...downloadOptions];
  let activeCount = 0;

  return new Promise((resolve, reject) => {
    const results = [];
    const errors = [];

    const next = () => {
      console.log('Next download check:');
      if (queue.length === 0 && activeCount === 0) {
        if (errors.length > 0) {
          console.log('Download completed with errors:', errors);
          return reject(errors);
        }
        return resolve(results);
      }

      console.log('Active downloads:', activeCount, 'Queue length:', queue.length);
      while (activeCount < concurrency && queue.length > 0) {
        const options = queue.shift();
        console.log('Starting download for:', options);
        activeCount++;

        download(options)
          .then((result) => {
            results.push(result);
          })
          .catch((error) => {
            errors.push(error);
          })
          .finally(() => {
            activeCount--;
            next();
          });
      }
    };

    next();
  });
}
