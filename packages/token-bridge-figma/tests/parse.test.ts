import test from "node:test";
import assert from "node:assert/strict";

import { parseRepoFilesToSyncDocument } from "../src/core/parse.js";

test("parseRepoFilesToSyncDocument parses DTCG format with $extensions.mode", () => {
  const document = parseRepoFilesToSyncDocument({
    "tokens/variables/theme.json": JSON.stringify({
      $extensions: {
        figmaSync: {
          collectionId: "col-1",
          name: "Theme",
          defaultModeId: "m-light",
          modes: [
            { modeId: "m-light", name: "Light" },
            { modeId: "m-dark", name: "Dark" }
          ]
        }
      },
      color: {
        primary: {
          $type: "color",
          $value: "#111111ff",
          $extensions: {
            mode: {
              Light: "#111111ff",
              Dark: "#eeeeeeff"
            },
            figmaSync: {
              variableId: "var-1",
              collectionId: "col-1",
              modeValues: {
                "m-light": { hex: "#111111ff" },
                "m-dark": { hex: "#eeeeeeff" }
              }
            }
          }
        },
        accent: {
          $type: "color",
          $value: "{color.primary}",
          $extensions: {
            mode: {
              Light: "{color.primary}",
              Dark: "#ff0000ff"
            },
            figmaSync: {
              variableId: "var-2",
              collectionId: "col-1",
              modeValues: {
                "m-light": { alias: "var-1" },
                "m-dark": { hex: "#ff0000ff" }
              }
            }
          }
        }
      }
    })
  });

  assert.equal(document.variables.length, 1);
  assert.equal(document.variables[0]!.tokens.length, 2);

  const primary = document.variables[0]!.tokens[0]!;
  // value should be reconstructed as mode-ID-keyed dict
  assert.deepEqual(primary.value, { "m-light": "#111111ff", "m-dark": "#eeeeeeff" });
  // modeValues should use mode IDs
  assert.deepEqual(primary.extensions.figmaSync.modeValues["m-dark"], { hex: "#eeeeeeff" });

  const accent = document.variables[0]!.tokens[1]!;
  assert.deepEqual(accent.value, { "m-light": "{color.primary}", "m-dark": "#ff0000ff" });
  assert.deepEqual(accent.extensions.figmaSync.modeValues["m-light"], { alias: "var-1" });
});

test("parseRepoFilesToSyncDocument reconstructs modeValues from $extensions.mode when figmaSync.modeValues is absent", () => {
  const document = parseRepoFilesToSyncDocument({
    "tokens/variables/theme.json": JSON.stringify({
      $extensions: {
        figmaSync: {
          collectionId: "col-1",
          defaultModeId: "m-light",
          modes: [
            { modeId: "m-light", name: "Light" },
            { modeId: "m-dark", name: "Dark" }
          ]
        }
      },
      color: {
        bg: {
          $type: "color",
          $value: "#ffffffff",
          $extensions: {
            mode: {
              Light: "#ffffffff",
              Dark: "#000000ff"
            }
          }
        }
      }
    })
  });

  const token = document.variables[0]!.tokens[0]!;
  // value should be mode-ID-keyed
  assert.deepEqual(token.value, { "m-light": "#ffffffff", "m-dark": "#000000ff" });
  // modeValues should be reconstructed from $extensions.mode
  assert.deepEqual(token.extensions.figmaSync.modeValues, {
    "m-light": { hex: "#ffffffff" },
    "m-dark": { hex: "#000000ff" }
  });
});

test("parseRepoFilesToSyncDocument handles single-mode DTCG format without $extensions.mode", () => {
  const document = parseRepoFilesToSyncDocument({
    "tokens/variables/base.json": JSON.stringify({
      $extensions: {
        figmaSync: {
          collectionId: "col-1",
          defaultModeId: "m-default",
          modes: [{ modeId: "m-default", name: "Default" }]
        }
      },
      spacing: {
        sm: {
          $type: "number",
          $value: 8
        }
      }
    })
  });

  const token = document.variables[0]!.tokens[0]!;
  assert.deepEqual(token.value, { "m-default": 8 });
  assert.deepEqual(token.extensions.figmaSync.modeValues, { "m-default": 8 });
});

test("parseRepoFilesToSyncDocument still reads legacy mode-indexed $value format", () => {
  const document = parseRepoFilesToSyncDocument({
    "tokens/variables/core.json": JSON.stringify({
      $extensions: {
        figmaSync: {
          collectionId: "collection-1",
          defaultModeId: "light",
          modes: [{ modeId: "light", name: "Light" }]
        }
      },
      color: {
        text: {
          primary: {
            $type: "color",
            $value: {
              light: "#ffffffff"
            },
            $extensions: {
              figmaSync: {
                variableId: "var-1",
                collectionId: "collection-1",
                modeValues: {
                  light: { hex: "#ffffffff" }
                }
              }
            }
          }
        }
      }
    })
  });

  assert.equal(document.variables[0]!.tokens.length, 1);
  assert.deepEqual(document.variables[0]!.tokens[0]!.value, { light: "#ffffffff" });
  assert.deepEqual(document.variables[0]!.tokens[0]!.extensions.figmaSync.modeValues, { light: { hex: "#ffffffff" } });
});

test("parseRepoFilesToSyncDocument continues when one file has invalid JSON", () => {
  const document = parseRepoFilesToSyncDocument({
    "tokens/variables/core.json": JSON.stringify({
      $extensions: {
        figmaSync: {
          collectionId: "collection-1",
          defaultModeId: "light",
          modes: [{ modeId: "light", name: "Light" }]
        }
      },
      color: {
        text: {
          primary: {
            $type: "color",
            $value: {
              light: "#ffffffff"
            },
            $extensions: {
              figmaSync: {
                variableId: "var-1",
                collectionId: "collection-1",
                modeValues: {
                  light: { hex: "#ffffffff" }
                }
              }
            }
          }
        }
      }
    }),
    "tokens/styles/text.json": "{ invalid json"
  });

  assert.equal(document.variables.length, 1);
  assert.equal(document.variables[0]!.tokens.length, 1);
  assert.equal(document.styles.text.length, 0);
  assert.equal(document.warnings.length, 1);
  assert.equal(document.warnings[0]!.kind, "sync-error");
  assert.equal(document.warnings[0]!.name, "tokens/styles/text.json");
});
