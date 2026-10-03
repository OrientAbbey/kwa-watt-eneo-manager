import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {SplashScreen} from '@capacitor/splash-screen';
import App from './App.tsx';
import './index.css';
import { defineCustomElements } from '@ionic/pwa-elements/loader';

defineCustomElements(window);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// On ne retire l'écran de démarrage qu'une fois l'application peinte : le laisser partir au bout de 2 s revealait
// une WebView encore blanche (et le logo disparaissait avant d'avoir été vu). `launchAutoHide` reste le filet de sécurité.
const hideNativeSplash = () => {
  SplashScreen.hide({fadeOutDuration: 200}).catch(() => {});
};

if (document.readyState === 'complete') {
  requestAnimationFrame(hideNativeSplash);
} else {
  window.addEventListener('load', () => requestAnimationFrame(hideNativeSplash), {once: true});
}
// Si le JS n'a rien peint (erreur bloquante), on ne fige pas sur le splash.
setTimeout(hideNativeSplash, 4000);
