import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import SourcePicker from '../components/ui/SourcePicker';
import { compressImage } from '../lib/utils';
import { Dialog } from '@capacitor/dialog';

export type ImageSource = 'camera' | 'gallery';

export interface ImagePickerOptions {
  /** Plus grand côté en pixels après compression (défaut 720, à augmenter pour l'OCR). */
  maxSize?: number;
  quality?: number;
  /** Taille maximale (caractères Base64) du résultat ; défaut = limite de stockage des photos de l'application. */
  maxChars?: number;
}

export function useImagePicker(onImage: (base64: string) => void, title?: string, options: ImagePickerOptions = {}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const openPicker = () => setIsPickerOpen(true);

  const handleSelect = async (source: ImageSource) => {
    try {
      // Limiter la dimension DÈS LA SOURCE : sans cela, une photo d'appareil pleine résolution (plusieurs Mo en Base64)
      // était chargée en mémoire avant d'être réduite, et la réduction échouait de temps en temps.
      const maxSize = options.maxSize ?? 720;
      const side = Math.round(maxSize * 1.4);
      const image = await Camera.getPhoto({
        quality: 85,
        width: side,
        height: side,
        correctOrientation: true,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      });

      if (image.base64String) {
        const base64 = await compressImage(`data:image/${image.format};base64,${image.base64String}`, options.maxSize, options.quality, options.maxChars);
        onImage(base64);
      }
    } catch (error: any) {
      if (error?.message?.includes('cancelled')) return;
      console.error('Error picking image', error);
      await Dialog.alert({
        title: 'Photo non enregistrée',
        message: "Cette photo n'a pas pu être réduite assez pour être conservée. Essayez une autre photo ou prenez-la en plus basse résolution.",
      });
    }
  };

  const picker = (
    <SourcePicker isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} onSelect={handleSelect} title={title} />
  );

  return { openPicker, picker };
}