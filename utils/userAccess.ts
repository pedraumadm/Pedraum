import { db, auth } from "@/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export type UserAccess = {
  role?: "admin" | "user";
  isPatrocinador?: boolean;
  patrocinadorDesde?: any;
  patrocinadorAte?: any;
};

export async function ensureUserDoc(
  uid: string,
  extra: Partial<UserAccess> = {},
) {
  const ref = doc(db, "usuarios", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // cria com defaults e os extras
    await setDoc(
      ref,
      {
        role: "user",
        isPatrocinador: false,
        patrocinadorDesde: null,
        patrocinadorAte: null,
        createdAt: serverTimestamp(),
        ...extra,
      },
      { merge: true },
    );
  } else {
    // garante que os campos existem
    const data = snap.data() || {};
    const patch: any = {};
    if (typeof data.role === "undefined") patch.role = "user";
    if (typeof data.isPatrocinador === "undefined")
      patch.isPatrocinador = false;
    if (typeof data.patrocinadorDesde === "undefined")
      patch.patrocinadorDesde = null;
    if (typeof data.patrocinadorAte === "undefined")
      patch.patrocinadorAte = null;
    if (Object.keys(patch).length) await updateDoc(ref, patch);
    if (Object.keys(extra).length) await updateDoc(ref, extra as any);
  }
  return (await getDoc(ref)).data() as UserAccess;
}

/** Hook simples para saber se usuário é admin/patrocinador */
export function watchUserAccess(
  cb: (info: {
    uid: string | null;
    role: "admin" | "user" | null;
    isPatrocinador: boolean;
  }) => void,
) {
  const unsub = onAuthStateChanged(auth, async (u) => {
    if (!u) return cb({ uid: null, role: null, isPatrocinador: false });
    const ref = doc(db, "usuarios", u.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await ensureUserDoc(u.uid);
      const snap2 = await getDoc(ref);
      const d = snap2.data() || {};
      return cb({
        uid: u.uid,
        role: d.role ?? "user",
        isPatrocinador: !!d.isPatrocinador,
      });
    }
    const d = snap.data() || {};
    // se faltar campo, corrige
    await ensureUserDoc(u.uid);
    cb({
      uid: u.uid,
      role: d.role ?? "user",
      isPatrocinador: !!d.isPatrocinador,
    });
  });
  return unsub;
}
