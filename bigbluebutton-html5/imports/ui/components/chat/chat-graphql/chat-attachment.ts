import Auth from '/imports/ui/services/auth';

export const CHAT_ATTACHMENT_MAX_FILE_SIZE = 25 * 1024 * 1024;
export const CHAT_ATTACHMENT_MAX_FILES = 5;

const MARKER_PREFIX = '[[bbb-chat-attachment:v1:';
const MARKER_SUFFIX = ']]';
const FILE_ID_PATTERN = /^[a-f0-9-]{36}$/;

export interface ChatAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  previewableImage: boolean;
}

export interface ParsedChatAttachments {
  attachments: ChatAttachment[];
  markerLines: string[];
}

const encodeBase64Url = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const decodeBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = window.atob(base64 + padding);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const isChatAttachment = (value: unknown): value is ChatAttachment => {
  if (value == null || typeof value !== 'object') return false;
  const attachment = value as Partial<ChatAttachment>;
  return typeof attachment.id === 'string'
    && FILE_ID_PATTERN.test(attachment.id)
    && typeof attachment.name === 'string'
    && attachment.name.length > 0
    && attachment.name.length <= 255
    && typeof attachment.size === 'number'
    && Number.isSafeInteger(attachment.size)
    && attachment.size > 0
    && attachment.size <= CHAT_ATTACHMENT_MAX_FILE_SIZE
    && typeof attachment.mimeType === 'string'
    && typeof attachment.previewableImage === 'boolean';
};

export const serializeChatAttachment = (attachment: ChatAttachment) => (
  `${MARKER_PREFIX}${encodeBase64Url(JSON.stringify(attachment))}${MARKER_SUFFIX}`
);

export const parseChatAttachments = (message: string | null | undefined): ParsedChatAttachments => {
  const attachments: ChatAttachment[] = [];
  const markerLines: string[] = [];
  const safeMessage = typeof message === 'string' ? message : '';

  safeMessage.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith(MARKER_PREFIX) || !trimmedLine.endsWith(MARKER_SUFFIX)) return;
    const payload = trimmedLine.slice(MARKER_PREFIX.length, -MARKER_SUFFIX.length);
    try {
      const parsed = JSON.parse(decodeBase64Url(payload));
      if (isChatAttachment(parsed)) {
        attachments.push(parsed);
        markerLines.push(trimmedLine);
      }
    } catch (error) {
      // Invalid markers remain regular chat text and never become attachment URLs.
    }
  });

  return { attachments, markerLines };
};

export const removeAttachmentMarkersFromHtml = (
  html: string | null | undefined,
  markerLines: string[],
) => {
  let result = typeof html === 'string' ? html : '';
  markerLines.forEach((marker) => {
    result = result.split(marker).join('');
  });
  return result
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/(?:<br\s*\/?>(?:\s*)){2,}$/gi, '')
    .trim();
};

export const stripAllAttachmentMarkersFromHtml = (html: string | null | undefined) => (
  typeof html === 'string' ? html : ''
)
  .replace(/\[\[bbb-chat-attachment:v1:[A-Za-z0-9_-]+\]\]/g, '')
  .replace(/<p>\s*<\/p>/gi, '')
  .replace(/(?:<br\s*\/?>(?:\s*)){2,}$/gi, '')
  .trim();

const isIOSDevice = () => /iPad|iPhone|iPod/.test(window.navigator.userAgent)
  || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

export const uploadChatAttachment = (file: File): Promise<ChatAttachment> => {
  const sessionToken = String(Auth.sessionToken || '');
  const useRawUpload = isIOSDevice();
  const query = new URLSearchParams({ sessionToken });
  let requestBody: FormData | File;

  if (useRawUpload) {
    // Some iOS WebKit releases can serialize a Photos/iCloud-backed File as an
    // empty multipart request. Sending the same File as the request body avoids
    // that WebKit path; the server still validates the streamed byte count.
    query.set('raw', 'true');
    requestBody = file;
  } else {
    const formData = new FormData();
    formData.append('file', file);
    requestBody = formData;
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const uploadUrl = `/bigbluebutton/chat-attachment/upload?${query}`;
    xhr.open('POST', uploadUrl);
    xhr.withCredentials = true;
    if (useRawUpload) {
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.setRequestHeader('X-BBB-File-Name', encodeBase64Url(file.name || 'file'));
      xhr.setRequestHeader('X-BBB-File-Size', String(file.size));
    }

    const rejectUpload = (message: string, status?: number) => {
      const error = new Error(message) as Error & { status?: number };
      error.status = status;
      reject(error);
    };

    xhr.onload = () => {
      let body: unknown = {};
      try {
        body = JSON.parse(xhr.responseText || '{}');
      } catch (error) {
        rejectUpload('invalid-upload-response', xhr.status);
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        const serverError = body != null && typeof body === 'object' && 'error' in body
          ? String((body as { error: unknown }).error)
          : 'upload-failed';
        rejectUpload(serverError, xhr.status);
        return;
      }

      if (!isChatAttachment(body)) {
        rejectUpload('invalid-upload-response', xhr.status);
        return;
      }
      resolve(body);
    };
    xhr.onerror = () => rejectUpload('network-error', xhr.status || undefined);
    xhr.onabort = () => rejectUpload('upload-aborted', xhr.status || undefined);
    xhr.send(requestBody);
  });
};

export const chatAttachmentUrl = (attachment: ChatAttachment, preview = false) => {
  const sessionToken = String(Auth.sessionToken || '');
  const meetingId = String(Auth.meetingID || '');
  const query = new URLSearchParams({ sessionToken });
  if (preview) query.set('preview', 'true');
  const attachmentPath = `/bigbluebutton/chat-attachment/${encodeURIComponent(meetingId)}`;
  return `${attachmentPath}/${encodeURIComponent(attachment.id)}?${query}`;
};

export const formatAttachmentSize = (size: number, locale: string) => {
  if (size < 1024) return `${size} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = size / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} ${unit}`;
};
