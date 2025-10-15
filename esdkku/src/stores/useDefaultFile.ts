import { create } from "zustand";
import { get, post, put, del } from "@/lib/axios";
import { defaultFileTypeResponse, uploadDefaultFilePayload } from "@/types/defaultFile";
import { defaultFile_Mock } from "@/mock/defaultFileMock";
import { appStore } from "./appStore";
import { formatFileSize } from "@/utils/formatFileSize";

export interface FileItem {
    id: number
    fileName: string
    fileType: string
    url: string
    size: string
}

interface DefaultFileStore {
    defaultFile: FileItem[] | null;
    fetchDefaultFile: () => Promise<void>;
    uploadDefaultFile: (data: uploadDefaultFilePayload) => Promise<boolean | undefined>;
    updateDefaultFile: (id: number, name: string) => Promise<boolean | undefined>;
    deleteDefaultFile: (id: number) => Promise<{ success: boolean }>;
}

export const useDefaultFile = create<DefaultFileStore>((set) => ({
    defaultFile: null,

    fetchDefaultFile: async () => {
        if (process.env.NEXT_PUBLIC_IS_PRODUCTION === 'false') {
            set({ defaultFile: defaultFile_Mock });
            return;
        }
        try {
            console.log('🔄 Fetching default files...');
            const res = await get<defaultFileTypeResponse>("/defaultdocument");
            
            console.log('📥 API Response:', res);
            
            if (!res.success || !res.data) {
                console.error('❌ API response indicates failure or missing data:', res);
                set({ defaultFile: [] });
                return;
            }

            const mappedFiles: FileItem[] = res.data.map((file) => {
                console.log('📄 Processing file:', file);
                return {
                    id: file.id,
                    fileName: file.name,
                    fileType: file.fileType,
                    url: file.fileUrl,
                    size: file.fileSize ? formatFileSize(file.fileSize) : 'ไม่ทราบขนาด',
                };
            });

            console.log('✅ Mapped files:', mappedFiles);
            set({ defaultFile: mappedFiles });
        } catch (err) {
            console.error("❌ Failed to fetch default file", err);
            
            // กรณี authentication error หรือ server error ให้ใช้ empty array แทน null
            // เพื่อให้ frontend แสดง "No data" แทน loading
            set({ defaultFile: [] });
        }
    },
    uploadDefaultFile: async (data) => {

        appStore.getState().setLoading(true);

        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('name', data.name);

        try {
            const res = await post<defaultFileTypeResponse>("/defaultdocument/upload", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return res.success;
        } catch (err) {
            console.log("Failed to upload default file", err);
        } finally {
            appStore.getState().setLoading(false);
        }
    },
    updateDefaultFile: async (id, name) => {

        appStore.getState().setLoading(true);

        const formData = new FormData();
        formData.append('name', name);

        try {
            const res = await put<defaultFileTypeResponse>(`/defaultdocument/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return res.success;
        } catch (err) {
            console.log("Failed to update default file", err);
        } finally {
            appStore.getState().setLoading(false);
        }
    },
    deleteDefaultFile: async (id: number) => {
        appStore.getState().setLoading(true);

        try {
            const res = await del<defaultFileTypeResponse>(`/defaultdocument/${id}`);
            return { success: res.success };
        } catch (err) {
            console.log("Failed to delete default file", err);
            return { success: false };

        } finally {
            appStore.getState().setLoading(false);
        }
    }
}))