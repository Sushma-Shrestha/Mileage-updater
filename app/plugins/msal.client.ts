// app/plugins/msal.client.ts
//
// The `.client.ts` suffix tells Nuxt to run this plugin in the browser only.
// It initialises MSAL and resolves any pending redirect login before the app mounts.

import {
  PublicClientApplication,
  type Configuration,
  type AuthenticationResult,
} from '@azure/msal-browser'

import { defineNuxtPlugin, useRuntimeConfig } from '#app'

export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig()

  const msalConfig: Configuration = {
    auth: {
      clientId: config.public.msalClientId as string,
      // 'consumers' = personal Microsoft accounts (outlook.com, hotmail.com, live.com)
      authority: 'https://login.microsoftonline.com/consumers',
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: true,
    },
  }

  const msal = new PublicClientApplication(msalConfig)

  // initialize() must be called before any other MSAL method
  await msal.initialize()

  // handleRedirectPromise() MUST run on every page load.
  // When Microsoft redirects back after login it completes the auth flow
  // and returns the AuthenticationResult with the account + tokens.
  const redirectResult: AuthenticationResult | null =
    await msal.handleRedirectPromise()

  if (redirectResult?.account) {
    msal.setActiveAccount(redirectResult.account)
  }

  // Expose the instance to composables via useNuxtApp().$msal
  nuxtApp.provide('msal', msal)
})
