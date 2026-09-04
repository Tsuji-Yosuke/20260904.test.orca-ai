import { post } from "./messaging.js";

const RESIZE_EDGE = 10;

function getResizeMode(event: PointerEvent): "width" | "height" | "both" | null {
  const nearRight = event.clientX >= window.innerWidth - RESIZE_EDGE;
  const nearBottom = event.clientY >= window.innerHeight - RESIZE_EDGE;

  if (nearRight && nearBottom) {
    return "both";
  }
  if (nearRight) {
    return "width";
  }
  if (nearBottom) {
    return "height";
  }
  return null;
}

function applyResizeCursor(mode: "width" | "height" | "both" | null): void {
  document.body.style.cursor =
    mode === "both" ? "nwse-resize" : mode === "width" ? "ew-resize" : mode === "height" ? "ns-resize" : "";
}

export function installResizeBehavior(): void {
  const onPointerMove = (event: PointerEvent) => {
    applyResizeCursor(getResizeMode(event));
  };

  const onPointerDown = (event: PointerEvent) => {
    const resizeMode = getResizeMode(event);
    if (!resizeMode) {
      return;
    }

    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = window.innerWidth;
    const startHeight = window.innerHeight;

    const onDrag = (moveEvent: PointerEvent) => {
      const width =
        resizeMode === "height" ? startWidth : startWidth + (moveEvent.clientX - startX);
      const height =
        resizeMode === "width" ? startHeight : startHeight + (moveEvent.clientY - startY);

      post({ type: "resize-window", width, height });
      applyResizeCursor(resizeMode);
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onDrag);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onDrag);
    window.addEventListener("pointerup", onPointerUp);
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerdown", onPointerDown);
}
