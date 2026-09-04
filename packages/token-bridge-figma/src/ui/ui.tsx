import { render } from "preact";
import type { PluginResponse } from "../shared/messages.js";
import { App } from "./components/App.js";
import { post } from "./messaging.js";
import { installResizeBehavior } from "./resize.js";
import { mergeState, setStatus } from "./state.js";

window.addEventListener("message", (event: MessageEvent<{ pluginMessage: PluginResponse }>) => {
  const message = event.data?.pluginMessage;
  if (!message) {
    return;
  }

  if (message.type === "state") {
    mergeState(message.state);
  } else if (message.type === "status") {
    setStatus({ level: message.level, message: message.message });
  } else if (message.type === "error") {
    setStatus({ level: "warning", message: message.message });
  }
});

window.addEventListener("DOMContentLoaded", () => {
  installResizeBehavior();
  render(<App />, document.getElementById("app")!);
  post({ type: "load-initial-state" });
});
