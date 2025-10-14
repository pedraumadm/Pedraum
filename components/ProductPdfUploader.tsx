"use client";
import PDFUploader from "./PDFUploader";

type Props = {
  onUploaded: (url: string | null) => void;
  initialUrl?: string | null;
};

/** Wrapper específico do produto apontando para o slug padrão de PDF. */
export default function ProductPdfUploader({
  onUploaded,
  initialUrl = null,
}: Props) {
  return (
    <PDFUploader
      onUploaded={onUploaded}
      initialUrl={initialUrl}
      endpoint="pdfUploader"
    />
  );
}
