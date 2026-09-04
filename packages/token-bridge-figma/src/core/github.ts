import { parseRepoFilesToSyncDocument } from "./parse.js";
import type { PullRequestResult, SyncDocument } from "./types.js";

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function encodeBinaryBase64(binary: string): string {
  let output = "";

  for (let index = 0; index < binary.length; index += 3) {
    const byte1 = binary.charCodeAt(index);
    const hasByte2 = index + 1 < binary.length;
    const hasByte3 = index + 2 < binary.length;
    const byte2 = hasByte2 ? binary.charCodeAt(index + 1) : 0;
    const byte3 = hasByte3 ? binary.charCodeAt(index + 2) : 0;

    output += BASE64_ALPHABET[byte1 >> 2];
    output += BASE64_ALPHABET[((byte1 & 0x03) << 4) | (byte2 >> 4)];
    output += hasByte2 ? BASE64_ALPHABET[((byte2 & 0x0f) << 2) | (byte3 >> 6)] : "=";
    output += hasByte3 ? BASE64_ALPHABET[byte3 & 0x3f] : "=";
  }

  return output;
}

function decodeBinaryBase64(value: string): string {
  const normalized = value.replace(/\s+/g, "");
  let output = "";

  for (let index = 0; index < normalized.length; index += 4) {
    const char1 = normalized[index];
    const char2 = normalized[index + 1];
    const char3 = normalized[index + 2];
    const char4 = normalized[index + 3];

    if (!char1 || !char2) {
      break;
    }

    const chunk1 = BASE64_ALPHABET.indexOf(char1);
    const chunk2 = BASE64_ALPHABET.indexOf(char2);
    const chunk3 = char3 === "=" || !char3 ? -1 : BASE64_ALPHABET.indexOf(char3);
    const chunk4 = char4 === "=" || !char4 ? -1 : BASE64_ALPHABET.indexOf(char4);

    const byte1 = (chunk1 << 2) | (chunk2 >> 4);
    output += String.fromCharCode(byte1);

    if (chunk3 >= 0) {
      const byte2 = ((chunk2 & 0x0f) << 4) | (chunk3 >> 2);
      output += String.fromCharCode(byte2);
    }

    if (chunk4 >= 0) {
      const byte3 = ((chunk3 & 0x03) << 6) | chunk4;
      output += String.fromCharCode(byte3);
    }
  }

  return output;
}

function encodeBase64(value: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64");
  }

  const binary = encodeURIComponent(value).replace(/%([0-9A-F]{2})/gi, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  return encodeBinaryBase64(binary);
}

function decodeBase64(value: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64").toString("utf8");
  }

  const binary = decodeBinaryBase64(value);
  const encoded = Array.from(binary, (character) =>
    `%${character.charCodeAt(0).toString(16).padStart(2, "0").toUpperCase()}`
  ).join("");
  return decodeURIComponent(encoded);
}

