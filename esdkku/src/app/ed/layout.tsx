"use client"

import React, { ComponentType, useState, useEffect, Suspense } from 'react';
import {
  UserOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  SettingOutlined,
  BellOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import * as Icons from '@ant-design/icons';

import { Button, Layout as AntLayout, Menu, theme, Avatar, ConfigProvider, Dropdown, Badge, MenuProps } from 'antd';
import Link from 'next/link';
import TextTitleColor from '@/components/Title/TextTitleColor';
import { usePathname } from 'next/navigation';

//font
import '@fontsource-variable/noto-sans-thai';

//store
import { useUserStore } from '@/stores/useUserStore';
import { useNotificationStore, type AppNotification } from '@/stores/useNotificationStore';

//utils
import { getUserRoleFromId } from '@/utils/userRoles';
import { fetchAccountInfo } from '@/utils/fetchAccountInfo';

//router
import { useRouter } from 'next/navigation';

//config
import { rootPath, menuItem } from '@/config/menu';
import { PATHS } from '@/const/paths';
import { toast } from 'react-toastify';


const { Sider, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<LayoutProps> = ({ children }) => {

  //store
  const { user, setUser, clearUser } = useUserStore();
  const { 
    notifications, 
    unreadCount, 
    isConnected,
    connectSocket, 
    disconnectSocket, 
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotificationStore();

  //fetch account info
  useEffect(() => {
    fetchAccountInfo();
  }, []);

  // เชื่อมต่อ socket เมื่อ user login
  useEffect(() => {
    if (user) {
      connectSocket();
      fetchUnreadCount();
      fetchNotifications(); // เพิ่มการ fetch notifications
      
      return () => {
        disconnectSocket();
      };
    }
  }, [user, connectSocket, disconnectSocket, fetchUnreadCount, fetchNotifications]);

  // Debug notifications
  useEffect(() => {
    console.log('🔔 Notifications in layout:', {
      notifications,
      count: notifications?.length || 0,
      unreadCount,
      isConnected
    });
  }, [notifications, unreadCount, isConnected]);

  const router = useRouter();

  const handleDoubleClick = () => {
    if (!user) return
    let newRole = user.role || 0

    if (user.role === 3) {
      newRole = 1;
    } else {
      newRole += 1;
    }
    setUser({ ...user, role: newRole })
  }

  const roleName = getUserRoleFromId(user?.role || 0);

  //pathname
  const pathname = usePathname();
  const parts = pathname.split("/");

  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleProfile = () => {
    router.push(`/${rootPath}/${menuItem.find((item) => item.key === 6)?.path}?tap=profile`)
  }

  // filter menu items by roles
  const allowedMenu = menuItem.filter(item => {
    return item.roles.length === 0 || item.roles.includes(user?.role || 0);
  });

  const topMenuItems = allowedMenu.filter(item => item.inTop);
  const bottomMenuItems = allowedMenu.filter(item => !item.inTop);

  const handleViewAllNotifications = () => {
    // สร้างหน้าใหม่สำหรับดู notifications ทั้งหมด
    router.push(`/${rootPath}/notifications`);
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation(); // ป้องกันการ trigger onClick ของ parent
    await deleteNotification(notificationId);
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    console.log('🔔 Notification clicked:', notification);
    console.log('🔔 Notification data (raw):', notification.data);
    console.log('🔔 Notification type:', notification.type);
    console.log('🔔 User role:', user?.role);
    
    // Parse notification data ถ้าเป็น string
    let notificationData = notification.data;
    if (typeof notificationData === 'string') {
      try {
        notificationData = JSON.parse(notificationData);
        console.log('🔔 Parsed notification data:', notificationData);
      } catch (error) {
        console.error('🔔 Error parsing notification data:', error);
        notificationData = null;
      }
    }
    
    // เรียก markAsRead แต่ไม่รอให้เสร็จ (fire and forget)
    markAsRead(notification.id).catch(error => {
      console.error('🔔 Failed to mark as read, but continuing with navigation:', error);
    });
    
    // นำทางตาม role และ notification data
    if (notificationData && notificationData.sentId) {
      const sentId = notificationData.sentId;
      const notificationType = notificationData.type || notification.type;
      const userRole = user?.role || 3;
      
      console.log('🔔 Navigating with sentId:', sentId, 'type:', notificationType, 'userRole:', userRole);
      
      // ตรวจสอบ role เพื่อเลือกหน้าที่เหมาะสม
      if (userRole === 2) {
        // Officer (role 2) ไปที่หน้าสถานะเอกสาร
        console.log('🔔 Officer: Navigating to document status track page');
        router.push(`/${PATHS.ED}/${PATHS.DOCUMENT_STATUS}/track?id=${sentId}`);
      } else {
        // User (role 3) และอื่นๆ ไปที่หน้ากล่องข้อความเอกสาร
        console.log('🔔 User: Navigating to inbox document page');
        router.push(`/${PATHS.ED}/${PATHS.INBOX}/doc?id=${sentId}`);
      }
    } else {
      // ลองหาข้อมูล ID จากที่อื่น
      console.log('🔔 No sentId found in data, checking other fields...');
      console.log('🔔 Full notification object:', JSON.stringify(notification, null, 2));
      
      // ลองดูว่ามี id ใน data หรือไม่
      let documentId = null;
      if (notificationData) {
        documentId = notificationData.sentId || notificationData.id || notificationData.documentId;
      }
      
      if (documentId) {
        const userRole = user?.role || 3;
        console.log('🔔 Found document ID:', documentId, 'for role:', userRole);
        
        if (userRole === 2) {
          router.push(`/${PATHS.ED}/${PATHS.DOCUMENT_STATUS}/track?id=${documentId}`);
        } else {
          router.push(`/${PATHS.ED}/${PATHS.INBOX}/doc?id=${documentId}`);
        }
      } else {
        console.log('🔔 No document ID found, navigating to role-based default page');
        const userRole = user?.role || 3;
        
        // ไปที่หน้า default ตาม role
        if (userRole === 2) {
          router.push(`/${PATHS.ED}/${PATHS.DOCUMENT_STATUS}`);
        } else {
          router.push(`/${PATHS.ED}/${PATHS.INBOX}`);
        }
      }
    }
  };

  const notificationList: MenuProps['items'] = [
    ...(notifications && notifications.length > 0 
      ? notifications.slice(0, 5).map((notification: AppNotification, index: number) => ({
          key: `notification-${notification.id}`,
          label: (
            <div 
              onClick={() => handleNotificationClick(notification)}
              className={`relative p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${!notification.isRead ? 'bg-blue-50' : ''}`}
              style={{ maxWidth: '320px' }}
            >
              {/* ปุ่มลบ */}
              <button
                onClick={(e) => handleDeleteNotification(e, notification.id)}
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors duration-200"
                title="ลบข้อความ"
              >
                <CloseOutlined style={{ fontSize: 12 }} />
              </button>
              
              <div className="font-medium text-sm mb-1 pr-8">{notification.title}</div>
              <div className="text-xs text-gray-600 line-clamp-2 mb-2 pr-8">{notification.message}</div>
              <div className="text-xs text-gray-400">
                {new Date(notification.createdAt).toLocaleString('th-TH', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ),
        }))
      : [{
          key: 'no-notifications',
          label: (
            <div className="p-3 text-center text-gray-500 text-sm">
              ไม่มีข้อความแจ้งเตือน
            </div>
          ),
        }]
    ),
    { type: 'divider' as const },
    {
      key: 'view-all',
      label: (
        <div 
          onClick={handleViewAllNotifications}
          className="text-center text-blue-600 hover:text-blue-800 cursor-pointer p-2 font-medium"
        >
          ดูทั้งหมด ({notifications?.length || 0})
        </div>
      ),
    },
    ...(unreadCount > 0 ? [{
      key: 'mark-all-read',
      label: (
        <div 
          onClick={markAllAsRead}
          className="text-center text-gray-600 hover:text-gray-800 cursor-pointer p-2"
        >
          ทำเครื่องหมายอ่านทั้งหมด
        </div>
      ),
    }] : []),
  ];

  //logout
  const handleLogout = () => {
    const success = clearUser();
    if (success) {
      router.push("/"); // ไปหน้าแรก
    } else {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  const profileDropdown: MenuProps['items'] = [
    {
      key: '1',
      label: <div onClick={handleLogout}>ออกจากระบบ</div>,
    },
  ];

  const activePath = menuItem?.find(item => item.path === (parts[2]));

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="bg-custom-color-main"
        width={250}
        collapsedWidth={80}
      >
        <div className="flex flex-col justify-between h-full">
          {/* 🔹 Top Section */}
          <ConfigProvider
            theme={{
              components: {
                Menu: {
                  itemColor: '#ffffff',
                  itemSelectedColor: 'black',
                  itemSelectedBg: '#fff',
                  // itemHoverBg: '#4b49a6',
                  itemHoverColor: '#fff',
                  fontSize: 16,
                },
              },
            }}
          >
            {/* Profile */}
            <div className="flex flex-col items-center py-6 text-white cursor-pointer"
              onDoubleClick={process.env.NEXT_PUBLIC_IS_PRODUCTION === 'false' ? handleDoubleClick : undefined}
              onClick={handleProfile}
            >
              <Avatar size={collapsed ? 40 : 64} src={user?.profileImage || null} icon={<UserOutlined />} />
              {!collapsed && (
                <>
                  <div className="mt-2 text-sm font-semibold">{user?.firstName} {user?.lastName}</div>
                  <div className="text-xs text-gray-300">{roleName}</div>
                </>
              )}
            </div>
            {/* Menu */}
            <div className="flex flex-col h-full justify-between">
              <Menu
                className="bg-custom-color-main"
                mode="inline"
                selectedKeys={[`${activePath?.key || '1'}`]}
                items={topMenuItems.map(item => {
                  const IconComponent = item.icon
                    ? ((Icons as unknown) as Record<string, ComponentType>)[item.icon]
                    : null;

                  return {
                    key: item.key,
                    icon: IconComponent ? <IconComponent /> : null,
                    label: <Link href={`/${rootPath}/${item.path}`}>{item.label}</Link>,
                  };
                })}
              />
              <Menu
                className="bg-custom-color-main"
                mode="inline"
                selectedKeys={[`${activePath?.key}`]}
                items={bottomMenuItems.map(item => {
                  const IconComponent = item.icon
                    ? ((Icons as unknown) as Record<string, ComponentType>)[item.icon]
                    : null;

                  return {
                    key: item.key,
                    icon: IconComponent ? <IconComponent /> : null,
                    label: <Link href={`/${rootPath}/${item.path}`}>{item.label}</Link>,
                  };
                })}

              />
            </div>
          </ConfigProvider>
        </div>
      </Sider>
      <AntLayout>
        <div style={{ background: colorBgContainer }} className='py-3'>
          <div className='flex justify-between items-center px-4'>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
              }}
            />
            <div className=" items-center gap-4 flex">
              {user?.role !== 1 && (
                <Dropdown
                  menu={{ items: notificationList }}
                  placement="bottomRight"
                  arrow
                  trigger={['click']}
                  overlayStyle={{ 
                    maxWidth: '350px',
                    minWidth: '300px'
                  }}
                  overlayClassName="notification-dropdown"
                >
                  <div className="relative cursor-pointer">
                    <Badge 
                      count={unreadCount > 0 ? unreadCount : 0} 
                      offset={[-2, 2]}
                      size="small"
                    >
                      <BellOutlined 
                        style={{ 
                          fontSize: 22,
                          color: isConnected ? '#1890ff' : '#8c8c8c'
                        }} 
                      />
                    </Badge>
                  </div>
                </Dropdown>
              )}
              <Link href={`/${rootPath}/${menuItem.find((item) => item.key === 6)?.path}`} className=" cursor-pointer"
                style={{
                  color: 'black'
                }}
              >
                <SettingOutlined style={{ fontSize: 20 }} />
              </Link>
              <Dropdown
                menu={{ items: profileDropdown }}
                placement="bottomRight"
                arrow
                trigger={['click']}
              >
                <div className="px-4 border-l border-gray-300 text-sm text-gray-700 cursor-pointer">
                  {user?.firstName} {user?.lastName}
                </div>
              </Dropdown>

            </div>
          </div>
        </div>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            maxWidth: 1400
          }}
        >
          <div className="">
            <TextTitleColor text={activePath?.label || 'หน้าหลัก'} className="mb-5" />
            <Suspense>
              {children}
            </Suspense>
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default AppLayout;