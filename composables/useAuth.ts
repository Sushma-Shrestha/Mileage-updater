import type { PublicClientApplication, AccountInfo } from '@azure/msal-browser'

const SCOPES = [
  'https://graph.microsoft.com/Files.ReadWrite',
  'https://graph.microsoft.com/User.Read',
]

export const useAuth = () => {
  const nuxtApp = useNuxtApp()
  const msal = nuxtApp.$msal as PublicClientApplication

  const account = useState<AccountInfo | null>('auth:account', () => null)
  const isAuthenticated = computed(() => !!account.value)

  const initAuth = () => {
    if (!msal) return
    const accounts = msal.getAllAccounts()
    if (accounts.length > 0) {
      account.value = accounts[0]
      msal.setActiveAccount(accounts[0])
    }
  }

  // Redirect-based login — no popup, works in all browsers
  const login = async () => {
    await msal.loginRedirect({ scopes: SCOPES })
    // Page will reload after redirect — initAuth() picks up the account on return
  }

  const logout = async () => {
    await msal.logoutRedirect()
    account.value = null
  }

  const getAccessToken = async (): Promise<string> => {
    if (!account.value) throw new Error('Not authenticated')
    try {
      const result = await msal.acquireTokenSilent({
        scopes: SCOPES,
        account: account.value,
      })
      return result.accessToken
    } catch {
      // Silent failed — redirect to get a fresh token
      await msal.acquireTokenRedirect({ scopes: SCOPES })
      throw new Error('Redirecting for token…')
    }
  }

  return { account, isAuthenticated, initAuth, login, logout, getAccessToken }
}
