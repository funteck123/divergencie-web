/**
 * A picture the person picked or pasted, as a smaller JPEG data URL (longest side 1600 px) so it uploads fast on a phone connection.
 * The server shrinks it again to its own limit before saving, so this is only about the upload.
 */
export async function shrinkToDataUrl(file: Blob, max = 1600, quality = 0.8): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * k));
  canvas.height = Math.max(1, Math.round(bitmap.height * k));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot resize pictures.");
  ctx.fillStyle = "#ffffff"; // a picture with transparency becomes white, not black. design-lint: allow
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", quality);
}
