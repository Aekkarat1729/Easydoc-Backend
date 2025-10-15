'use client'

import React, { useState } from 'react'
import { Skeleton, List, Button, Modal, Form, Input, Popconfirm, Upload, Tooltip } from 'antd'
import { EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import FileIcon from '@/components/Display/FileIcon'
import BtnStyle from '@/components/Form/Btn/BtnStyle'

import { FileItem, useDefaultFile } from '@/stores/useDefaultFile'
import { toast } from 'react-toastify'
import DefaultFileSkeleton from '@/components/Skeleton/DefaultFileSkeleton'
import Link from 'next/link'

function ManageInitialFilesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFile, setEditingFile] = useState<FileItem | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [form] = Form.useForm()

  const { defaultFile, uploadDefaultFile, updateDefaultFile, fetchDefaultFile, deleteDefaultFile } = useDefaultFile()

  const openModal = (file?: FileItem) => {
    setEditingFile(file || null)
    form.setFieldsValue(file || { fileName: '' })
    setUploadedFile(null)
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      if (!editingFile && !uploadedFile) {
        toast.error("กรุณาอัปโหลดไฟล์");
        return;
      }
      let actionResult = null;
      if (editingFile) {

        actionResult = await updateDefaultFile(
          editingFile.id,
          values.fileName,
        );
      } else if (uploadedFile) {
        actionResult = await uploadDefaultFile({
          name: values.fileName || uploadedFile.name,
          file: uploadedFile,
        });
      }
      if (!actionResult) {
        toast.error("เกิดข้อผิดพลาดในการบันทึกไฟล์");
        return;
      }

      await fetchDefaultFile();
      setIsModalOpen(false);

      toast.success("บันทึกไฟล์เรียบร้อยแล้ว");
    } catch (err) {
      console.error("Failed to save file", err);
      toast.error("เกิดข้อผิดพลาดในการบันทึกไฟล์");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await deleteDefaultFile(id);
      if (res.success) {
        await fetchDefaultFile();
        toast.success("ลบไฟล์สำเร็จ");
      } else {
        toast.error("เกิดข้อผิดพลาดในการลบไฟล์");
      }

    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("ลบไฟล์ไม่สำเร็จ");
    }
  };

  return (
    <div className="border-custom p-5 mx-auto rounded shadow bg-white">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-semibold text-gray-800">จัดการไฟล์เริ่มต้น</h2>
        {defaultFile ? (
          <BtnStyle className='' text="เพิ่มไฟล์" onClick={() => openModal()} />

        ) : (
          <Skeleton.Button active className='rounded-xl' />
        )}
      </div>

      {!defaultFile ? (
        <div className="space-y-5">
          <DefaultFileSkeleton count={10} />
        </div>
      ) : (
        <List
          className="mt-3"
          itemLayout="horizontal"
          dataSource={defaultFile}
          renderItem={(item) => (
            <List.Item
              key={item.id}
              className="hover:bg-gray-50 rounded-md px-2"
              actions={[
                <Tooltip key="edit" title="แก้ไข">
                  <Button
                    size="small"
                    type="text"
                    icon={<EditOutlined style={{ color: 'blue' }} />}
                    onClick={() => openModal(item)}
                  />
                </Tooltip>,
                <Popconfirm
                  key="deleted"
                  title="ยืนยันการลบ?"
                  onConfirm={() => handleDelete(item.id)}
                  okText="บันทึก"
                  cancelText="ยกเลิก"
                  okButtonProps={{
                    style: { backgroundColor: 'var(--mainColor)', borderColor: 'var(--mainColor)' }
                  }}
                  cancelButtonProps={{
                    style: { color: 'var(--mainColor)', backgroundColor: 'transparent', borderColor: 'var(--mainColor)' }
                  }}
                >
                  <Tooltip title="ลบ">
                    <Button
                      size="small"
                      type="text"
                      icon={<DeleteOutlined style={{ color: 'red' }} />}
                    />
                  </Tooltip>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<FileIcon ext={item.fileType} />}
                title={
                  <Link href={item.url} target='_blank' className="text-base font-medium text-gray-800">
                    {item.fileName}.{item.fileType}
                  </Link>
                }
                description={
                  <span className="text-sm text-gray-500">
                    ขนาด: {item.size}
                  </span>
                }
              />
            </List.Item>
          )}
        />
      )}

      <Modal
        title={editingFile ? 'แก้ไขไฟล์' : 'เพิ่มไฟล์'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        okText="บันทึก"
        cancelText="ยกเลิก"
        okButtonProps={{
          style: { backgroundColor: 'var(--mainColor)', borderColor: 'var(--mainColor)' }
        }}
        cancelButtonProps={{
          style: { color: 'var(--mainColor)', backgroundColor: 'transparent', borderColor: 'var(--mainColor)' }
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="fileName"
            label="ชื่อไฟล์"
            rules={[{ required: true, message: 'กรุณากรอกชื่อไฟล์' }]}
          >
            <Input />
          </Form.Item>

          {!editingFile && (
            <Form.Item label="อัปโหลดไฟล์">
              <Upload
                beforeUpload={(file) => {
                  setUploadedFile(file)
                  return false
                }}
                maxCount={1}
                showUploadList={false}
                accept=".pdf,.doc,.docx,.jpg,.png,.xlsx"
              >
                <Button icon={<UploadOutlined />}>เลือกไฟล์</Button>
              </Upload>
              {uploadedFile && (
                <p className="mt-2 text-sm text-gray-600">
                  ไฟล์ที่เลือก: {uploadedFile.name} ({Math.round(uploadedFile.size / 1024)} KB)
                </p>
              )}
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default ManageInitialFilesPage