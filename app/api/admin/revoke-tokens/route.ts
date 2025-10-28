import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebaseAdmin";

/** ===================== Helper: Autorização ===================== */
function isAllowedAdmin(decoded: any): boolean {
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const email = (decoded?.email || "").toLowerCase();
  const role = (decoded as any)?.role;
  const isAdminClaim =
    role === "admin" || (decoded as any)?.admin === true || (decoded as any)?.isAdmin === true;

  const emailOk = email && allow.length > 0 && allow.includes(email);

  if (process.env.NODE_ENV !== "production") {
    console.log("[admin guard] email:", email, "| allow:", allow, "| claimAdmin:", isAdminClaim);
  }

  return Boolean(isAdminClaim || emailOk);
}

/** ===================== POST: Revogar sessões ===================== */
export async function POST(req: NextRequest) {
  try {
    const { auth } = getAdmin();

    // 1. Validar token do admin logado
    const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!idToken) {
      return NextResponse.json({ error: "Sem token" }, { status: 401 });
    }

    const decodedAdmin = await auth.verifyIdToken(idToken);
    if (!isAllowedAdmin(decodedAdmin)) {
      return NextResponse.json({ error: "Proibido" }, { status: 403 });
    }

    // 2. Ler payload
    const { uid } = await req.json();
    if (!uid) return NextResponse.json({ error: "uid obrigatório" }, { status: 400 });

    // 3. Revogar tokens
    await auth.revokeRefreshTokens(uid);

    return NextResponse.json({ ok: true, message: "Sessões encerradas com sucesso." });
  } catch (e: any) {
    console.error("[admin/revoke-tokens] erro:", e);
    return NextResponse.json({ error: e?.message || "Erro interno" }, { status: 500 });
  }
}
