export interface defaultFileType {
    id: number;
    name: string;
    fileType: string;
    fileUrl: string;
    fileSize?: number;
    uploadedAt?: string;
    userId?: number;
    uploader?: {
        name: string;
        email: string;
    };
}

export interface defaultFileTypeResponse {
    success: boolean;
    message?: string;
    data: defaultFileType[];
}

export interface uploadDefaultFilePayload { 
    name: string;
    file: File;
}

export interface updateDefaultFilePayload { 
    id: number;
    name: string;
}

