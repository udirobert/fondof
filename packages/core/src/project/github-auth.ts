/**
 * GitHub OAuth Device Flow for CLI authentication.
 * Does not require a client secret — only a client ID.
 * User visits a URL, enters a code, and the CLI polls for a token.
 */

export interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export interface GitHubToken {
  accessToken: string;
  tokenType: string;
  scope: string;
}

const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

/**
 * Step 1: Request a device code from GitHub.
 * The user must visit the verification URI and enter the user code.
 */
export async function requestDeviceCode(clientId: string): Promise<DeviceCodeResponse> {
  const response = await fetch(GITHUB_DEVICE_CODE_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      scope: "repo read:user",
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub device code request failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    device_code: string;
    user_code: string;
    verification_uri: string;
    expires_in: number;
    interval: number;
  };

  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    expiresIn: data.expires_in,
    interval: data.interval,
  };
}

/**
 * Step 2: Poll GitHub for the access token.
 * Returns when the user has authorized, or throws on expiry/denial.
 */
export async function pollForToken(
  clientId: string,
  deviceCode: string,
  interval: number
): Promise<GitHubToken> {
  const pollInterval = Math.max(interval, 5) * 1000; // seconds → ms, minimum 5s

  while (true) {
    await sleep(pollInterval);

    const response = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    const data = (await response.json()) as {
      access_token?: string;
      token_type?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };

    if (data.access_token) {
      return {
        accessToken: data.access_token,
        tokenType: data.token_type ?? "bearer",
        scope: data.scope ?? "",
      };
    }

    switch (data.error) {
      case "authorization_pending":
        // User hasn't authorized yet, keep polling
        continue;
      case "slow_down":
        // We're polling too fast, add 5 seconds
        await sleep(5000);
        continue;
      case "expired_token":
        throw new Error("Device code expired. Please try again.");
      case "access_denied":
        throw new Error("Authorization denied by user.");
      default:
        throw new Error(`GitHub auth error: ${data.error_description || data.error}`);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
