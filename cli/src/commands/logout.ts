import { clearTokens } from '../auth/tokenStore.js';

export function logoutCommand(): void {
  clearTokens();
  console.log('Logged out. Tokens cleared.');
}
