function drawn(file: File, max: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export const logoDataUrl = async (file: File) => (await drawn(file, 480)).toDataURL('image/png');

/** Foto de anexo em tamanho de tela: o backup guarda tudo em um texto só, com limite de cerca de 512 MB. */
export async function shrinkPhoto(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const c = await drawn(file, 1800);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.85));
    return blob && blob.size < file.size ? new File([blob], file.name, { type: 'image/jpeg' }) : file;
  } catch {
    return file; // formato que o navegador não abre: guarda como veio
  }
}
