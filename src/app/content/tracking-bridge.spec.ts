import { vi } from 'vitest';
import { trackingBridge, validateBridgeMessage } from './tracking-bridge';

const source = {} as Window;
const valid = { channel: 'portfolio-tracking-v1', documentId: 'current', type: 'element_clicked', title: 'GitHub', elementId: 'github', external: true };
const message = (data: unknown = valid, origin = 'null', eventSource: Window | null = source) => ({ data, origin, source: eventSource }) as MessageEvent;

describe('opaque iframe bridge', () => {
  it('accepts only the current frame, null origin, channel, document and typed metadata', () => {
    expect(validateBridgeMessage(message(), source, 'current')).toEqual(valid);
    expect(validateBridgeMessage(message(valid, 'https://evil.test'), source, 'current')).toBeNull();
    expect(validateBridgeMessage(message(valid, 'null', {} as Window), source, 'current')).toBeNull();
    expect(validateBridgeMessage(message(), source, 'obsolete')).toBeNull();
    expect(validateBridgeMessage(message({ ...valid, channel: 'wrong' }), source, 'current')).toBeNull();
    expect(validateBridgeMessage(message({ ...valid, elementId: 123 }), source, 'current')).toBeNull();
    expect(validateBridgeMessage(message({ ...valid, title: 'x'.repeat(201) }), source, 'current')).toBeNull();
    expect(validateBridgeMessage(message({ ...valid, type: 'page_view' }), source, 'current')).toBeNull();
    const video = { ...valid, type: 'video_play', videoId: 'demo', currentTime: 5, muted: false };
    expect(validateBridgeMessage(message(video), source, 'current')).toEqual(video);
    for (const currentTime of [NaN, Infinity, -1, '5']) {
      expect(validateBridgeMessage(message({ ...video, currentTime }), source, 'current')).toBeNull();
    }
  });

  it('delegates native clicks once and records play/resume/pause/end independently', () => {
    // Supplemental DOM execution, not a native-browser playback or CSP claim.
    const doc = document.implementation.createHTMLDocument('Tracking test');
    doc.body.innerHTML = '<h1>Demo</h1><button id="button">Run</button><details><summary>Details</summary></details><label for="input">Label</label><input id="input"><video id="demo" title="Demo"></video>';
    const send = vi.fn();
    new Function('document', 'parent', 'Element', 'HTMLAnchorElement', trackingBridge('current'))(doc, { postMessage: send }, Element, HTMLAnchorElement);
    doc.querySelector('button')!.click();
    doc.querySelector('summary')!.click();
    doc.querySelector('label')!.click();
    expect(send).toHaveBeenCalledTimes(3);
    expect(send.mock.calls[2][0]).toMatchObject({ type: 'element_clicked', elementId: 'input', title: 'Label' });
    const video = doc.querySelector('video')!;
    video.click();
    for (const type of ['play', 'pause', 'play', 'ended']) video.dispatchEvent(new Event(type));
    expect(send.mock.calls.map(call => call[0].type)).toEqual(['element_clicked', 'element_clicked', 'element_clicked', 'element_clicked', 'video_play', 'video_pause', 'video_play', 'video_ended']);
    expect(send.mock.calls[4][0]).toMatchObject({ documentId: 'current', videoId: 'demo', currentTime: 0, muted: false });
  });

  it('adds an accessible tracked toggle while retaining native controls and independent playback events', () => {
    const doc = document.implementation.createHTMLDocument('Video control test');
    doc.body.innerHTML = '<h1 id="video-title">Runtime demo</h1><video id="runtime-demo" controls aria-labelledby="video-title"></video>';
    const video = doc.querySelector('video')!;
    let paused = true;
    Object.defineProperty(video, 'paused', { get: () => paused });
    const play = vi.spyOn(video, 'play').mockImplementation(() => {
      paused = false;
      video.dispatchEvent(new Event('play'));
      return Promise.resolve();
    });
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => {
      paused = true;
      video.dispatchEvent(new Event('pause'));
    });
    const send = vi.fn();
    new Function('document', 'parent', 'Element', 'HTMLAnchorElement', trackingBridge('current'))(doc, { postMessage: send }, Element, HTMLAnchorElement);
    const button = doc.querySelector('button')!;
    expect(video.controls).toBe(true);
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-controls')).toBe('runtime-demo');
    expect(button.getAttribute('aria-label')).toBe('Play video');
    expect(button.title).toBe('Play Runtime demo');
    expect(button.dataset['trackId']).toBe('runtime-demo-play-toggle');
    button.click();
    expect(play).toHaveBeenCalledOnce();
    expect(button.textContent).toBe('Pause video');
    expect(button.getAttribute('aria-label')).toBe('Pause video');
    expect(send.mock.calls.filter(call => call[0].type === 'element_clicked')).toHaveLength(1);
    expect(send.mock.calls.find(call => call[0].type === 'element_clicked')![0]).toMatchObject({ title: 'Play/pause Runtime demo', elementId: 'runtime-demo-play-toggle' });
    expect(send.mock.calls.find(call => call[0].type === 'video_play')![0]).toMatchObject({ videoId: 'runtime-demo', title: 'Runtime demo' });
    button.click();
    expect(pause).toHaveBeenCalledOnce();
    expect(button.textContent).toBe('Play video');
    expect(send.mock.calls.filter(call => call[0].type === 'element_clicked')).toHaveLength(2);
    expect(send.mock.calls.filter(call => call[0].type === 'video_pause')).toHaveLength(1);
    // Native playback callbacks and autoplay must not manufacture a control click.
    video.dispatchEvent(new Event('play'));
    expect(send.mock.calls.filter(call => call[0].type === 'video_play')).toHaveLength(2);
    expect(send.mock.calls.filter(call => call[0].type === 'element_clicked')).toHaveLength(2);
    play.mockRestore();
    pause.mockRestore();
  });

});
