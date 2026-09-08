# Documentation - KWA-WATT (ENEO Manager CM)

## Table des Matières
1. [Introduction](#introduction)
2. [Fonctionnalités Principales](#fonctionnalités-principales)
3. [Architecture de l'Application](#architecture)
4. [Authentification et Synchronisation](#authentification-et-synchronisation)
5. [Détails des Modules](#détails-des-modules)
   - [Dashboard](#dashboard)
   - [Calculatrice](#calculatrice)
   - [Historique](#historique)
   - [Profil](#profil)
   - [Aide \& Galerie](#aide--galerie)
   - [Réglages](#réglages)
6. [Capacitor \& Permissions Native](#capacitor--permissions-natives)

## Introduction
KWA-WATT est une application logicielle de gestion de la consommation d'énergie électrique prépayée de la compagnie ENEO au Cameroun. Elle permet à l'utilisateur de centraliser, d'analyser ses achats de crédit d'énergie ainsi que sa consommation, le tout de manière autonome et confidentielle.

## Fonctionnalités Principales
- Suivi de la consommation (Mensuelle).
- Suivi du crédit / recharges prépayées avec alertes de seuils (dépassement anormal).
- Outil bidirectionnel performant (Calcul kWh vers FCFA et inversement FCFA vers kWh).
- Interface Multi-profils : Ajoutez un compteur pour votre Maison et un pour votre Bureau.
- Synchronisation Cloud avec Firebase (Google Auth) et mode 100% hors ligne complet pour les invités.
- Stockage d'historique et des fichiers en local en JSON et CSV avec import/export.
- Mode sombre optimisé pour soulager la vision nocturne, graphiques et infobulles responsives.
- Support Mobile natif grâce à Capacitor (demande de permissions intégrée).

## Architecture
L'architecture de l'application est conçue pour fonctionner comme une SPA web (Single Page Application) et une application mobile native (grâce à Capacitor). 
La technologie est :
- **React 19 & Vite**
- **Tailwind CSS** (design utilitaire robuste adaptatif pour le dark/light mode)
- **Firebase** (Firestore et Google Authentication)
- **Recharts** (Visualisation interactive de données financières et d'énergies)
Le contexte de l'application (`AppContext`) maintient un état global persistant via `localStorage`, et synchronisé continuellement vers Firebase.

## Authentification et Synchronisation
Pour sécuriser et correspondre au flux de confidentialité :
- **Visiteurs (hors-ligne uniquement)** : Accès "Invité". Aucune donnée ne quitte le téléphone, uniquement un historique local continu.
- **Connectés Google (Sync automatique)** : À chaque connexion ou rafraichissement, le state est rechargé. Chaque modification déclenche une synchronisation discrète (debounce) garantissant que les données seront en ligne le lendemain.
- **Sécurité et Expiration** : Si l'application n'est pas consultée dans les **30 jours**, une déconnexion préventive locale efface la session tampon par mesure de sécurité. La possibilité de se déconnecter et de retirer sa photo de profil est possible dans l'interface de Profil.

## Détails des Modules

### Dashboard 
Le cœur analytique. Met en corrélation la date avec l'enregistrement des relevés.
- Jauges de consommation restantes calculées via l'historique et les prédictions passées en utilisant la moyenne des 6 mois.
- Les tooltips utilisent nativement les couleurs des courbes pour une clarté optimale. 

### Calculatrice
Outil technique dynamique.
- Mode 1: FCFA => kWh (Combien d'énergie m'offrira mon billet de 10 000 FCFA ?).
- Mode 2: kWh => FCFA (Comment payer ces 240 kWh d'énergie estimés ?).
- Transition Dark Mode des boutons rectifiée pour toujours être lisible.

### Historique
Contient des formulaires réactifs.
- Gestion CRUD complète (Ajouter, Editer, Supprimer).
- Import et export CSV ou JSON.

### Profil
Information détaillée physique relative au compteur :
- Numéro ENEO, Quartier.
- Stockage de photographies hors ligne (Caméra de l'appareil) de la carte associée à chaque instance de compteurs. 
- Actions : Permet le changement de modes et de statut utilisateur (déconnexion de connexion ou arrêt du mode visiteur).

### Aide & Galerie
Interface de communication :
- Aide sur l'importation.
- Redirection automatique pour un appel à ENEO (8010) via téléphone.
- Création directe d'email de Support Client ENEO via Mail Client intégré.
- Galerie non-supprimable de guides Eneo par défaut, auxquels les images de la caméra de l'utilisateur s'additionnent.

## Capacitor & Permissions Natives
Via le flux d'import `capacitor/camera` et `@capacitor/filesystem`, les capacités matérielles Android sont exploitées en demandant aux smartphones l'habilitation avant usage (Caméra, Fichiers Système). Des images de bases (icones/splash) préparent le terrain pour une exportation APK ou bundle (PWA) propre.
