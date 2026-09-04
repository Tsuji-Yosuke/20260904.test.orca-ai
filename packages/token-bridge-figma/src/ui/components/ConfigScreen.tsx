import { useRef } from "preact/hooks";
import type { PullRequestResult } from "../../core/types.js";
import { post } from "../messaging.js";
import { state, updateConfig } from "../state.js";
import { StatusBar } from "./StatusBar.js";

type Props = {
  onBack: () => void;
};

export function ConfigScreen({ onBack }: Props) {
  const { config, token, hasStoredToken, status, pullRequest } = state.value;

  const ownerRef = useRef<HTMLInputElement>(null);
  const repoRef = useRef<HTMLInputElement>(null);
  const baseBranchRef = useRef<HTMLInputElement>(null);
  const targetDirRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const newConfig = {
      owner: ownerRef.current?.value ?? config.owner,
      repo: repoRef.current?.value ?? config.repo,
      baseBranch: baseBranchRef.current?.value ?? config.baseBranch,
      targetDir: targetDirRef.current?.value ?? config.targetDir,
      patStorageOptIn: true
    };
    const newToken = tokenRef.current?.value ?? token;
    updateConfig(newConfig, newToken);
    post({ type: "save-config", config: newConfig, token: newToken });
  };

  return (
    <main class="screen">
      {status && <StatusBar status={status} pullRequest={pullRequest} />}

      <div class="row row-between">
        <div></div>
        <button class="btn" onClick={onBack}>
          戻る
        </button>
      </div>

      <section class="panel">
        <div class="config-grid">
          <label class="field">
            GitHub Owner
            <input ref={ownerRef} defaultValue={config.owner} class="input" />
          </label>
          <label class="field">
            GitHub Repository
            <input ref={repoRef} defaultValue={config.repo} class="input" />
          </label>
          <label class="field">
            Base Branch
            <input ref={baseBranchRef} defaultValue={config.baseBranch} class="input" />
          </label>
          <label class="field">
            Target Dir
            <input ref={targetDirRef} defaultValue={config.targetDir} class="input" />
          </label>
        </div>
        <label class="field">
          GitHub の fine-grained personal access token
          <input
            ref={tokenRef}
            type="password"
            defaultValue={token}
            placeholder={hasStoredToken ? "保存済みの token を使えます" : ""}
            class="input"
          />
        </label>
        <div class="row">
          <button class="btn btn-ink" onClick={handleSave}>
            設定を保存
          </button>
        </div>
      </section>
    </main>
  );
}
