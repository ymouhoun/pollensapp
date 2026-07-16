const MAX_DATA_URL_LENGTH = 7_500_000;

function canvasToDataUrl(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to compress the source image'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Unable to read the compressed image'));
      reader.readAsDataURL(blob);
    }, 'image/jpeg', quality);
  });
}

export async function prepareFaceImage(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error('Unable to load the source image');
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  try {
    const initialScale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * initialScale));
    let height = Math.max(1, Math.round(bitmap.height * initialScale));
    let quality = 0.94;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: false });
      context.fillStyle = '#000';
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      const dataUrl = await canvasToDataUrl(canvas, quality);
      if (dataUrl.length <= MAX_DATA_URL_LENGTH) return dataUrl;
      width = Math.max(1, Math.round(width * 0.85));
      height = Math.max(1, Math.round(height * 0.85));
      quality = Math.max(0.82, quality - 0.03);
    }
  } finally {
    bitmap.close();
  }

  throw new Error('The source image remains too large after compression');
}
