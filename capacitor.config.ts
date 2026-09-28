import { CapacitorConfig } from '@capacitor/cli';
import { appConfig } from './src/config';

const config: CapacitorConfig = {
  appId: appConfig.appId,
  appName: appConfig.appName,
  webDir: 'dist',
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
    LocalNotifications: {
      // Icône monochrome de la barre d'état + couleur d'accent (res/drawable/ic_stat_notify.xml)
      smallIcon: "ic_stat_notify",
      iconColor: "#F97316",
    },
  },
};

export default config;
