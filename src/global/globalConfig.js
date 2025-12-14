
export const CMD = {
  GET_TASKS: 'GET_TASKS',
  ACTIVE_TAB: 'ACTIVE_TAB',
  INIT: 'INIT',
  UPDATE: 'UPDATE',
  FETCH_VIDEO_NOTE_DATA: 'FETCH_VIDEO_NOTE_DATA',
  VIDEO_NOTE_DATA: 'VIDEO_NOTE_DATA',
  // notification
  MESSAGE_NOTIFICATION: 'MESSAGE_NOTIFICATION',
}

export const STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMPLETED: 'completed',
}

export const MESSAGE_TYPE = {
  FROM_INJECT_SCRIPT: 'FROM_INJECT_SCRIPT',
  FROM_BACKGROUND: 'FROM_BACKGROUND',
  FROM_CONTENT_SCRIPT: 'FROM_CONTENT_SCRIPT',
}

export const NOTE_ID_KEY = 'noteId';

export const DOWNLOAD_STOP = 'DOWNLOAD_STOP';
// 倒序下载
export const DOWNLOAD_REVERSE = 'DOWNLOAD_REVERSE';
export const TOBE_DOWNLOADED_LIST = 'TOBE_DOWNLOADED_LIST';

export const WAIT_TIME_BEFORE_NEXT_LINK = 'WAIT_TIME_BEFORE_NEXT_LINK';
export const delay = 5000;

export const LIST_SELECTORS = '#user_detail_element ul[data-e2e=\"scroll-list\"]';

export const PAGE_HOST = '';

// 按延迟等级命名（通用、简洁）
export const DELAY_LEVEL_1_MS = 1000;
export const DELAY_LEVEL_2_MS = 2000;
export const DELAY_LEVEL_3_MS = 3000;
export const DELAY_LEVEL_4_MS = 4000;
export const DELAY_LEVEL_5_MS = 5000;
