/** Informations affichées dans « À propos ». La version vient de package.json (injectée par Vite au build). */
declare const __APP_VERSION__: string | undefined;

export const APP_VERSION: string = typeof __APP_VERSION__ !== "undefined" && __APP_VERSION__ ? __APP_VERSION__ : "dev";
export const APP_LICENSE = "Apache-2.0";
export const REPO_URL = "https://github.com/OrientAbbey/kwa-watt-eneo-manager";
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
export const ISSUES_URL = `${REPO_URL}/issues`;
