import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eneotool.app',
  appName: 'KWA-WATT',
  webDir: 'dist',
  server: {
    hostname: 'ais-dev-buyvskluje4oym46nxby6x-11187875243.europe-west1.run.app',
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: [
      '*.firebaseapp.com',
      'accounts.google.com',
      '*.googleapis.com',
      '*.google.com'
    ],
  },
  android: {
    overrideUserAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#4f46e5",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: false,
    },
  },
};

export default config;
