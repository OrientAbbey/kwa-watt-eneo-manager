import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { AppState } from '../types';

const COLLECTION_NAME = 'user_data';

export async function saveUserDataToBackend(state: AppState) {
  if (!auth.currentUser) return;
  const path = `${COLLECTION_NAME}/${auth.currentUser.uid}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, auth.currentUser.uid);
    await setDoc(docRef, {
      state: JSON.stringify(state),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadUserDataFromBackend(): Promise<AppState | null> {
  if (!auth.currentUser) return null;
  const path = `${COLLECTION_NAME}/${auth.currentUser.uid}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, auth.currentUser.uid);
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data().state) {
      return JSON.parse(snap.data().state) as AppState;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
  return null;
}
