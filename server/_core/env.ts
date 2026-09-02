const isProduction = process.env.NODE_ENV === "production";
const configuredCookieSecret = process.env.JWT_SECRET;

function enabled(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === "true";
}

const legacyTidbEnabled = enabled("HOROS_ENABLE_LEGACY_TIDB");
const manusForgeEnabled = enabled("HOROS_ENABLE_MANUS_FORGE");
const legacyOAuthEnabled = enabled("HOROS_ENABLE_LEGACY_OAUTH");

if (
  isProduction
  && (
    !configuredCookieSecret
    || configuredCookieSecret.length < 32
  )
) {
  throw new Error(
    "JWT_SECRET must contain at least 32 characters in production",
  );
}

const cookieSecret =
  configuredCookieSecret
  ?? (
    isProduction
      ? ""
      : "horos-local-development-session-secret-not-for-production"
  );

if (isProduction && legacyTidbEnabled && !process.env.DATABASE_URL) {
  throw new Error("Legacy TiDB is enabled but its configuration is incomplete");
}

if (
  isProduction
  && manusForgeEnabled
  && (!process.env.BUILT_IN_FORGE_API_URL || !process.env.BUILT_IN_FORGE_API_KEY)
) {
  throw new Error("Manus Forge is enabled but its configuration is incomplete");
}

if (
  isProduction
  && legacyOAuthEnabled
  && (!process.env.OAUTH_SERVER_URL || !process.env.VITE_APP_ID)
) {
  throw new Error("Legacy OAuth is enabled but its configuration is incomplete");
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret,
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction,
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  builtInForgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  builtInForgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  legacyTidbEnabled,
  manusForgeEnabled,
  legacyOAuthEnabled,
  // SMTP — for password reset emails
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: parseInt(process.env.SMTP_PORT ?? "587", 10),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@horos.mx",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
};
