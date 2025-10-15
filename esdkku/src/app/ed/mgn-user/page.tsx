'use client';

import React, { useState } from 'react';
import TableStyle from '@/components/Table/TableStyle';
import { UserRole } from '@/const/enum';

//ant
import { Button, Modal, Form, Input, Select, Popconfirm } from 'antd';
import { EditOutlined, KeyOutlined, DeleteOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table/interface';

//utils
import { getUserRoleFromId } from '@/utils/userRoles';

//components
import BtnStyle from '@/components/Form/Btn/BtnStyle';

//store
import { useUserStore } from '@/stores/useUserStore';
import { toast } from 'react-toastify';

//type
import { UserInfo } from '@/types/userType';
import PasswordFields from '@/components/Form/PasswordFields';
import ProfileDisplay from '@/components/Display/ProfileDisplay/ProfileDisplay';

function ManageUserPage() {

  //store
  const { allUser, createUser, updateUser, fetchAllUserForAdmin, deleteUser } = useUserStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const handleOpenModal = (user?: UserInfo) => {
    setEditingUser(user || null);
    form.setFieldsValue(
      user || { firstName: '', lastName: '', email: '', position: '', password: '', role: 3, phoneNumber: '' }
    );
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields(); // รอ validate
      let res;
      let isSuccess = false;

      if (editingUser) {
        // Update
        res = await updateUser(editingUser.id, values); // ส่ง id + ข้อมูลใหม่
        isSuccess = res?.success ?? false;

      } else {
        // Create

        const newUser: UserInfo = {
          id: 0,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phoneNumber: values.phoneNumber,
          position: values.position,
          password: values.password!,
          role: Number(values.role),
        };

        const res = await createUser(newUser as UserInfo & { password: string });
        isSuccess = res?.success ?? false;
      }
      setIsModalOpen(false);
      if (isSuccess) {
        await fetchAllUserForAdmin();
        toast.success(editingUser ? 'แก้ไขผู้ใช้สำเร็จ' : 'สร้างผู้ใช้สำเร็จ');
      } else {
        toast.error(editingUser ? 'เกิดข้อผิดพลาด แก้ไขผู้ใช้ไม่สำเร็จ' : 'เกิดข้อผิดพลาด สร้างผู้ใช้ไม่สำเร็จ');
      }

    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await deleteUser(id); // เรียก API ลบ
      if (res.success) {
        // อัปเดต store ให้ลบผู้ใช้คนนี้ออก
        await fetchAllUserForAdmin();
        toast.success("ลบผู้ใช้สำเร็จ");
      } else {
        toast.error("ลบผู้ใช้ไม่สำเร็จ");
      }
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาด");
    }
  };
  const handleOpenPasswordModal = (user: UserInfo) => {
    setEditingUser(user);
    passwordForm.resetFields();
    setIsPasswordModalOpen(true);
  };

  const handleChangePassword = async () => {
    try {
      const values = await passwordForm.validateFields();

      if (!editingUser) return;

      const res = await updateUser(editingUser.id, { password: values.password });

      if (res?.success) {
        toast.success("เปลี่ยนรหัสผ่านสำเร็จ");
      } else {
        toast.error("เปลี่ยนรหัสผ่านไม่สำเร็จ");
      }

      setIsPasswordModalOpen(false);
    } catch (error) {
      console.error("Validation failed or update failed:", error);
    }
  };

  const columns: ColumnsType<UserInfo> = [
    {
      title: 'ชื่อ',
      key: 'name',
      render: (_value, record) => (
        <ProfileDisplay profileImage={record.profileImage || ''} name={`${record.firstName} ${record.lastName}`} email={record.email} />
      ),
    },
    {
      title: 'ตำแหน่ง',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: number) => getUserRoleFromId(role),
    },
    {
      title: 'การจัดการ',
      key: 'actions',
      width: 150,
      align: 'right',
      render: (_value, record) => (
        <div className="flex justify-end">
          <Tooltip title="แก้ไข">
            <Button
              size="small"
              type="text"
              icon={<EditOutlined style={{ color: 'blue' }} />}
              onClick={() => handleOpenModal(record)}
            />
          </Tooltip>

          <Tooltip title="เปลี่ยนรหัสผ่าน">
            <Button
              size="small"
              type="text"
              icon={<KeyOutlined style={{ color: 'green' }} />}
              onClick={() => handleOpenPasswordModal(record)}
            />
          </Tooltip>

          <Popconfirm title="ยืนยันการลบ?"
            onConfirm={() => handleDelete(record.id)}
            okText="บันทึก"
            cancelText="ยกเลิก"
            okButtonProps={{
              style: {
                backgroundColor: 'var(--mainColor)',
                borderColor: 'var(--mainColor)',

              }
            }}
            cancelButtonProps={{
              style: {
                color: 'var(--mainColor)',
                backgroundColor: 'transparent',
                borderColor: 'var(--mainColor)',

              }
            }}
          >
            <Tooltip title="ลบ">
              <Button
                size="small"
                type="text"
                icon={<DeleteOutlined style={{ color: 'red' }} />}
              />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-end mb-4">
        {/* <h2 className="text-xl font-semibold">จัดการผู้ใช้งาน</h2> */}
        <BtnStyle className='px-4' text='เพิ่มผู้ใช้งาน' onClick={() => handleOpenModal()} />
      </div>

      <TableStyle<UserInfo>
        columns={columns}
        dataSource={allUser ? allUser : []}
        pagination={{ pageSize: 10 }}
        loading={allUser ? false : true}
      />

      {/* Modal เพิ่ม/แก้ไขผู้ใช้งาน */}
      <Modal
        title={editingUser ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งาน'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        okText="บันทึก"
        cancelText="ยกเลิก"
        okButtonProps={{
          style: {
            backgroundColor: 'var(--mainColor)',
            borderColor: 'var(--mainColor)',

          }
        }}
        cancelButtonProps={{
          style: {
            color: 'var(--mainColor)',
            backgroundColor: 'transparent',
            borderColor: 'var(--mainColor)',

          }
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="firstName" label="ชื่อจริง" rules={[{ required: true, message: 'กรุณากรอกชื่อจริง' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="lastName" label="นามสกุล" rules={[{ required: true, message: 'กรุณากรอกนามสกุล' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="อีเมล" rules={[{ required: true, type: 'email', message: 'กรุณากรอกอีเมลให้ถูกต้อง' }]}>
            <Input disabled={!!editingUser} />
          </Form.Item>
          <Form.Item name="position" label="ตำแหน่ง" rules={[{ required: true, message: 'กรุณากรอกตำแหน่ง' }]}>
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
          {!editingUser && (
            <Form.Item
              name="password"
              label="รหัสผ่าน"
              rules={[
                { required: true, message: "กรุณากรอกรหัสผ่านใหม่" },
                { min: 8, message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" },
                {
                  pattern: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
                  message: "รหัสผ่านต้องมีทั้งตัวอักษร ตัวเลข และอักขระพิเศษอย่างน้อย 1 ตัว",
                },
              ]}
            >
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="role" label="Role" rules={[{ required: true, message: 'กรุณาเลือก Role' }]}>
            <Select disabled={!!editingUser}>
              <Select.Option value={1}>{UserRole.ADMIN}</Select.Option>
              <Select.Option value={2}>{UserRole.OFFICER}</Select.Option>
              <Select.Option value={3}>{UserRole.USER}</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal เปลี่ยนรหัสผ่าน */}
      <Modal
        title={`เปลี่ยนรหัสผ่าน: ${editingUser?.firstName || ''}`}
        open={isPasswordModalOpen}
        onOk={handleChangePassword}
        onCancel={() => setIsPasswordModalOpen(false)}
        okText="บันทึก"
        cancelText="ยกเลิก"
        okButtonProps={{
          style: {
            backgroundColor: 'var(--mainColor)',
            borderColor: 'var(--mainColor)',

          }
        }}
        cancelButtonProps={{
          style: {
            color: 'var(--mainColor)',
            backgroundColor: 'transparent',
            borderColor: 'var(--mainColor)',

          }
        }}
      >
        <Form form={passwordForm} layout="vertical">
          <PasswordFields />
        </Form>
      </Modal>
    </div>
  );
}

export default ManageUserPage;