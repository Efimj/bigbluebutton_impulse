const OPEN_AUDIO_SETTINGS_EVENT = 'bbb:mobile-open-audio-settings';
const OPEN_VIDEO_SETTINGS_EVENT = 'bbb:mobile-open-video-settings';

export const requestOpenAudioSettings = () => {
  window.dispatchEvent(new CustomEvent(OPEN_AUDIO_SETTINGS_EVENT));
};

export const requestOpenVideoSettings = () => {
  window.dispatchEvent(new CustomEvent(OPEN_VIDEO_SETTINGS_EVENT));
};

export const subscribeOpenAudioSettings = (listener: EventListener) => {
  window.addEventListener(OPEN_AUDIO_SETTINGS_EVENT, listener);
  return () => window.removeEventListener(OPEN_AUDIO_SETTINGS_EVENT, listener);
};

export const subscribeOpenVideoSettings = (listener: EventListener) => {
  window.addEventListener(OPEN_VIDEO_SETTINGS_EVENT, listener);
  return () => window.removeEventListener(OPEN_VIDEO_SETTINGS_EVENT, listener);
};
