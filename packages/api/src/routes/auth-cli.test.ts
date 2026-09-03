import { afterEach, describe, expect, it, vi } from "vitest";
import { authCliRoute, completeCliDeviceLogin } from "./auth-cli.js";

function fakeKV(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string, type?: "text" | "json") => {
      const value = store.get(key);
      if (value === undefined) return null;
      return type === "json" ? JSON.parse(value) : value;
    },
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
  } as unknown as KVNamespace;
}

function envWith(kv: KVNamespace) {
  return {
    SESSIONS: kv,
    FRONTEND_URL: "https://fondof.netlify.app",
    GITHUB_CLIENT_ID: "client",
    GITHUB_CLIENT_SECRET: "secret",
  } as never;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CLI auth", () => {
  it("starts a device login and returns a verification URI", async () => {
    const kv = fakeKV();
    const res = await authCliRoute.request(
      "/auth/cli/start",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.50",
        },
        body: "{}",
      },
      envWith(kv),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      deviceCode: string;
      userCode: string;
      verificationUri: string;
    };
    expect(body.deviceCode).toMatch(/^[a-f0-9]{64}$/);
    expect(body.userCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(body.verificationUri).toContain("user_code=");
    expect(await kv.get(`cli-device:${body.deviceCode}`)).toBeTruthy();
  });

  it("polls pending then ready after completeCliDeviceLogin", async () => {
    const kv = fakeKV();
    const startRes = await authCliRoute.request(
      "/auth/cli/start",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.51",
        },
        body: "{}",
      },
      envWith(kv),
    );
    const start = (await startRes.json()) as { deviceCode: string };

    const pending = await authCliRoute.request(
      "/auth/cli/poll",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.51",
        },
        body: JSON.stringify({ deviceCode: start.deviceCode }),
      },
      envWith(kv),
    );
    expect(await pending.json()).toMatchObject({ status: "pending" });

    await completeCliDeviceLogin(
      envWith(kv) as never,
      start.deviceCode,
      "session-token",
      {
        userId: 7,
        login: "alice",
        avatarUrl: "https://example.com/a.png",
        name: "Alice",
        accessToken: "gho_x",
        createdAt: Date.now(),
      },
    );

    const ready = await authCliRoute.request(
      "/auth/cli/poll",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.51",
        },
        body: JSON.stringify({ deviceCode: start.deviceCode }),
      },
      envWith(kv),
    );
    const body = (await ready.json()) as {
      status: string;
      token: string;
      user: { login: string };
    };
    expect(body.status).toBe("ready");
    expect(body.token).toBe("session-token");
    expect(body.user.login).toBe("alice");

    // one-time consume
    const again = await authCliRoute.request(
      "/auth/cli/poll",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.51",
        },
        body: JSON.stringify({ deviceCode: start.deviceCode }),
      },
      envWith(kv),
    );
    expect(again.status).toBe(400);
  });

  it("exchanges a GitHub token for a fondof session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("api.github.com/user")) {
          return new Response(
            JSON.stringify({
              id: 99,
              login: "bob",
              avatar_url: "https://example.com/b.png",
              name: "Bob",
            }),
            { status: 200 },
          );
        }
        throw new Error(`unexpected fetch ${String(input)}`);
      }),
    );

    const kv = fakeKV();
    const res = await authCliRoute.request(
      "/auth/cli/github",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.52",
        },
        body: JSON.stringify({ accessToken: "gho_test" }),
      },
      envWith(kv),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      token: string;
      user: { login: string; id: number };
    };
    expect(body.user.login).toBe("bob");
    expect(body.token).toMatch(/^[a-f0-9]{64}$/);
    expect(await kv.get(`session:${body.token}`)).toBeTruthy();
  });
});
