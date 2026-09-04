import { describe, expect, it } from "vitest";
import { PLAYGROUNDS } from "./registry";
import { PLAYGROUND_NAMES } from "./registry-names";
import { defaultValues, generateJsx } from "./generate-jsx";

describe("playground レジストリ", () => {
  it("サーバ用の名前一覧と client レジストリのキーが一致する", () => {
    expect(Object.keys(PLAYGROUNDS).sort()).toEqual([...PLAYGROUND_NAMES].sort());
  });

  it("各 config は既定値からコードを生成できる", () => {
    for (const [name, config] of Object.entries(PLAYGROUNDS)) {
      const code = generateJsx(config, defaultValues(config.controls));
      expect(code, name).toContain(`<${config.component}`);
      expect(code, name).toContain("import");
    }
  });
});
