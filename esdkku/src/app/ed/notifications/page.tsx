"use client"

import React, { useEffect, useState } from 'react';
import { Card, List, Badge, Button, Empty, Spin, Typography, Tooltip } from 'antd';
import { 
  BellOutlined, 
  CheckOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined 
} from '@ant-design/icons';
import { useNotificationStore, type AppNotification } from '@/stores/useNotificationStore';

const { Title, Text } = Typography;

const NotificationsPage = () => {
  const { 
    notifications, 
    unreadCount, 
    isConnected,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotificationStore();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true);
      try {
        await fetchNotifications();
      } finally {
        setLoading(false);
      }
    };
    
    loadNotifications();
  }, [fetchNotifications]);

  const filteredNotifications = notifications?.filter((notification: AppNotification) => {
    if (filter === 'unread') return !notification.isRead;
    return true;
  }) || [];

  const handleMarkAsRead = async (notificationId: number) => {
    await markAsRead(notificationId);
  };

  const handleDeleteNotification = async (notificationId: number) => {
    await deleteNotification(notificationId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes} นาทีที่แล้ว`;
    } else if (diffInHours < 24) {
      return `${diffInHours} ชั่วโมงที่แล้ว`;
    } else {
      return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BellOutlined style={{ fontSize: 24 }} />
          <Title level={2} className="mb-0">
            ข้อความแจ้งเตือน
          </Title>
          <Badge 
            count={unreadCount} 
            style={{ backgroundColor: '#1890ff' }}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Tooltip title={isConnected ? 'เชื่อมต่อแล้ว' : 'ไม่ได้เชื่อมต่อ'}>
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </Tooltip>
          <Text type="secondary">
            {isConnected ? 'กำลังฟังข้อความใหม่' : 'ไม่ได้เชื่อมต่อ'}
          </Text>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button 
          type={filter === 'all' ? 'primary' : 'default'}
          onClick={() => setFilter('all')}
        >
          ทั้งหมด ({notifications?.length || 0})
        </Button>
        <Button 
          type={filter === 'unread' ? 'primary' : 'default'}
          onClick={() => setFilter('unread')}
        >
          ยังไม่ได้อ่าน ({unreadCount})
        </Button>
        {unreadCount > 0 && (
          <Button 
            icon={<CheckCircleOutlined />}
            onClick={markAllAsRead}
          >
            ทำเครื่องหมายอ่านทั้งหมด
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spin size="large" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              filter === 'unread' 
                ? 'ไม่มีข้อความที่ยังไม่ได้อ่าน' 
                : 'ไม่มีข้อความแจ้งเตือน'
            }
          />
        ) : (
          <List
            itemLayout="vertical"
            dataSource={filteredNotifications}
            renderItem={(notification: AppNotification) => (
              <List.Item
                key={notification.id}
                className={`transition-colors duration-200 ${
                  !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'
                }`}
                actions={[
                  !notification.isRead && (
                    <Button
                      type="link"
                      size="small"
                      icon={<CheckOutlined />}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      ทำเครื่องหมายว่าอ่านแล้ว
                    </Button>
                  ),
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteNotification(notification.id)}
                  >
                    ลบ
                  </Button>
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={
                    <div className="relative">
                      <BellOutlined 
                        style={{ 
                          fontSize: 20,
                          color: !notification.isRead ? '#1890ff' : '#8c8c8c'
                        }} 
                      />
                      {!notification.isRead && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                      )}
                    </div>
                  }
                  title={
                    <div className="flex items-center justify-between">
                      <Text strong={!notification.isRead}>
                        {notification.title}
                      </Text>
                      <div className="flex items-center gap-2">
                        {!notification.isRead && (
                          <Badge status="processing" text="ใหม่" />
                        )}
                        <Text type="secondary" className="text-xs">
                          <ClockCircleOutlined className="mr-1" />
                          {formatDate(notification.createdAt)}
                        </Text>
                      </div>
                    </div>
                  }
                  description={
                    <div className="mt-2">
                      <Text>{notification.message}</Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default NotificationsPage;