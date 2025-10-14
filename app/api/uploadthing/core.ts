// app/api/uploadthing/core.ts
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

/** Para satisfazer o TS (union literal do UploadThing) sem estourar tipagem.
 *  Mantemos só os valores que usaremos. Se quiser outros, adicione na lista.
 */
const allowedSizes = ["4MB", "8MB", "16MB", "32MB"] as const;
type AllowedSize = (typeof allowedSizes)[number];
function pickSize(
  envVal: string | undefined,
  fallback: AllowedSize,
): AllowedSize {
  return (allowedSizes as readonly string[]).includes(envVal ?? "")
    ? (envVal as AllowedSize)
    : fallback;
}

const MAX_IMG: AllowedSize = pickSize(
  process.env.NEXT_PUBLIC_UPLOAD_MAX_IMG_SIZE,
  "8MB",
);
const MAX_PDF: AllowedSize = pickSize(
  process.env.NEXT_PUBLIC_UPLOAD_MAX_PDF_SIZE,
  "16MB",
);

const IMG_CFG = { image: { maxFileSize: MAX_IMG, maxFileCount: 5 as const } };
const PDF_CFG = { blob: { maxFileSize: MAX_PDF, maxFileCount: 1 as const } };

async function getCtx() {
  // TODO: amarrar com sua auth (Firebase/NextAuth) quando quiser exigir login
  return { userId: "anon" as string | null };
}

function assertPDF(contentType?: string, fileName?: string) {
  const byCT = (contentType ?? "").toLowerCase().includes("pdf");
  const byExt = (fileName ?? "").toLowerCase().endsWith(".pdf");
  if (!byCT && !byExt) throw new Error("Arquivo enviado não é PDF válido.");
}

export const ourFileRouter = {
  /** Slug PADRÃO para imagens (use no app todo). */
  imageUploader: f(IMG_CFG)
    .middleware(async () => ({ userId: (await getCtx()).userId }))
    .onUploadComplete(async ({ file }) => ({
      url: file.url,
      key: file.key,
      name: file.name,
      size: file.size,
    })),
  // ...imports e código já existentes acima

  // ADICIONE DENTRO do objeto ourFileRouter:
  produtoPdf: f(PDF_CFG)
    .middleware(async () => ({ userId: (await getCtx()).userId }))
    .onUploadComplete(async ({ file }) => {
      assertPDF((file as any)?.type, file.name);
      return { url: file.url, key: file.key, name: file.name, size: file.size };
    }),

  /** Slug PADRÃO para PDF. */
  pdfUploader: f(PDF_CFG)
    .middleware(async () => ({ userId: (await getCtx()).userId }))
    .onUploadComplete(async ({ file }) => {
      assertPDF((file as any)?.type, file.name);
      return { url: file.url, key: file.key, name: file.name, size: file.size };
    }),

  /** Aliases de compatibilidade (mantêm telas antigas vivas). */
  machineImageUploader: f(IMG_CFG)
    .middleware(async () => ({ userId: (await getCtx()).userId }))
    .onUploadComplete(async ({ file }) => ({ url: file.url, key: file.key })),
  productImageUploader: f(IMG_CFG)
    .middleware(async () => ({ userId: (await getCtx()).userId }))
    .onUploadComplete(async ({ file }) => ({ url: file.url, key: file.key })),
  demandImageUploader: f(IMG_CFG)
    .middleware(async () => ({ userId: (await getCtx()).userId }))
    .onUploadComplete(async ({ file }) => ({ url: file.url, key: file.key })),
  serviceImageUploader: f(IMG_CFG)
    .middleware(async () => ({ userId: (await getCtx()).userId }))
    .onUploadComplete(async ({ file }) => ({ url: file.url, key: file.key })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
