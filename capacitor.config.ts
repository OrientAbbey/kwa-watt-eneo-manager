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
    // Fond de la WebView. Sans cela elle est BLANCHE par défaut (Bridge.java) et recouvre le fond du splash : c'est
    // l'aplat blanc qui restait après le démarrage, même avec un thème et un CSS corrects.
    backgroundColor: '#1e1b4b',
  },
  plugins: {
    SplashScreen: {
      // Le splash se retire au premier rendu React (cf. src/main.tsx) ; ces valeurs ne sont que le filet de sécurité
      // si le JS est lent ou plante.
      launchShowDuration: 2000,
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
      // pas de `layoutName` : res/layout/launch_screen.xml n'existe pas (le plugin journalisait « Layout not found »
      // et retombait sur son ImageView). Le logo est fourni par `androidSplashResourceName` + le thème de lancement.
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
