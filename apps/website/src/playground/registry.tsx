"use client";

import type { PlaygroundConfig } from "./types";
import { buttonPlayground } from "./configs/button";

export const PLAYGROUNDS: Record<string, PlaygroundConfig> = {
  button: buttonPlayground,
};
