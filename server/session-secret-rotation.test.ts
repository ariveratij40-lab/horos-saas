import axios from "axios";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import { COOKIE_NAME } from "@shared/const";
import { SDKServer } from "./_core/sdk";

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  vi.restoreAllMocks();
  process.env.NODE_ENV = originalNodeEnv;
});

describe("session signing-secret rotation", () => {
  it("fails closed when production has no signing secret", () => {
    const envPath = fileURLToPath(
      new URL("./_core/env.ts", import.meta.url),
    );
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "--eval", `import(${JSON.stringify(envPath)})`],
      {
        env: {
          ...process.env,
          NODE_ENV: "production",
          JWT_SECRET: "",
        },
        encoding: "utf8",
      },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "JWT_SECRET must contain at least 32 characters in production",
    );
  });

  it("rejects an old session and accepts a newly signed local session", async () => {
    process.env.NODE_ENV = "development";
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const oldRuntime = new SDKServer(
      axios.create(),
      "test-only-previous-session-signing-secret",
    );
    const rotatedRuntime = new SDKServer(
      axios.create(),
      "test-only-rotated-session-signing-secret",
    );
    const payload = {
      openId: "dev_local_horos_admin",
      appId: "horos-local-dev",
      name: "Test HOROS administrator",
    };

    const oldSession = await oldRuntime.signSession(payload);
    expect(await rotatedRuntime.verifySession(oldSession)).toBeNull();

    const newSession = await rotatedRuntime.signSession(payload);
    await expect(
      rotatedRuntime.authenticateRequest({
        headers: { cookie: `${COOKIE_NAME}=${newSession}` },
      } as never),
    ).resolves.toMatchObject({
      openId: payload.openId,
      authProvider: "local",
      tenantId: null,
    });

    expect(warning).toHaveBeenCalledWith(
      "[Auth] Session verification failed",
      expect.any(String),
    );
  });
});
