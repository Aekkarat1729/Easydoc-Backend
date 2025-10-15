import { get, post } from '@/lib/axios';
import { create } from 'zustand';
import { DocumentResponse, DocumentRow, sentDocument, sentDocumentResponse } from '@/types/documentType';
import { appStore } from './appStore';

//mocks
import { documentOfficerMail_Mock } from '@/mock/documentOfficerMailMock';
import { documentUserMail_Mock } from '@/mock/documentUserMailMock';
import { formatThaiDateTime } from '@/utils/formatThaiDateTime';

interface DocumentStore {
  documents: DocumentRow[] | null;
  officerMail: DocumentRow[] | null;
  setDocuments: (data: DocumentRow[]) => void;
  fetchOfficerMail: () => Promise<void>;
  fetchUserMail: () => Promise<void>;
  sendDocumentForOfficer: (data: sentDocument) => Promise<sentDocumentResponse>;
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  documents: null,

  officerMail: null,
  setDocuments: (data) => set({ documents: data }),

  fetchOfficerMail: async () => {

    if (process.env.NEXT_PUBLIC_IS_PRODUCTION === 'false') {
      set({ officerMail: documentOfficerMail_Mock });
      return;
    }

    try {
      const res = await get<DocumentResponse>("/sentmail");

      const mapped = res?.data?.map((doc) => {

        return {
          id: doc.id,
          number: doc.number || '-',
          title: doc.subject || '-',
          description: doc.description || "-",
          type: doc.category,
          email: doc.receiver?.email || "-",
          firstName: doc.receiver?.firstName || "",
          lastName: doc.receiver?.lastName || "",
          date: formatThaiDateTime(doc.sentAt),
          time: "-",
          status: doc.isReply ? '1' : '3',
          note: doc.remark || "-",
          profileImage: doc.receiver?.profileImage
        };
      });

      set({ officerMail: mapped });

    } catch (error) {
      console.error("Failed to fetch documents", error);
    }
  },

  fetchUserMail: async () => {

    if (process.env.NEXT_PUBLIC_IS_PRODUCTION === 'false') {
      set({ documents: documentUserMail_Mock });
      return;
    }

    try {
      const res = await get<DocumentResponse>("/inbox");

      const mapped = res?.data?.map((doc) => {

        return {
          id: doc.id,
          number: doc.number || '-',
          title: doc.subject || '-',
          description: doc.description || "-",
          type: doc.category,
          email: doc.sender?.email || "-",
          firstName: doc.sender?.firstName || "",
          lastName: doc.sender?.lastName || "",
          date: formatThaiDateTime(doc.sentAt),
          time: "-",
          status: doc.isForward ? '4' : doc.isReply ? '1' : '3',
          note: doc.remark || "-",
          profileImage: doc.sender?.profileImage
        };
      });

      set({ documents: mapped });

    } catch (error) {
      console.error("Failed to fetch documents", error);
    }
  },

  sendDocumentForOfficer: async (data) => {

    if (process.env.NEXT_PUBLIC_IS_PRODUCTION === 'false') {
      return {
        success: true,
        message: "Document sent successfully",
        data: data
      };
    }

    appStore.getState().setLoading(true);

    const formData = new FormData();
    for (const file of data.file) {
      formData.append('file', file);
    }

    formData.append('receiverEmail', data.receiverEmail);
    formData.append('subject', data.subject);
    formData.append('remark', data.remark || '');
    formData.append('number', data.number);
    formData.append('category', data.category.toString());
    formData.append('description', data.description);
    formData.append('status', data.status);

    try {
      const res = await post<sentDocumentResponse>("/sent", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res;
    } catch (error: unknown) {
      console.error("sendDocumentForOfficer failed:", error);

      throw new Error(
        error instanceof Error ? error.message : "Failed to send document"
      );
    } finally {
      appStore.getState().setLoading(false);
    }
  },

}));