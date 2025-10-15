'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ConfigProvider, Tabs, Form, Input, Button, Switch, Avatar } from 'antd'
import {
  UserOutlined,
  LockOutlined,
  NotificationOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { useSearchParams, useRouter } from 'next/navigation'
import TextError from '../Text/TextError'
import BtnStyle from '../Form/Btn/BtnStyle'
import { useUserStore } from '@/stores/useUserStore'
import { toast } from 'react-toastify'
import PasswordFields from '../Form/PasswordFields'

interface ProfileFormValues {
  id: number
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  position?: string
  role: number
  password?: string
  uploadProfileImage?: File
}

interface PasswordFormValues {
  currentPassword: string
  password: string
  confirmPassword: string
}

function SettingPage() {

  const { user, updateUser, loadUserFromStorage } = useUserStore();

  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get('tab') || 'profile'

  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [profileImage, setProfileImage] = useState<string | null>(null)

  //แก้ปัญหาข้อมูลโหลดช้าจากการ refresh
  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        position: user.position,
        phoneNumber: user.phoneNumber,
      });
    }
  }, [user, profileForm]);

  const handleTabChange = (key: string) => {
    router.push(`?tab=${key}`)
  }

  const handleProfileSave = async (values: ProfileFormValues & { profileImage?: File }): Promise<void> => {
    try {
      const userData = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phoneNumber: values.phoneNumber,
        position: values.position,
        ...(file && { uploadProfileImage: file }),
      }

      // เรียกใช้ updateUser ใน store
      const res = await updateUser(user?.id || 0, userData, { isSelf: true })

      if (res?.success) {
        await loadUserFromStorage();
        toast.success("บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว")
      } else {
        toast.error(res?.message || "ไม่สามารถบันทึกข้อมูลโปรไฟล์ได้")
      }
    } catch (error) {
      console.error("handleProfileSave error:", error)
      toast.error("เกิดข้อผิดพลาดระหว่างบันทึกข้อมูล")
    }
  }

  const handlePasswordSave = async (formValues: PasswordFormValues): Promise<void> => {
    if (formValues.password !== formValues.confirmPassword) {
      toast.error('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน')
      return
    }
    try {
      // ตรวจสอบความถูกต้องจาก AntD Form
      const validatedValues = await passwordForm.validateFields();

      const res = await updateUser(user?.id || 0, { password: validatedValues.password });

      if (res?.success) {
        toast.success('เปลี่ยนรหัสผ่านสำเร็จ')
      } else {
        toast.error("เปลี่ยนรหัสผ่านไม่สำเร็จ")
      }
    } catch (error) {
      console.error("Validation failed or update failed:", error);
    } finally {
      passwordForm.resetFields();
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setProfileImage(URL.createObjectURL(selectedFile)) // preview
    }
  }

  const imgSrc = profileImage || user?.profileImage || undefined

  //tab items
  const tabItems = [
    {
      key: 'profile',
      label: (
        <span>
          <UserOutlined /> โปรไฟล์
        </span>
      ),
      children: (
        <div>
          <h2 className="text-lg font-medium mb-4">ข้อมูลโปรไฟล์</h2>
          <div className="flex items-center flex-wrap gap-4 mb-4">
            <Avatar size={64} src={imgSrc} icon={<UserOutlined />} />
            {/* <Image
              src={imgSrc}
              alt="Profile image" // ใส่คำอธิบายรูป
              preview
              style={{ width: 100, height: 100, borderRadius: '50%' }}
              placeholder={<Avatar size={100} icon={<UserOutlined />} />}
            /> */}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            <Button
              icon={<UploadOutlined />}
              onClick={() => fileInputRef.current?.click()}
            >
              เปลี่ยนรูปโปรไฟล์
            </Button>
          </div>
          <Form
            form={profileForm}
            layout="vertical"
            initialValues={{
              firstName: user?.firstName,
              lastName: user?.lastName,
              email: user?.email,
            }}
            onFinish={handleProfileSave}
          >
            <Form.Item name="firstName" label="ชื่อจริง" rules={[{ required: true, message: 'กรุณากรอกชื่อจริง' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="lastName" label="นามสกุล" rules={[{ required: true, message: 'กรุณากรอกนามสกุล' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="position" label="ตำแหน่ง" rules={[{ required: true, message: 'กรุณากรอกตำแหน่งของคุณ' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="phoneNumber" label="เบอร์โทรศัพท์"
              rules={[
                { required: true, message: 'กรุณากรอกเบอร์โทรศัพท์' },
                {
                  pattern: /^[0-9]{10}$/,
                  message: 'กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก และเป็นตัวเลขเท่านั้น',
                },
              ]}
            >
              <Input
                maxLength={10}
                onChange={(e) => {
                  e.target.value = e.target.value.replace(/[^0-9]/g, "");
                }}
              />
            </Form.Item>
            <Form.Item name="email" label="อีเมล">
              <Input disabled />
            </Form.Item>
            <div className='flex justify-end'>
              <BtnStyle text='บันทึก' className='w-fit' btn />
            </div>
          </Form>
        </div>
      ),
    },
    {
      key: 'password',
      label: (
        <span>
          <LockOutlined /> รหัสผ่าน
        </span>
      ),
      children: (
        <div>
          <h2 className="text-lg font-medium mb-4">เปลี่ยนรหัสผ่าน</h2>
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handlePasswordSave}
          >
            <PasswordFields />
            <div className='flex justify-end'>
              <BtnStyle text='เปลี่ยนรหัสผ่าน' className='w-fit ' btn />
            </div>
          </Form>
        </div>
      ),
    },
    {
      key: 'notifications',
      label: (
        <span>
          <NotificationOutlined /> การแจ้งเตือน
        </span>
      ),
      children: (
        <div>
          <h2 className="text-lg font-medium mb-4">ตั้งค่าการแจ้งเตือน</h2>
          <div className="flex items-center gap-3">
            <span className="text-gray-700">เปิด/ปิดการแจ้งเตือน</span>
            <Switch
              checked={notificationsEnabled}
              onChange={(checked) => setNotificationsEnabled(checked)}
              style={{ backgroundColor: notificationsEnabled ? 'var(--mainColor)' : 'gray' }}
            />
          </div>
          <TextError text='ปิดการแจ้งเตือนไปยังอีเมล' className='mt-5 ' />
        </div>
      ),
    },
  ]

  const filteredTabs =
    user?.role !== 1
      ? tabItems
      : tabItems.filter(tab => tab.key !== 'notifications')


  return (
    <div className="border-custom mx-auto pt-2 p-6 bg-white shadow rounded">
      <ConfigProvider
        theme={{
          components: {
            Tabs: {
              itemActiveColor: `var(--mainColor)`,
              itemSelectedColor: `var(--mainColor)`,
              inkBarColor: `var(--mainColor)`,
              itemHoverColor: `var(--mainColor)`,
            },
          },
        }}
      >
        <Tabs
          activeKey={tabParam}
          onChange={handleTabChange}
          tabBarGutter={32}
          items={filteredTabs}
        />
      </ConfigProvider>
    </div>
  )
}

export default SettingPage