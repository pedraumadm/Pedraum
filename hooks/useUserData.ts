// =============================
// hooks/useUserData.ts
// =============================

"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";

interface UserData {
  nome: string;
  email: string;
  tipo?: string;
  [key: string]: any;
}

export function useUserData() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const ref = doc(db, "usuarios", user.uid);
        const snapshot = await getDoc(ref);

        if (snapshot.exists()) {
          setUserData({
            ...snapshot.data(),
            email: user.email || "",
          } as UserData);
        }
      }

      setLoading(false);
    };

    fetchUserData();
  }, []);

  return { userData, loading };
}
