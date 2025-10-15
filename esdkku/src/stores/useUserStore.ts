import { create } from 'zustand'
import Cookies from 'js-cookie'
import { get as axiosGet, del, post, put } from '@/lib/axios'
import { appStore } from './appStore'

//mocks
import { allUserNameEmail_Mock } from '@/mock/allUserNameEmailMock'
import { user_Mock } from '@/mock/userMock'
import { allUserForAdmin_Mock } from '@/mock/allUserForAdminMock'
import { allUserInfoResponse, allUserNameId, CreateUserPayload, UserInfo } from '@/types/userType'

interface LoginResponse {
  data: UserInfo
  message: string
  success: boolean
}

interface useUserStoreProps {
  user: UserInfo | null
  allUser: UserInfo[] | null
  allUserNameEmail: allUserNameId[]
  setUser: (user: UserInfo) => void
  clearUser: () => boolean;
  loadUserFromStorage: () => void
  fetchAllUserForAdmin: () => void
  fetchUserNameId: () => void
  login: (email: string, password: string) => Promise<UserInfo>
  createUser: (user: Partial<UserInfo> & { password: string }) => Promise<{
    success: boolean;
    message?: string;
    data?: UserInfo;
  }>;
  updateUser: (id: number, user: Partial<UserInfo> & { password?: string }, options?: { isSelf: boolean }) => Promise<{
    success: boolean;
    message?: string;
    data?: UserInfo;
  }>;
  deleteUser: (id: number) => Promise<{
    success: boolean;
    message?: string;
  }>
}