function encodeContentPath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export class GitHubClient {
  readonly owner: string;
  readonly repo: string;
  readonly baseBranch: string;
  readonly token: string;
  readonly fetchImpl: typeof fetch;

  constructor({
    owner,
    repo,
    baseBranch,
    token,
    fetchImpl = fetch
  }: {
    owner: string;
    repo: string;
    baseBranch: string;
    token: string;
    fetchImpl?: typeof fetch;
  }) {
    this.owner = owner;
    this.repo = repo;
    this.baseBranch = baseBranch;
    this.token = token;
    this.fetchImpl = fetchImpl;
  }

  private async request<T>(
    path: string,
    {
      method = "GET",
      body,
      expected = [200]
    }: {
      method?: string;
      body?: unknown;
      expected?: number[];
    } = {}
  ): Promise<T> {
    const response = await this.fetchImpl(`https://api.github.com${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!expected.includes(response.status)) {
      throw new Error(`GitHub API ${method} ${path} failed with ${response.status}: ${await response.text()}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return (await response.json()) as T;
  }

  async getBaseSha(): Promise<string> {
    const response = await this.request<{ object: { sha: string } }>(
      `/repos/${this.owner}/${this.repo}/git/ref/heads/${this.baseBranch}`
    );
    return response.object.sha;
  }

  async createBranch(branchName: string, sha: string): Promise<void> {
    await this.request(`/repos/${this.owner}/${this.repo}/git/refs`, {
      method: "POST",
      expected: [201],
      body: { ref: `refs/heads/${branchName}`, sha }
    });
  }

  async getFileSha(path: string, branch: string): Promise<string | null> {
    const response = await this.fetchImpl(
      `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${encodeContentPath(path)}?ref=${encodeURIComponent(branch)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${this.token}`,
          "X-GitHub-Api-Version": "2022-11-28"
        }
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (response.status !== 200) {
      throw new Error(`GitHub API GET contents failed with ${response.status}: ${await response.text()}`);
    }

    const payload = (await response.json()) as { sha?: string };
    return payload.sha ?? null;
  }

  async upsertFile({
    path,
    content,
    branch,
    message
  }: {
    path: string;
    content: string;
    branch: string;
    message: string;
  }): Promise<void> {
    const sha = await this.getFileSha(path, branch);
    await this.request(`/repos/${this.owner}/${this.repo}/contents/${encodeContentPath(path)}`, {
      method: "PUT",
      expected: [200, 201],
      body: {
        message,
        content: encodeBase64(content),
        branch,
        sha: sha ?? undefined
      }
    });
  }

  async createPullRequest({
    branchName,
    title,
    body
  }: {
    branchName: string;
    title: string;
    body: string;
  }): Promise<PullRequestResult> {
    return this.request<PullRequestResult>(`/repos/${this.owner}/${this.repo}/pulls`, {
      method: "POST",
      expected: [201],
      body: {
        title,
        head: branchName,
        base: this.baseBranch,
        body
      }
    });
  }

  async getCommit(sha: string): Promise<{ tree: { sha: string } }> {
    return this.request<{ tree: { sha: string } }>(`/repos/${this.owner}/${this.repo}/git/commits/${sha}`);
  }

  async createTree(
    baseTreeSha: string,
    files: Record<string, string>,
    deletePaths: string[] = []
  ): Promise<{ sha: string }> {
    return this.request<{ sha: string }>(`/repos/${this.owner}/${this.repo}/git/trees`, {
      method: "POST",
      expected: [201],
      body: {
        base_tree: baseTreeSha,
        tree: [
          ...Object.entries(files).map(([path, content]) => ({
            path,
            mode: "100644",
            type: "blob",
            content
          })),
          // sha: null は Git tree API における「base_tree からの削除」（#23 で残った古いファイルを消す）
          ...deletePaths.map((path) => ({
            path,
            mode: "100644",
            type: "blob",
            sha: null
          }))
        ]
      }
    });
  }

  async createCommitFromTree({
    message,
    treeSha,
    parentSha
  }: {
    message: string;
    treeSha: string;
    parentSha: string;
  }): Promise<{ sha: string }> {
    return this.request<{ sha: string }>(`/repos/${this.owner}/${this.repo}/git/commits`, {
      method: "POST",
      expected: [201],
      body: {
        message,
        tree: treeSha,
        parents: [parentSha]
      }
    });
  }

  async updateBranch(branchName: string, sha: string): Promise<void> {
    await this.request(`/repos/${this.owner}/${this.repo}/git/refs/heads/${encodeURIComponent(branchName)}`, {
      method: "PATCH",
      expected: [200],
      body: {
        sha,
        force: false
      }
    });
  }

  async createPullRequestFromFiles({
    branchName,
    title,
    body,
    files,
    deletePaths = []
  }: {
    branchName: string;
    title: string;
    body: string;
    files: Record<string, string>;
    deletePaths?: string[];
  }): Promise<PullRequestResult> {
    const baseSha = await this.getBaseSha();
    await this.createBranch(branchName, baseSha);
    const baseCommit = await this.getCommit(baseSha);
    const tree = await this.createTree(baseCommit.tree.sha, files, deletePaths);
    const deleteSuffix = deletePaths.length > 0 ? `, delete ${deletePaths.length} file(s)` : "";
    const commit = await this.createCommitFromTree({
      message: `Sync ${Object.keys(files).length} file(s)${deleteSuffix}`,
      treeSha: tree.sha,
      parentSha: baseSha
    });
    await this.updateBranch(branchName, commit.sha);

    return this.createPullRequest({ branchName, title, body });
  }

  async readRepoFiles(targetDir: string): Promise<Record<string, string>> {
    const baseSha = await this.getBaseSha();
    const commit = await this.getCommit(baseSha);
    const tree = await this.request<{ tree: Array<{ path: string; type: string; sha: string }> }>(
      `/repos/${this.owner}/${this.repo}/git/trees/${commit.tree.sha}?recursive=1`
    );

    const normalizedTarget = targetDir.replace(/^\/+|\/+$/g, "");
    const relevantEntries = tree.tree.filter((entry) => {
      if (entry.type !== "blob") {
        return false;
      }
      if (!entry.path.startsWith(`${normalizedTarget}/`)) {
        return false;
      }
      return /\/(variables\/.+|styles\/(paint|text|effect|grid))\.json$/.test(entry.path);
    });

    const files = await Promise.all(
      relevantEntries.map(async (entry) => {
        const blob = await this.request<{ content: string }>(`/repos/${this.owner}/${this.repo}/git/blobs/${entry.sha}`);
        return [entry.path, decodeBase64(blob.content.replace(/\n/g, ""))] as const;
      })
    );

    return Object.fromEntries(files);
  }

  async readSyncDocument(targetDir: string): Promise<SyncDocument> {
    const repoFiles = await this.readRepoFiles(targetDir);
    return parseRepoFilesToSyncDocument(repoFiles);
  }
}
