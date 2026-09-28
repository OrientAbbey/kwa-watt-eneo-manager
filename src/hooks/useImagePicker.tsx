import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import SourcePicker from '../components/ui/SourcePicker';
import { compressImage } from '../lib/utils';

export type ImageSource = 'camera' | 'gallery';

export interface ImagePickerOptions {
  /** Plus grand côté en pixels après compression (défaut 720, à augmenter pour l'OCR). */
  maxSize?: number;
  quality?: number;
}

export function useImagePicker(onImage: (base64: string) => void, title?: string, options: ImagePickerOptions = {}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const openPicker = () => setIsPickerOpen(true);

  const handleSelect = async (source: ImageSource) => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      });

      if (image.base64String) {
        const base64 = await compressImage(`data:image/${image.format};base64,${image.base64String}`, options.maxSize, options.quality);
        onImage(base64);
      }
    } catch (error: any) {
      if (error?.message?.includes('cancelled')) return;
      console.error('Error picking image', error);
    }
  };

  const picker = (
    <SourcePicker isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} onSelect={handleSelect} title={title} />
  );

  return { openPicker, picker };
}