export const useUserStore = create<useUserStoreProps>((set) => ({
  user: null,
  allUser: null,
  allUserNameEmail: [],

  setUser: (user) => set({ user }),

  clearUser: () => {
    appStore.getState().setLoading(true);
    try {
      localStorage.removeItem("esd-kku");
      Cookies.remove("esd-kku");
      set({ user: null });
      return true;
    } catch (error) {
      console.error("Failed to clear user:", error);
      return false;
    } finally {
      appStore.getState().setLoading(false);
    }
  },

  loadUserFromStorage: () => {
    if (typeof window === 'undefined') return

    const storedUser = localStorage.getItem('esd-kku')
    if (storedUser) {
      const userData: UserInfo = JSON.parse(storedUser)
      set({ user: userData })
    } else {
      set({ user: null })
    }
  },

  login: async (email, password) => {
    appStore.getState().setLoading(true);

    try {
      let resData: UserInfo;

      if (process.env.NEXT_PUBLIC_IS_PRODUCTION === 'false') {
        if (email === 'test@gmail.com' && password === '1234') {
          resData = user_Mock;
        } else {
          appStore.getState().setLoading(false);
          throw new Error('Invalid email or password');
        }
      } else {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);

        const res = await post<LoginResponse>('/auth/login', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        resData = res.data;

        if (!resData || !res?.success) {
          appStore.getState().setLoading(false);
          throw new Error(res?.message || 'Invalid email or password');
        }
      }

      const userData: UserInfo = {
        id: resData.id || 0,
        firstName: resData.firstName,
        lastName: resData.lastName,
        role: resData.roleNumber,
        email: resData.email,
        profileImage: resData.profileImage,
        position: resData.position,
        phoneNumber: resData.phoneNumber,
        token: resData.token,
      };

      set({ user: userData });

      // 3.5 ชั่วโมง = 3.5 / 24 วัน
      const expiryInDays = 3.5 / 24;

      Cookies.set(
        "esd-kku",
        JSON.stringify({
          token: userData.token,
          role: userData.role,
        }),
        { expires: expiryInDays, sameSite: "Strict" }
      );

      localStorage.setItem('esd-kku', JSON.stringify(userData));

      return userData;

    } catch (error) {
      console.error("Login failed:", error);
      appStore.getState().setLoading(false);

      if (error instanceof Error) {
        throw new Error(error.message || "Login failed:", error);
      }
      throw new Error("Login failed");

    }
  },

  fetchAllUserForAdmin: async () => {

    if (process.env.NEXT_PUBLIC_IS_PRODUCTION === 'false') {
      set({ allUser: allUserForAdmin_Mock });
      return;
    }

    try {
      const res = await axiosGet<allUserInfoResponse>("/users");

      set({
        allUser: res?.data.map((item) => {
          return {
            id: item.id,
            firstName: item.firstName,
            lastName: item.lastName,
            role: item.roleNumber,
            email: item.email,
            position: item.position || '',
            profileImage: item.profileImage || '',
            phoneNumber: item.phoneNumber || ''
          }
        })
      })

    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  },

  fetchUserNameId: async () => {
    if (process.env.NEXT_PUBLIC_IS_PRODUCTION === 'false') {
      set({ allUserNameEmail: allUserNameEmail_Mock })
      return;
    }
    try {
      const res = await axiosGet<allUserInfoResponse>("/userforofficer");

      set({
        allUserNameEmail: res?.data.map((item) => {
          return {
            email: item.email,
            name: `${item.firstName} ${item.lastName}`,
            profileImage: item.profileImage
          }
        })
      })

    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  },

  createUser: async (user: Partial<UserInfo> & { password: string }) => {
    appStore.getState().setLoading(true);

    try {
      // map body ให้ตรงกับ backend
      const body = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        password: user.password,
        position: user.position,
        role: user.role === 1 ? "ADMIN" : user.role === 2 ? "OFFICER" : "USER",
      };

      const res = await post<{ success: boolean; message: string; data: UserInfo }>("/users", body);

      return res;
    } catch (error) {
      console.error("Failed to create user:", error);
      return { success: false };
    } finally {
      appStore.getState().setLoading(false);
    }
  },

  updateUser: async (
    id: number,
    user: Partial<UserInfo> & { password?: string },
    options?: { isSelf?: boolean }
  ) => {
    appStore.getState().setLoading(true);
    const isSelf = options?.isSelf ?? false;

    try {
      // map body ให้ตรงกับ backend
      const body: CreateUserPayload = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        position: user.position,
      };

      if (user.password) {
        body.password = user.password;
      }
      if (user.uploadProfileImage) {
        body.uploadProfileImage = user.uploadProfileImage;
      }
      if (user.role) {
        body.role = user.role === 1 ? "ADMIN" : user.role === 2 ? "OFFICER" : "USER";
      }

      if (body?.uploadProfileImage) {
        try {
          const formData = new FormData();
          formData.append('profileImage', body.uploadProfileImage);
          await post("/upload/profile", formData, {
            headers: {
              "Content-Type": "multipart/form-data", // 👈 บางทีไม่ต้องใส่ด้วยซ้ำ
            },
            
          })
        } catch (err) {
          console.error("Failed to upload profile:", err);
          return { success: false }
        }
      }

      const res = await put<{ success: boolean; message: string; data: UserInfo }>(`/users/${id}`, body);
      function updateLocalStorage(key: string, data: Partial<UserInfo>) {
        const stored = localStorage.getItem(key);
        const prevData = stored ? JSON.parse(stored) : {};

        const updatedData = {
          ...prevData,
          ...data,
        };

        localStorage.setItem(key, JSON.stringify(updatedData));
      }

      if (isSelf && res.success) {
        updateLocalStorage("esd-kku", {
          firstName: res.data.firstName,
          lastName: res.data.lastName,
          position: res.data.position,
          phoneNumber: res.data.phoneNumber,
          profileImage: res.data.profileImage,
        });
      }

      return res;
    } catch (error) {
      console.error("Failed to update user:", error);
      return { success: false };
    } finally {
      appStore.getState().setLoading(false);
    }
  },

  deleteUser: async (id: number) => {
    appStore.getState().setLoading(true);

    try {
      const res = await del<{ success: boolean; message: string }>(`/users/${id}`);
      return res;
    } catch (error) {
      console.error("Failed to delete user:", error);
      return { success: false };
    } finally {
      appStore.getState().setLoading(false);
    }
  },
}))