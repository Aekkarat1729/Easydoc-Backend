// /src/config/menu.tsx

import { PATHS } from "@/const/paths";

export interface MenuItem {
  key: number;
  path: string;
  icon: string;
  label: string;
  inTop: boolean;
  roles: number[];
}

export const rootPath = "ed";

export const menuItem: MenuItem[] = [
  { key: 1, path: '', label: 'หน้าหลัก', inTop: true, roles: [3], icon: 'HomeOutlined' },
  { key: 2, path: PATHS.INBOX, label: 'กล่องข้อความ', inTop: true, roles: [3], icon: 'InboxOutlined' },
  { key: 4, path: PATHS.DOCUMENT_STATUS, label: 'สถานะเอกสาร', inTop: true, roles: [2], icon: 'FileSyncOutlined' },
  { key: 3, path: PATHS.SEND_DOCUMENT, label: 'ส่งเอกสาร', inTop: true, roles: [2], icon: 'SendOutlined' },
  { key: 5, path: PATHS.DOWNLOAD_DOCUMENT, label: 'ดาวน์โหลดเอกสาร', inTop: true, roles: [2, 3], icon: 'DownloadOutlined' },
  { key: 6, path: PATHS.SETTING, label: 'การตั้งค่า', inTop: false, roles: [], icon: 'SettingOutlined' },
  { key: 7, path: PATHS.MGN_USER, label: 'จัดการผู้ใช้งาน', inTop: true, roles: [1], icon: 'UsergroupAddOutlined' },
  { key: 8, path: PATHS.MGN_DOC, label: 'กำหนดไฟล์เริ่มต้น', inTop: true, roles: [1], icon: 'FileSyncOutlined' },
];