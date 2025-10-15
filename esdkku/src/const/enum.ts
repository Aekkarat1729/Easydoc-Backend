

export enum SentDocStatus {
  SENT_REPLY = 'ตอบกลับแล้ว',
  ALREADY_SENT = 'ส่งถึงแล้ว',
  WAITING_REPLY = 'กำลังรอตอบกลับ',
  SENT_FORWARD = 'ส่งต่อแล้ว',
}

export enum StatusCode {
  SENT_REPLY = 1,
  ALREADY_SENT = 2,
  WAITING_REPLY = 3,
  SENT_FORWARD = 4,
}

export enum SentType {
  REPLY = 'reply',
  FORWARD = 'forward',
}

export enum UserRole {
  ADMIN = 'Admin',
  USER = 'User',
  OFFICER = 'Officer',
  UNKNOW = 'Unknow',
}

export enum TypeDocument {
  SERVER_ACCESS_REQUEST = "เอกสารขอเข้าใช้เซิร์ฟเวอร์",
  MEETING_DOCUMENT = "เอกสารประชุม",
  LEAVE_REQUEST = "เอกสารขอลา",
  REPORT = "รายงาน",
  CONTRACT = "สัญญา",
  OTHER = "อื่นๆ"
}

export enum FilterList {
  STATUS = "สถานะเอกสาร",
}