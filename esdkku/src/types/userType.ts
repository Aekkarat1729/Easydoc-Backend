
export interface CreateUserPayload {
  firstName?: string
  lastName?: string
  role?: string
  phoneNumber?: string
  email?: string
  uploadProfileImage?: File
  position?: string
  password?: string
}

export interface UserInfo {
  id: number,
  firstName: string
  lastName: string
  role?: number
  roleNumber?: number
  phoneNumber?: string
  password?: string
  email: string
  profileImage?: string
  position?: string
  token?: string
  uploadProfileImage?: File
}

export interface allUserInfoResponse {
  data: UserInfo[]
}

export interface allUserNameId {
  email: string
  name: string,
  profileImage?: string,
  position?: string
}
