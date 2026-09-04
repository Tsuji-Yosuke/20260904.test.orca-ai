import type { PluginRequest } from "../shared/messages.js";

export function post(request: PluginRequest): void {
  parent.postMessage({ pluginMessage: request }, "*");
}
