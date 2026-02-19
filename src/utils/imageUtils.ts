import Resizer from 'react-image-file-resizer';

export const compressImage = (file: File): Promise<string> =>
  new Promise((resolve) => {
    Resizer.imageFileResizer(
      file,
      1024, // max width
      1024, // max height
      "WEBP", // compress format
      80, // quality
      0, // rotation
      (uri) => {
        resolve(uri as string);
      },
      "base64" // output type
    );
  });
  