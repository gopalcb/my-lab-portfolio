/** Runs only in the opaque frame. The parent validates source, channel and document ID. */
export function trackingBridge(documentId: string): string {
  return `(() => {
    const documentId = ${JSON.stringify(documentId)};
    const send = payload => parent.postMessage({ channel: 'portfolio-tracking-v1', documentId, ...payload }, '*');
    const title = el => {
      const labelled = (el.getAttribute('aria-labelledby') || '').split(/\\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
      const labels = [...(el.labels || [])].map(label => label.textContent || '').join(' ').trim();
      return (el.getAttribute('data-track-title') || el.getAttribute('aria-label') || labelled || labels || el.getAttribute('title') || el.textContent?.trim() || el.getAttribute('alt') || el.tagName.toLowerCase()).trim().replace(/\\s+/g, ' ').slice(0, 200);
    };
    const elements = [...document.querySelectorAll('a,button,input,select,textarea,summary,label,video,[role="button"],[data-track-title]')];
    elements.forEach((el, index) => { el.dataset.portfolioId = el.getAttribute('data-track-id') || el.id || el.tagName.toLowerCase() + '-' + index; el.dataset.portfolioId = el.dataset.portfolioId.slice(0, 128); });
    // Native keyboard activation emits click; a separate keydown listener would duplicate it.
    document.addEventListener('click', event => {
      const el = event.target instanceof Element ? event.target.closest('a,button,input,select,textarea,summary,label,video,[role="button"],[data-track-title]') : null;
      // A label forwards a native click to its associated control. Record that control once.
      if (!el || (el.tagName === 'LABEL' && el.control)) return;
      send({ type: 'element_clicked', title: title(el), elementId: el.dataset.portfolioId,
        external: el instanceof HTMLAnchorElement && /^https?:/.test(el.href) });
    });
    document.querySelectorAll('video').forEach(video => {
      // Browser-owned native controls can suppress DOM click/pointer events, even in capture.
      // Keep them for seeking/volume/fullscreen; this native button provides observable activation.
      // Playback events below remain authoritative. Never infer a click from play or pause.
      const button = document.createElement('button');
      const videoTitle = title(video);
      button.type = 'button';
      button.className = 'portfolio-video-toggle';
      button.dataset.trackId = (video.dataset.portfolioId.slice(0, 110) + '-play-toggle');
      button.dataset.portfolioId = button.dataset.trackId;
      button.dataset.trackTitle = ('Play/pause ' + videoTitle).slice(0, 200);
      if (!video.id) video.id = video.dataset.portfolioId;
      button.setAttribute('aria-controls', video.id);
      if (video.getAttribute('aria-labelledby')) button.setAttribute('aria-describedby', video.getAttribute('aria-labelledby'));
      button.style.cssText = 'display:block;margin:12px 0;padding:8px 12px;font:inherit;color:#17624c;background:#e8e7e0;border:1px solid #d2dcd7;border-radius:4px;cursor:pointer';
      const updateButton = () => {
        const action = video.paused || video.ended ? 'Play' : 'Pause';
        button.textContent = action + ' video';
        button.setAttribute('aria-label', action + ' video');
        button.title = (action + ' ' + videoTitle).slice(0, 200);
      };
      updateButton();
      video.after(button);
      button.addEventListener('click', () => {
        if (video.paused || video.ended) {
          void video.play().catch(() => { button.textContent = 'Try playing video again'; });
        } else video.pause();
      });
      ['play', 'pause', 'ended'].forEach(type => video.addEventListener(type, () => {
        updateButton();
        send({ type: 'video_' + type, videoId: video.dataset.portfolioId,
          title: videoTitle, currentTime: video.currentTime, muted: video.muted });
      }));
    });
  })();`;
}

export interface BridgeEvent {
  type: 'element_clicked' | 'video_play' | 'video_pause' | 'video_ended';
  title: string;
  elementId?: string;
  external?: boolean;
  videoId?: string;
  currentTime?: number;
  muted?: boolean;
}
export function validateBridgeMessage(event: MessageEvent, frameWindow: Window | null, documentId: string): BridgeEvent | null {
  if (!frameWindow || event.source !== frameWindow || event.origin !== 'null') return null;
  const value = event.data;
  if (!value || typeof value !== 'object' || value.channel !== 'portfolio-tracking-v1' || value.documentId !== documentId) return null;
  const bounded = (text: unknown, limit: number): text is string => typeof text === 'string' && text.trim().length > 0 && text.length <= limit;
  if (!bounded(value.title, 200)) return null;
  if (value.type === 'element_clicked') {
    return bounded(value.elementId, 128) && typeof value.external === 'boolean' ? value : null;
  }
  if (!['video_play', 'video_pause', 'video_ended'].includes(value.type) || !bounded(value.videoId, 128)
    || typeof value.currentTime !== 'number' || !Number.isFinite(value.currentTime) || value.currentTime < 0 || value.currentTime > 86400
    || typeof value.muted !== 'boolean') return null;
  return value;
}
