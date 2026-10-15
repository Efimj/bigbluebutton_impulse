import logger from '/imports/startup/client/logger';
import deviceInfo from '/imports/utils/deviceInfo';

const RETRY_INTERVAL = 5000;

export class WakeLock {
  constructor() {
    this.sentinel = null;
    this.pending = null;
    this.requested = false;
    this.generation = 0;
    this.lastAttempt = 0;
    this.handleVisibilityChanged = this.handleVisibilityChanged.bind(this);
    this.handleInteraction = this.handleInteraction.bind(this);
  }

  static isEnabled() {
    return window.meetingClientSettings.public.app.wakeLock.enabled;
  }

  isSupported() {
    return WakeLock.isEnabled() && this.isMobile()
      && typeof navigator.wakeLock?.request === 'function';
  }

  isMobile() {
    return deviceInfo.isMobile;
  }

  isActive() {
    return this.sentinel !== null && !this.sentinel.released;
  }

  handleVisibilityChanged() {
    if (this.requested && document.visibilityState === 'visible') this.acquire();
  }

  handleInteraction() {
    // Retry browser refusals on a later user gesture, without a polling loop.
    if (Date.now() - this.lastAttempt >= RETRY_INTERVAL) this.handleVisibilityChanged();
  }

  async releaseSentinel(sentinel) {
    if (!sentinel || sentinel.released) return;
    try {
      await sentinel.release();
    } catch (err) {
      logger.warn({ logCode: 'wake_lock_release_error', extraInfo: { errorName: err.name } },
        'Could not release screen wake lock.');
    }
  }

  async acquireLock(generation) {
    this.lastAttempt = Date.now();
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      // Leaving the meeting or disabling the setting cancels a pending request.
      if (!this.requested || generation !== this.generation
        || document.visibilityState !== 'visible') {
        await this.releaseSentinel(sentinel);
        return { error: false, deferred: true };
      }
      this.sentinel = sentinel;
      sentinel.addEventListener('release', () => {
        if (this.sentinel === sentinel) this.sentinel = null;
      }, { once: true });
      return { error: false };
    } catch (err) {
      if (!this.requested || generation !== this.generation
        || document.visibilityState !== 'visible') {
        return { error: false, deferred: true };
      }
      logger.warn({
        logCode: 'wake_lock_request_error',
        extraInfo: {
          errorName: err.name,
          errorMessage: err.message,
          visibilityState: document.visibilityState,
        },
      }, 'Screen wake lock unavailable; will retry when the page is active.');
      return { error: 'wake_lock_request_error', locale: 'wakeLockAcquireFailed' };
    }
  }

  acquire() {
    if (!this.requested || !this.isSupported() || document.visibilityState !== 'visible') {
      return Promise.resolve({ error: false, deferred: true });
    }
    if (this.isActive()) return Promise.resolve({ error: false });
    if (this.pending) return this.pending;
    const pending = this.acquireLock(this.generation);
    this.pending = pending;
    return pending.finally(() => {
      if (this.pending === pending) this.pending = null;
    });
  }

  request() {
    if (!this.isSupported()) {
      return Promise.resolve({ error: 'wake_lock_not_supported', locale: 'wakeLockNotSupported' });
    }
    if (!this.requested) {
      this.requested = true;
      document.addEventListener('visibilitychange', this.handleVisibilityChanged);
      document.addEventListener('fullscreenchange', this.handleVisibilityChanged);
      window.addEventListener('pageshow', this.handleVisibilityChanged);
      document.addEventListener('pointerup', this.handleInteraction);
      document.addEventListener('keydown', this.handleInteraction);
    }
    return this.acquire();
  }

  release() {
    this.requested = false;
    this.generation += 1;
    this.pending = null;
    document.removeEventListener('visibilitychange', this.handleVisibilityChanged);
    document.removeEventListener('fullscreenchange', this.handleVisibilityChanged);
    window.removeEventListener('pageshow', this.handleVisibilityChanged);
    document.removeEventListener('pointerup', this.handleInteraction);
    document.removeEventListener('keydown', this.handleInteraction);
    const sentinel = this.sentinel;
    this.sentinel = null;
    return this.releaseSentinel(sentinel);
  }
}

const wakeLock = new WakeLock();

export default {
  isEnabled: () => WakeLock.isEnabled(),
  isSupported: () => wakeLock.isSupported(),
  isMobile: () => wakeLock.isMobile(),
  isActive: () => wakeLock.isActive(),
  request: () => wakeLock.request(),
  release: () => wakeLock.release(),
};
