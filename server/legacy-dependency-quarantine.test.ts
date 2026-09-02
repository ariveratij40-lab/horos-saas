import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { appRouter } from "./routers";
import { storageGet } from "./storage";
import { ENV } from "./_core/env";

const envModule = fileURLToPath(new URL("./_core/env.ts", import.meta.url));

function loadProductionEnv(overrides: Record<string, string>) {
  return spawnSync(
    process.execPath,
    ["--import", "tsx", "--eval", `import(${JSON.stringify(envModule)})`],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        JWT_SECRET: "test-only-production-signing-secret-32-chars",
        HOROS_ENABLE_LEGACY_TIDB: "false",
        HOROS_ENABLE_MANUS_FORGE: "false",
        HOROS_ENABLE_LEGACY_OAUTH: "false",
        ...overrides,
      },
      encoding: "utf8",
    },
  );
}

describe("legacy dependency quarantine", () => {
  it("keeps legacy integrations disabled despite accidental config presence", () => {
    expect(ENV.legacyTidbEnabled).toBe(false);
    expect(ENV.manusForgeEnabled).toBe(false);
    expect(ENV.legacyOAuthEnabled).toBe(false);
  });

  it("does not register TiDB routers by default", () => {
    const procedures = Object.keys(appRouter._def.procedures);

    expect(procedures).toContain("canonicalMaintenance.canonicalList");
    expect(procedures).toContain("serviceRequests.canonicalList");
    expect(procedures.some(path => path.startsWith("tenants."))).toBe(false);
    expect(procedures.some(path => path.startsWith("cctv."))).toBe(false);
    expect(procedures.some(path => path.startsWith("auth.localLogin"))).toBe(false);
  });

  it("reports Forge storage as unavailable without leaking configuration", async () => {
    await expect(storageGet("evidence/test.txt")).rejects.toThrow(
      "Legacy storage integration is not available",
    );
  });

  it.each([
    ["TiDB", { HOROS_ENABLE_LEGACY_TIDB: "true", DATABASE_URL: "" }],
    ["Forge", {
      HOROS_ENABLE_MANUS_FORGE: "true",
      BUILT_IN_FORGE_API_URL: "",
      BUILT_IN_FORGE_API_KEY: "",
    }],
    ["OAuth", {
      HOROS_ENABLE_LEGACY_OAUTH: "true",
      OAUTH_SERVER_URL: "",
      VITE_APP_ID: "",
    }],
  ])("fails closed for incomplete production %s configuration", (_name, vars) => {
    const result = loadProductionEnv(vars);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).not.toContain("test-only-production-signing-secret");
  });

  it("accepts a valid JWT secret with every legacy feature disabled", () => {
    const result = loadProductionEnv({});
    expect(result.status).toBe(0);
  });
});
