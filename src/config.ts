export const appConfig = {
  appId: 'com.eneotool.app',
  appName: 'KWA-WATT',

  server: {
    hostname: 'ais-dev-buyvskluje4oym46nxby6x-11187875243.europe-west1.run.app',
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: [
      '*.firebaseapp.com',
      'accounts.google.com',
      '*.googleapis.com',
      '*.google.com',
    ],
  },

  android: {
    overrideUserAgent:
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
  },

  google: {
    webClientId:
      '186942591566-0ue10qur7se9aa19mros6otp1av2ghc3.apps.googleusercontent.com',
    scopes: ['email', 'profile'],
    loginMode: 'online',
  },

  storage: {
    dataKey: 'eneo_app_data',
    authKey: 'eneo_app_auth',
    authMaxAgeMs: 30 * 24 * 60 * 60 * 1000,
    syncDebounceMs: 5000,
  },

  assets: {
    helpImagesPath: '/assets/help',
  },
} as const;