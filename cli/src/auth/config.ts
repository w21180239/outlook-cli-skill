// cli/src/auth/config.ts

export const OAUTH_SCOPES = [
  'Mail.ReadWrite',
  'Mail.Send',
  'User.Read',
  'MailboxSettings.ReadWrite',
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
