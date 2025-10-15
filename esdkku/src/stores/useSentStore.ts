import { create } from "zustand";
import { get, post } from "@/lib/axios";

//mocks
import { documentTimeline_Mock } from "@/mock/documentTimelineMock";
import { sentDocDetail_Mock } from "@/mock/sentDocDetailMock";

//type
import { MappedSentItem, SentDetailResponse, SentDetailResponseFromApi, SentDocumentResponse, SentDocumentToInterface, SentReplyPayload, SentReplyResponse } from "@/types/documentType";
import { appStore } from "./appStore";
import { formatThaiDateTime } from "@/utils/formatThaiDateTime";

// ----------- STORE -----------

interface SentStore {
  fetchSentById: (id: number) => Promise<SentDocumentToInterface | null>;
  fetchSentDetailById: (id: number) => Promise<SentDetailResponse | null>;
  sendReplyToOfficer: (data: SentReplyPayload) => Promise<SentReplyResponse | null>;
  sendReplyToUser: (data: SentReplyPayload) => Promise<SentReplyResponse | null>;
}

export const useSentStore = create<SentStore>(() => ({

  fetchSentById: async (id) => {
    if (process.env.NEXT_PUBLIC_IS_PRODUCTION === 'false') {
      return documentTimeline_Mock;
    }
    try {
      const res = await get<SentDocumentResponse>("/sent/chain/" + id);
      if (res.success) {
        const mapSentDataToMock = (apiData: SentDocumentResponse["data"]): MappedSentItem[] => {
          if (!apiData?.fullChain) return [];

          return apiData.fullChain.map((item) => {

            return {
              timestamp: formatThaiDateTime(item.sentAt),
              from: {
                name: `${item.sender.firstName} ${item.sender.lastName}`,
                email: item.sender.email,
                position: item.sender.position || "ไม่ระบุ",
                profileImage: item.sender.profileImage || "",
              },
              to: {
                name: item.receiver
                  ? `${item.receiver.firstName} ${item.receiver.lastName}`
                  : "-",
                email: item.receiver ? item.receiver.email : "-",
                position: item.receiver ? item.receiver.position || "ไม่ระบุ" : "-",
                profileImage: item.receiver?.profileImage || "",
              },
              description: item.description,
              subject: item.subject || "-",
              category: item.category,
              number: item.number || "-",
              status: '1',
              note: item.remark || "",
              documents: item.documents,
            };
          });
        };

        return {
          success: res.success,
          isReply: res.hasReply,
          dataSent: mapSentDataToMock(res.data)
        };
      } else {
        return {
          success: res.success,
          isReply: false,
          dataSent: []
        };
      }
    } catch (error) {
      console.error("Failed to fetch sent", error);
      return {
        success: false,
        isReply: false,
        dataSent: []
      };
    }
  },

  fetchSentDetailById: async (id) => {
    if (process.env.NEXT_PUBLIC_IS_PRODUCTION === 'false') {
      return sentDocDetail_Mock;
    }

    try {
      const res = await get<SentDetailResponseFromApi>("/sent/" + id);

      const reply = res?.data?.actions && res.data.actions.length > 0
        ? res.data.actions[0]
        : undefined;

      return {
        success: res?.success,
        data: {
          base: res?.data,
          reply: reply
        }
      }
    } catch (error) {
      console.error("Failed to fetch sent", error);
      return null;
    }
  },

  sendReplyToOfficer: async (data) => {
    appStore.getState().setLoading(true);

    const formData = new FormData();
    for (const file of data.file) {
      formData.append('file', file);
    }

    formData.append('parentSentId', data.parentSentId.toString());
    formData.append('message', data.message || '');
    formData.append('remark', data.remark || '');

    try {
      const res = await post<SentReplyResponse>("/sent/reply", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res;
    } catch (error: unknown) {
      console.error("reply to officer failed:", error);

      throw new Error(
        error instanceof Error ? error.message : "Failed to send document"
      );
    } finally {
      appStore.getState().setLoading(false);
    }
  },

  sendReplyToUser: async (data) => {
    appStore.getState().setLoading(true);

    const formData = new FormData();
    for (const file of data.file) {
      formData.append('file', file);
    }

    formData.append('parentSentId', data.parentSentId.toString());
    formData.append('receiverEmail', data.receiverEmail || '');
    formData.append('number', data.number || '');
    formData.append('category', data.category?.toString() || '1');
    formData.append('description', data.description || '');
    formData.append('subject', data.subject || '');
    formData.append('remark', data.remark);
    formData.append('status', 'Forward');

    try {
      const res = await post<SentReplyResponse>("/sent/forward", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res;
    } catch (error: unknown) {
      console.error("reply forward to officer failed:", error);

      throw new Error(
        error instanceof Error ? error.message : "Failed to send document"
      );
    } finally {
      appStore.getState().setLoading(false);
    }
  },

}));