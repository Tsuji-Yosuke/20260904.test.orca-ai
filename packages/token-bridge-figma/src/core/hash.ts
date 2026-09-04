export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(",")}}`;
}

export function computeContentHash(value: unknown): string {
  const input = stableStringify(value);
  const seeds = [
    0x811c9dc5,
    0x01000193,
    0x9e3779b1,
    0x85ebca6b,
    0xc2b2ae35,
    0x27d4eb2f,
    0x165667b1,
    0xd3a2646c
  ];

  return seeds
    .map((seed, index) => {
      let hash = seed ^ (index * 0x45d9f3b);
      for (let cursor = 0; cursor < input.length; cursor += 1) {
        hash ^= input.charCodeAt(cursor);
        hash = Math.imul(hash, 0x01000193);
        hash = (hash << 13) | (hash >>> 19);
      }
      return (hash >>> 0).toString(16).padStart(8, "0");
    })
    .join("");
}
