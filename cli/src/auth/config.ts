// cli/src/auth/config.ts

export const OAUTH_SCOPES = [
  'Mail.ReadWrite',
  'Mail.Send',
  'User.Read',
  'MailboxSettings.ReadWrite',
  'offline_access', // without it Microsoft returns no refresh token and the session dies after 1h
].join(' ');

export function authorizeUrl(tenantId: string): string {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
}

export function tokenUrl(tenantId: string): string {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
}

export function deviceCodeUrl(tenantId: string): string {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/devicecode`;
}
