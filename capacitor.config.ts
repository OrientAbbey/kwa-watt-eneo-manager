import { CapacitorConfig } from '@capacitor/cli';
import { appConfig } from './src/config';

const config: CapacitorConfig = {
  appId: appConfig.appId,
  appName: appConfig.appName,
  webDir: 'dist',
  // Couleur de fond de la WebView : sans elle, le blanc s'affiche entre la fin du splash et le premier rendu de la page
  backgroundColor: '#1e1b4b',
  server: {
    hostname: appConfig.server.hostname,
    androidScheme: appConfig.server.androidScheme,
    iosScheme: appConfig.server.iosScheme,
    allowNavigation: [...appConfig.server.allowNavigation],
  },
  android: {
    overrideUserAgent: appConfig.android.overrideUserAgent,
  },
  plugins: {
    SplashScreen: {
      // Durée MAXIMALE : le splash est caché plus tôt, dès que l'interface est affichée (voir src/lib/appReady.ts)
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#1e1b4b",
      androidSplashResourceName: "splash_logo",
      androidScaleType: "CENTER",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#f97316",
      splashFullScreen: true,
      splashImmersive: true,
      useDialog: false,
    },
    LocalNotifications: {
      // Icône monochrome de la barre d'état + couleur d'accent (res/drawable/ic_stat_notify.xml)
      smallIcon: "ic_stat_notify",
      iconColor: "#F97316",
    },
  },
};

export default config;
