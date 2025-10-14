// utils/passwordReset.ts
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/firebaseConfig";

export async function handlePasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
    alert(
      "Enviamos um e-mail para redefinição de senha! Confira sua caixa de entrada (ou spam).",
    );
  } catch (err: any) {
    if (err.code === "auth/user-not-found") {
      alert("Nenhum usuário encontrado com esse e-mail.");
    } else if (err.code === "auth/invalid-email") {
      alert("E-mail inválido.");
    } else {
      alert("Erro ao tentar redefinir a senha. Tente novamente.");
    }
  }
}
