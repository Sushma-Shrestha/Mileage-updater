// app/composables/useAuth.ts
//
// Wraps MSAL for login / logout / token acquisition.
// Uses redirect flow (no popups) — works in all browsers without popup blockers.

import { computed } from 'vue'
import { useState, useNuxtApp } from '#app'
import {
  type PublicClientApplication,
  type AccountInfo,
} from '@azure/msal-browser'

// Full-URL scopes are required for personal Microsoft accounts
const SCOPES: string[] = [
  'https://graph.microsoft.com/Files.ReadWrite',
  'https://graph.microsoft.com/User.Read',
]

export function useAuth() {
  // $msal was provided by app/plugins/msal.client.ts
  const nuxtApp = useNuxtApp()
  const msal = nuxtApp.$msal as PublicClientApplication

  // Global reactive state — useState persists across component boundaries
  const account = useState<AccountInfo | null>('auth:account', () => null)
  const isAuthenticated = computed<boolean>(() => account.value !== null)

  /**
   * Call on app mount to restore a session from localStorage,
   * including accounts returned after a loginRedirect().
   */
  function initAuth(): void {
    if (!msal) return
    const accounts: AccountInfo[] = msal.getAllAccounts()
    if (accounts.length > 0) {
      account.value = accounts[0]!
      msal.setActiveAccount(accounts[0]!)
    }
  }

  /**
   * Redirect to Microsoft login page.
   * The page navigates away — on return, handleRedirectPromise() (in the plugin)
   * completes the flow and initAuth() restores the account.
   */
  async function login(): Promise<void> {
    await msal.loginRedirect({ scopes: SCOPES })
  }

  /**
   * Redirect to Microsoft logout page, then return to the app root.
   */
  async function logout(): Promise<void> {
    const currentAccount = account.value ?? undefined
    account.value = null
    await msal.logoutRedirect({ account: currentAccount })
  }

  /**
   * Silently acquire a fresh access token.
   * Falls back to acquireTokenRedirect if the session has expired.
   */
  async function getAccessToken(): Promise<string> {
    if (!account.value) {
      throw new Error('Not authenticated — call login() first.')
    }

    try {
      const result = await msal.acquireTokenSilent({
        scopes: SCOPES,
        account: account.value,
      })
      return result.accessToken
    } catch {
      // Silent acquisition failed (expired session, MFA required, etc.)
      // Redirect to Microsoft to get a fresh token — page navigates away.
      await msal.acquireTokenRedirect({
        scopes: SCOPES,
        account: account.value,
      })
      // Never reached — satisfies TypeScript return type
      throw new Error('Redirecting for token renewal…')
    }
  }

  return {
    account,
    isAuthenticated,
    initAuth,
    login,
    logout,
    getAccessToken,
  }
}
