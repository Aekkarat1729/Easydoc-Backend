import { UserRole } from "@/const/enum";

export function getUserRoleFromId(id: number | string): UserRole {
  const roleMap: Record<number, UserRole> = {
    3: UserRole.USER,
    2: UserRole.OFFICER,
    1: UserRole.ADMIN,
  };
  return roleMap[Number(id)] ?? UserRole.UNKNOW;
}

// export const userRoleLabel: Record<UserRole, string> = {
//   [UserRole.USER]: 'user',
//   [UserRole.OFFICER]: 'officer',
//   [UserRole.ADMIN]: 'admin',
// };

export const userRoleToId: Record<UserRole, number> = {
  [UserRole.USER]: 3,
  [UserRole.OFFICER]: 2,
  [UserRole.ADMIN]: 1,
  [UserRole.UNKNOW]: 0,
};