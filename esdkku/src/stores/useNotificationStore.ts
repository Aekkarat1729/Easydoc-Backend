// esdkku/src/stores/useNotificationStore.ts
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { get as apiGet, put as apiPut, del as apiDelete } from '@/lib/axios';
import { getCookie } from '@/utils/cookies';
import { toast } from 'react-toastify';

export interface AppNotification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface NotificationResponse {
  success: boolean;
  data: AppNotification[];
  count: number;
}

interface UnreadCountResponse {
  success: boolean;
  count: number;
}

interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;
  socket: Socket | null;
  isConnected: boolean;
  isLoading: boolean;
  
  // Socket methods
  connectSocket: () => void;
  disconnectSocket: () => void;
  
  // Notification methods
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  addNotification: (notification: AppNotification) => void;
  removeNotification: (id: number) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  socket: null,
  isConnected: false,
  isLoading: false,

  connectSocket: () => {
    const { socket: existingSocket } = get();
    
    // ถ้ามี socket อยู่แล้วให้ disconnect ก่อน
    if (existingSocket) {
      existingSocket.disconnect();
    }

    const token = getCookie('token');
    console.log('🔌 [SOCKET] Attempting to connect...', {
      hasToken: !!token,
      tokenLength: token?.length,
      apiUrl: process.env.NEXT_PUBLIC_API_URL,
      isProduction: process.env.NEXT_PUBLIC_IS_PRODUCTION
    });
    
    if (!token) {
      console.warn('🔌 No token found, cannot connect socket');
      toast.error('ไม่พบ Token การเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    try {
      const socket = io(process.env.NEXT_PUBLIC_API_URL!, {
        auth: { token },
        transports: ['websocket', 'polling'],
        forceNew: true,
        timeout: 20000,
        retries: 3,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true,
        upgrade: true,
        rememberUpgrade: false
      });

      socket.on('connect', () => {
        console.log('✅ [SOCKET] Socket connected successfully');
        set({ isConnected: true });
        
        // ขอจำนวน unread notifications เมื่อเชื่อมต่อ
        socket.emit('request_unread_count');
      });

      socket.on('connect_error', (error) => {
        console.error('❌ [SOCKET] Connection error:', error);
        set({ isConnected: false });
        
        // Show user-friendly error message
        toast.error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
      });

      socket.on('disconnect', (reason) => {
        console.warn('⚠️ [SOCKET] Disconnected:', reason);
        set({ isConnected: false });
        
        // Only show toast for unexpected disconnections
        if (reason === 'io server disconnect' || reason === 'io client disconnect') {
          toast.warn('การเชื่อมต่อถูกตัดขาด');
        }
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('� [SOCKET] Reconnected after', attemptNumber, 'attempts');
        set({ isConnected: true });
        toast.success('เชื่อมต่อกับเซิร์ฟเวอร์สำเร็จ');
        
        // Request unread count after reconnection
        socket.emit('request_unread_count');
      });

      socket.on('reconnect_error', (error) => {
        console.error('❌ [SOCKET] Reconnection error:', error);
      });

      socket.on('reconnect_failed', () => {
        console.error('❌ [SOCKET] Reconnection failed completely');
        toast.error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณารีเฟรชหน้าเว็บ');
      });

      // รับ notification ใหม่
      socket.on('notification', (notification: AppNotification) => {
        console.log('📱 New notification received:', notification);
        
        // Parse notification data ถ้าเป็น string
        let notificationData = notification.data;
        if (typeof notificationData === 'string') {
          try {
            notificationData = JSON.parse(notificationData);
            notification.data = notificationData; // อัปเดต notification object
          } catch (error) {
            console.error('Error parsing notification data:', error);
            notificationData = null;
          }
        }
        
        get().addNotification(notification);
        
        // แสดง toast notification พร้อมฟังก์ชันนำทาง
        toast.info(notification.title, {
          onClick: () => {
            // นำทางไปยังเอกสารตาม notification data และ user role
            if (notificationData && notificationData.sentId) {
              const sentId = notificationData.sentId;
              
              // ดึง user role จาก localStorage หรือ global state
              const userDataString = localStorage.getItem('user');
              let userRole = 3; // default เป็น user
              
              if (userDataString) {
                try {
                  const userData = JSON.parse(userDataString);
                  userRole = userData.role || 3;
                } catch (error) {
                  console.error('Error parsing user data:', error);
                }
              }
              
              // สร้าง URL สำหรับนำทางตาม role
              let navigationUrl = '/ed/inbox';
              
              if (userRole === 2) {
                // Officer ไปที่หน้าสถานะเอกสาร
                navigationUrl = `/ed/document-status/track?id=${sentId}`;
              } else {
                // User ไปที่หน้ากล่องข้อความเอกสาร
                navigationUrl = `/ed/inbox/doc?id=${sentId}`;
              }
              
              console.log('🔔 Toast clicked, navigating to:', navigationUrl, 'for role:', userRole);
              
              // ใช้ window.location.href เพื่อนำทางเนื่องจากเราไม่สามารถใช้ router hook ได้ใน socket callback
              window.location.href = navigationUrl;
            } else {
              // ไม่มี sentId ให้ไปหน้า default ตาม role
              const userDataString = localStorage.getItem('user');
              let userRole = 3;
              
              if (userDataString) {
                try {
                  const userData = JSON.parse(userDataString);
                  userRole = userData.role || 3;
                } catch (error) {
                  console.error('Error parsing user data:', error);
                }
              }
              
              const defaultUrl = userRole === 2 ? '/ed/document-status' : '/ed/inbox';
              window.location.href = defaultUrl;
            }
          }
        });
      });

      // อัปเดตจำนวน unread
      socket.on('unread_count_updated', ({ count }) => {
        console.log('📊 Unread count updated:', count);
        set({ unreadCount: count });
      });

      set({ socket, isConnected: false });

    } catch (error) {
      console.error('🔌 Error connecting socket:', error);
    }
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
      console.log('🔌 Socket disconnected manually');
    }
  },

  fetchNotifications: async () => {
    try {
      set({ isLoading: true });
      console.log('🔔 [FETCH] Fetching notifications...');
      
      const response = await apiGet('/notifications?limit=50') as NotificationResponse;
      console.log('🔔 [FETCH] API Response:', response);
      
      if (response && response.success) {
        // Parse notification data สำหรับ notifications ที่ fetch มา
        const parsedNotifications = response.data.map((notification: AppNotification) => {
          console.log('🔔 [FETCH] Processing notification:', notification.id, 'data:', notification.data);
          
          if (notification.data && typeof notification.data === 'string') {
            try {
              notification.data = JSON.parse(notification.data);
              console.log('🔔 [FETCH] Parsed notification data for ID', notification.id, ':', notification.data);
            } catch (error) {
              console.error('Error parsing notification data for ID', notification.id, ':', error);
            }
          }
          return notification;
        });
        
        console.log('🔔 [FETCH] Notifications loaded:', parsedNotifications.length);
        console.log('🔔 [FETCH] Sample notification data:', parsedNotifications[0]?.data);
        console.log('🔔 [FETCH] All notifications:', parsedNotifications);
        set({ notifications: parsedNotifications });
      } else {
        console.warn('🔔 [FETCH] Invalid response format:', response);
      }
    } catch (error) {
      console.error('🔔 [FETCH] Error fetching notifications:', error);
      toast.error('ไม่สามารถโหลดการแจ้งเตือนได้');
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await apiGet('/notifications/unread-count') as UnreadCountResponse;
      
      if (response && response.success) {
        set({ unreadCount: response.count });
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  },

  markAsRead: async (id: number) => {
    try {
      console.log('🔔 [MARK_READ] Attempting to mark notification as read:', id);
      
      const response = await apiPut(`/notifications/${id}/read`) as { success: boolean; data: any };
      
      if (response && response.success) {
        console.log('🔔 [MARK_READ] Successfully marked as read');
        
        // อัปเดต local state
        const { notifications } = get();
        const updatedNotifications = notifications.map((n: AppNotification) => 
          n.id === id ? { ...n, isRead: true } : n
        );
        
        const newUnreadCount = Math.max(0, get().unreadCount - 1);
        
        set({ 
          notifications: updatedNotifications,
          unreadCount: newUnreadCount
        });
      } else {
        console.warn('🔔 [MARK_READ] API returned success: false');
      }
    } catch (error: any) {
      console.error('🔔 [MARK_READ] Error marking notification as read:', error);
      
      // ถ้าเป็น 404 (ไม่พบ notification) หรือ test notification ให้อัปเดต local state ได้เลย
      if (error?.response?.status === 404 || id > 1000000000000) {
        console.log('🔔 [MARK_READ] Notification not found in database or is test notification, updating local state only');
        
        const { notifications } = get();
        const notificationToUpdate = notifications.find((n: AppNotification) => n.id === id);
        
        if (notificationToUpdate && !notificationToUpdate.isRead) {
          const updatedNotifications = notifications.map((n: AppNotification) => 
            n.id === id ? { ...n, isRead: true } : n
          );
          
          const newUnreadCount = Math.max(0, get().unreadCount - 1);
          
          set({ 
            notifications: updatedNotifications,
            unreadCount: newUnreadCount
          });
          
          console.log('🔔 [MARK_READ] Updated local state for test/missing notification');
        }
      } else {
        // สำหรับ error อื่นๆ ที่ไม่ใช่ 404
        console.error('🔔 [MARK_READ] Unexpected error:', error);
      }
      
      // ไม่แสดง toast error เพื่อไม่รบกวน UX
    }
  },

  markAllAsRead: async () => {
    try {
      const response = await apiPut('/notifications/mark-all-read') as { success: boolean; data: any };
      
      if (response && response.success) {
        // อัปเดต local state
        const { notifications } = get();
        const updatedNotifications = notifications.map((n: AppNotification) => ({ ...n, isRead: true }));
        
        set({ 
          notifications: updatedNotifications,
          unreadCount: 0
        });
        
        toast.success('ทำเครื่องหมายอ่านทั้งหมดแล้ว');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('ไม่สามารถทำเครื่องหมายอ่านทั้งหมดได้');
    }
  },

  deleteNotification: async (id: number) => {
    try {
      const response = await apiDelete(`/notifications/${id}`) as { success: boolean; data: any };
      
      if (response && response.success) {
        // อัปเดต local state
        const { notifications } = get();
        const notificationToDelete = notifications.find((n: AppNotification) => n.id === id);
        const updatedNotifications = notifications.filter((n: AppNotification) => n.id !== id);
        
        const newUnreadCount = notificationToDelete && !notificationToDelete.isRead 
          ? Math.max(0, get().unreadCount - 1)
          : get().unreadCount;
        
        set({ 
          notifications: updatedNotifications,
          unreadCount: newUnreadCount
        });
        
        toast.success('ลบข้อความแจ้งเตือนแล้ว');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('ไม่สามารถลบข้อความแจ้งเตือนได้');
    }
  },

  addNotification: (notification: AppNotification) => {
    set(state => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    }));
  },

  removeNotification: (id: number) => {
    set(state => ({
      notifications: state.notifications.filter((n: AppNotification) => n.id !== id),
      unreadCount: state.notifications.find((n: AppNotification) => n.id === id && !n.isRead) 
        ? Math.max(0, state.unreadCount - 1) 
        : state.unreadCount
    }));
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  }
}));