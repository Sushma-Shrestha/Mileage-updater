import { PublicClientApplication } from '@azure/msal-browser'

export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig()

  const msalConfig = {
    auth: {
      clientId: config.public.msalClientId,
      authority: 'https://login.microsoftonline.com/consumers',
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: true, // helps with redirect flow in some browsers
    },
  }

  const msalInstance = new PublicClientApplication(msalConfig)
  await msalInstance.initialize()

  // IMPORTANT: must call handleRedirectPromise() on every page load
  // to complete the redirect login and get the account back
  const result = await msalInstance.handleRedirectPromise()
  if (result?.account) {
    msalInstance.setActiveAccount(result.account)
  }

  nuxtApp.provide('msal', msalInstance)
})
