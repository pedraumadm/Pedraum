import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebaseAdmin";

/** Dica: mantenha runtime "nodejs" para usar Admin SDK no Edge não */
export const runtime = "nodejs";

/** ===================== Helper: Autorização (robusta) ===================== */
function isAllowedAdmin(decoded: any): boolean {
  // Aceita ADMIN_EMAILS OU ADMIN_ALLOWED_EMAILS e suporta wildcard de domínio
  const raw =
    process.env.ADMIN_EMAILS ||
    process.env.ADMIN_ALLOWED_EMAILS ||
    "";

  const allow = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean); // e-mails e/ou padrões tipo *@dominio.com

  const email = String(decoded?.email || "").toLowerCase();
  const role = (decoded as any)?.role;
  const hasAdminClaim =
    role === "admin" || (decoded as any)?.admin === true || (decoded as any)?.isAdmin === true;

  // Se tiver claim admin, já pode
  if (hasAdminClaim) return true;

  // Caso contrário, checa lista
  if (!email || allow.length === 0) return false;

  // Suporte a wildcard por domínio: ex. *@pedraum.com.br
  const match = allow.some((entry) => {
    if (entry.includes("*@")) {
      const domain = entry.split("*@").pop();
      return !!domain && email.endsWith(`@${domain}`);
    }
    return entry === email;
  });

  return match;
}

/** ===================== POST: Revogar sessões ===================== */
export async function POST(req: NextRequest) {
  try {
    const { auth } = getAdmin();

    // 1) Token do admin logado
    const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!idToken) {
      return NextResponse.json({ error: "missing_token" }, { status: 401 });
    }

    const decodedAdmin = await auth.verifyIdToken(idToken);
    if (!isAllowedAdmin(decodedAdmin)) {
      // (Evito vazar e-mail em produção; log útil em dev)
      if (process.env.NODE_ENV !== "production") {
        console.log("[revoke-tokens] not authorized:", decodedAdmin?.email);
      }
      return NextResponse.json({ error: "not_authorized" }, { status: 403 });
    }

    // 2) Payload com uid do usuário alvo
    const { uid } = await req.json();
    if (!uid) {
      return NextResponse.json({ error: "uid_required" }, { status: 400 });
    }

    // 3) Revogar refresh tokens (encerra todas as sessões ativas)
    await auth.revokeRefreshTokens(uid);

    return NextResponse.json({ ok: true, message: "Sessões encerradas com sucesso." });
  } catch (e: any) {
    console.error("[admin/revoke-tokens] erro:", e);
    return NextResponse.json(
      { error: e?.message || "internal_error" },
      { status: 500 },
    );
  }
}
