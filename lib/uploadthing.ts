import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  // ...suas outras rotas (ex.: imagens)
  productPdf: f({ pdf: { maxFileSize: "8MB" } }).onUploadComplete(
    async ({ file, metadata }) => {
      // Aqui você atualiza o Firestore com a URL do PDF
      // Ex.: await updateDoc(doc(db, "produtos", metadata.produtoId), { pdfUrl: file.url, atualizadoEm: serverTimestamp() });
      return { uploaded: true, url: file.url };
    },
  ),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
