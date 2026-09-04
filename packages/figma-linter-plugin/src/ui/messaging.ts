import type { PluginMessage, UIMessage } from '../shared/messages';

/** Send a typed message from the UI to the main thread. */
export function emit(message: UIMessage): void {
  parent.postMessage({ pluginMessage: message }, '*');
}

/**
 * Subscribe to typed messages coming from the main thread.
 * Returns an unsubscribe function (handy for `useEffect` cleanup).
 */
export function onMessage(handler: (message: PluginMessage) => void): () => void {
  const listener = (event: MessageEvent) => {
    const message = event.data?.pluginMessage as PluginMessage | undefined;
    if (message) handler(message);
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
