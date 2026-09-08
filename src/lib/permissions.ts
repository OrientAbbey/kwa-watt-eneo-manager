import { Camera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export async function requestAllPermissions() {
  if (Capacitor.getPlatform() === 'web') {
    // Permissions are requested automatically on the web when needed
    return null;
  }

  console.log("Requesting all permissions...");
  
  try {
    // Camera & Photos
    const camStatus = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
    console.log("Camera/Photos status:", camStatus);

    // Filesystem
    const fsStatus = await Filesystem.requestPermissions();
    console.log("Filesystem status:", fsStatus);

    // Notifications
    const notifStatus = await LocalNotifications.requestPermissions();
    console.log("Notifications status:", notifStatus);
    
    return {
      camera: camStatus.camera,
      photos: camStatus.photos,
      filesystem: fsStatus.publicStorage,
      notifications: notifStatus.display
    };
  } catch (error: any) {
    if (error?.message === 'Not implemented on web.') {
      return null;
    }
    console.error("Critical error while requesting permissions:", error);
    return null;
  }
}
