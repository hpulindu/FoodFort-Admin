import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { storage } from "./firebase";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export async function uploadMenuItemImage(itemId: string, file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Image must be JPEG, PNG, WebP, GIF, or AVIF.");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `menu-items/${itemId}/${Date.now()}.${ext}`;
  const objectRef = ref(storage, path);
  await uploadBytes(objectRef, file, { contentType: file.type });
  return getDownloadURL(objectRef);
}

/** Best-effort delete of a previously uploaded image by its download URL. */
export async function deleteImageByUrl(url: string): Promise<void> {
  try {
    const objectRef = ref(storage, url);
    await deleteObject(objectRef);
  } catch {
    // Ignore — object may already be gone or URL not a storage ref.
  }
}
