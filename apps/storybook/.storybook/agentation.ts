import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Agentation } from "agentation";

/**
 * Agentation のツールバーを preview iframe に一度だけマウントする。
 *
 * decorator として story を包むと docs ビューでツールバーが story の数だけ
 * 重なってしまうため、iframe の body 直下に単独のコンテナを立てて描画する。
 */
export function mountAgentation(): void {
  const CONTAINER_ID = "orca-agentation-root";
  if (document.getElementById(CONTAINER_ID)) return;

  const container = document.createElement("div");
  container.id = CONTAINER_ID;
  document.body.appendChild(container);

  createRoot(container).render(createElement(Agentation));
}
