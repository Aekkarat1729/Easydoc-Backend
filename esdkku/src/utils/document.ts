import { TypeDocumentOptions } from "@/config/documentType";

export function getDocumentNameById(id: number): string {
  const found = TypeDocumentOptions.find((doc) => doc.key === id);

  return found ? found.value : "ไม่พบประเภทเอกสาร";
}