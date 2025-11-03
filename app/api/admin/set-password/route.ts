import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/** ===================== Helper: Geração de senha ===================== */
function genTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 10; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result + "!";
}

/** ===================== Helper: Autorização ===================== */
function isAllowedAdmin(decoded: any): boolean {
  const allow = (
    process.env.ADMIN_ALLOWED_EMAILS || // novo alias
    process.env.ADMIN_EMAILS || ""      // compatível com o que você já usa
  )
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const email = (decoded?.email || "").toLowerCase();
  const role = (decoded as any)?.role;
  const isAdminClaim =
    role === "admin" || (decoded as any)?.admin === true || (decoded as any)?.isAdmin === true;

  const emailOk = !!email && allow.length > 0 && allow.includes(email);

  if (process.env.NODE_ENV !== "production") {
    console.log("[admin guard] email:", email, "| allow:", allow, "| claimAdmin:", isAdminClaim);
  }

  return Boolean(isAdminClaim || emailOk);
}

/** ===================== POST: Redefinir senha ===================== */
export async function POST(req: NextRequest) {
  try {
    const { auth } = getAdmin(); // <- falha aqui indica problema nas ENVs do Firebase Admin

    // 1) Validar token do admin logado (header Authorization: Bearer <idToken>)
    const idToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!idToken) {
      return NextResponse.json({ error: "missing_token", message: "Envie Authorization: Bearer <idToken>" }, { status: 401 });
    }

    // Se quiser, troque para verifyIdToken(idToken, true) para revogação estrita
    const decoded = await auth.verifyIdToken(idToken);
    if (!isAllowedAdmin(decoded)) {
      return NextResponse.json({ error: "forbidden", message: "Usuário não autorizado" }, { status: 403 });
    }

    // 2) Ler payload
    const { uid, newPassword, generate } = await req.json();
    if (!uid) {
      return NextResponse.json({ error: "missing_uid", message: "Campo 'uid' é obrigatório" }, { status: 400 });
    }

    const password = generate || !newPassword ? genTempPassword() : String(newPassword);

    // 3) Atualizar senha via Admin SDK
    await auth.updateUser(uid, { password });
    // flag para forçar troca após login (você já usa isso no front)
    await auth.setCustomUserClaims(uid, { must_update_password: true });

    // 4) Retornar resultado
    return NextResponse.json({
      ok: true,
      message: "Senha redefinida com sucesso.",
      tempPassword: generate ? password : undefined,
    });
  } catch (e: any) {
    console.error("[admin/set-password] erro:", e);
    return NextResponse.json(
      { error: "internal_error", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}
