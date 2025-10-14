// utils/uploadImage.ts
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Recebe arquivo e nome único (ex: id da máquina), retorna a URL
export async function uploadImageToStorage(
  file: File,
  fileName: string,
): Promise<string> {
  const storage = getStorage();
  const storageRef = ref(storage, `machines/${fileName}-${Date.now()}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
}
