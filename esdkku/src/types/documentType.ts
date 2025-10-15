export interface Document {
  id: number;
  name: string;
  fileType: string;
  fileUrl: string;
  uploadedAt: string;
  userId: number;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  position?: string;
}

export interface DocumentItem {
  id: number;
  documentId: number;
  isForwarded: boolean;
  number: string;
  parentSentId: number | null;
  readAt: string | null;
  receivedAt: string | null;
  receiverId: number;
  senderId: number;
  sentAt: string;
  status: number;
  statusById: number;
  statusChangedAt: string;
  threadId: number;
  archivedAt: string | null;
  category: number;
  depth: number;
  description: string;
  document: Document;
  receiver: User;
  sender: User;
  note?: string;
  remark?: string;
  isReply?: string;
  isForward?: string;
  subject: string;
}

export interface DocumentResponse {
  data: DocumentItem[];
}

export interface DocumentRow {
  id: number;
  title: string;
  type: number;
  email: string;
  firstName: string;
  lastName: string;
  date: string;
  note?: string;
  time: string;
  status: string;
  description: string;
  number?: string;
  profileImage?: string;
}

export interface sentDocument {
  file: File[];
  receiverEmail: string;
  number: string;
  category: number;
  description: string;
  status: string;
  subject: string;
  remark?: string;
}

export interface sentDocumentResponse {
  success: boolean;
  message: string;
  data: sentDocument;
}


export interface SentDocumentResponse {
  success: boolean;
  hasReply: boolean;
  rootId: number;
  threadCount: number;
  data: {
    base: SentItem;
    pathFromRoot: SentItem[];
    forwardsFromThis: SentItem[];
    fullChain: SentItem[];
  };
}

export interface DocumentFile {
  id: number;
  name: string;
  fileType: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt?: string;
  userId?: number;
}

export interface SentItem {
  id: number;
  documentId: number;
  senderId: number;
  receiverId: number | null;
  number?: string;
  category?: number;
  description: string;
  subject?: string;
  remark?: string | null;
  status: string;
  isForwarded: boolean;
  parentSentId: number | null;
  threadId: number;
  depth: number;
  sentAt: string;
  receivedAt: string | null;
  readAt: string | null;
  archivedAt: string | null;
  statusChangedAt: string;
  statusById: number;
  document: DocumentFile | null;
  documents: DocumentFile[];
  sender: User;
  receiver: User | null;
  actions?: SentItem[]
  kind?: string 
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  position?: string;
}

export interface MappedSentItem {
  timestamp: string;
  from: {
    name: string;
    email: string;
    position: string;
    profileImage?: string
  };
  to?: {
    name: string;
    email: string;
    position: string;
    profileImage?: string
  };
  description: string;
  subject?: string;
  category?: number;
  number?: string;
  status: string;
  note: string;
  documents: DocumentFile[];
}

export interface SentDocumentToInterface {
  success: boolean;
  isReply: boolean;
  hasReply?: boolean;
  dataSent: MappedSentItem[];
}

export interface SentReplyPayload {
  file: File[],
  parentSentId: number,
  receiverEmail?: string,
  number?: string,
  category?: number,
  description?: string,
  subject?: string,
  message?: string,
  remark: string
}

export interface SentDetailResponse {
  success: boolean;
  data: {
    base: SentItem;
    reply?: SentItem;
  };
}

export interface SentDetailResponseFromApi {
  success: boolean;
  data: SentItem & {
    actions: SentItem[]
  };
}

export interface SentReplyResponse {
  success: boolean;
  message?: string;
}
