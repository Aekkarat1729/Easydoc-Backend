'use client'

import BtnStyle from '@/components/Form/Btn/BtnStyle';
import FileUpload from '@/components/Form/FileUpload';
import InputAutocomplete from '@/components/Form/InputAutocomplete';
import InputStyle from '@/components/Form/InputStyle';
import SelectStyle from '@/components/Form/SelectStyle';
import TextareaStyle from '@/components/Form/TextareaStyle';
import TextTitleSub from '@/components/Title/TextTitle';
import React, { useState } from 'react';

import { toast } from "react-toastify";

//store
import { useUserStore } from '@/stores/useUserStore';
import { useDocumentStore } from '@/stores/useDocumentStore';
import TextError from '@/components/Text/TextError';
import { TypeDocumentOptions } from '@/config/documentType';
import FileList from '@/components/Display/FIleList';

function Page() {

  const [receiverEmail, setReceiverEmail] = useState<string | number | null>(null);
  const [docNumber, setDocNumber] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [docType, setDocType] = useState<number | string>(1)
  const [subject, setSubject] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  //store
  const { allUserNameEmail } = useUserStore();
  const { sendDocumentForOfficer, fetchOfficerMail } = useDocumentStore();


  const handleAddFile = (file: File) => {
    setUploadedFiles((prev) => [...prev, file]);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allUserNameEmail.some((item => item.email === receiverEmail))) {
      setError("กรุณาเลือกผู้รับเอกสารที่ถูกต้อง");
      return;
    }
    if (!docNumber) {
      setError("กรุณากรอกเลขที่เอกสาร");
      return;
    }
    if (!docType) {
      setError("กรุณาเลือกประเภทเอกสาร");
      return;
    }
    if (!description) {
      setError("กรุณากรอกคำอธิบาย");
      return;
    }
    if (uploadedFiles.length === 0) {
      setError("กรุณาเลือกไฟล์ก่อน");
      return;
    }
    setError("");

    try {
      const res = await sendDocumentForOfficer({
        file: uploadedFiles,
        receiverEmail: receiverEmail as string,
        subject: subject,
        remark: note,
        number: docNumber,
        category: Number(docType),
        description,
        status: "SENT",
      });

      if (res.success) {
        toast.success("ส่งเอกสารสำเร็จ");
        setReceiverEmail(null);
        setDocNumber('');
        setDocType(1);
        setSubject('');
        setDescription('');
        setNote('');
        setUploadedFiles([]);
        setError('');

        await fetchOfficerMail();
        return
      }
    } catch (err) {
      console.log(err)
      toast.error("เกิดข้อผืดพลาด กรุณาลองใหม่อีกครั้ง");
      setError("ส่งเอกสารไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  };

  //test option for autocomplete
  const recipientOptions = allUserNameEmail.map(user => ({
    key: user.email,
    name: user.name,
    email: user.email,
    avatar: user?.profileImage
  }));

  return (
    <div>
      <TextTitleSub
        title="ข้อมูลการส่ง"
        subTitle="lorem isupm abcdefghijklmnop"
      />

      <form onSubmit={handleSubmit} className="border rounded-lg border-gray-300 p-6 bg-white my-5 shadow-sm  mx-auto">
        <div className="grid grid-cols-1 gap-2">
          {/* Name */}
          <InputAutocomplete
            label="ชื่อผู้รับ"
            value={receiverEmail}
            setValue={setReceiverEmail}
            placeholder="กรอกชื่อผู้รับเอกสาร"
            options={recipientOptions}
            isRequired={true}
          />
          <div />
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* หมายเลขเอกสาร */}
            <InputStyle
              label="หมายเลขเอกสาร"
              type='text'
              value={docNumber}
              setValue={setDocNumber}
              placeholder="กรอกหมายเลขเอกสาร"
              isRequired={true}
            />

            {/* ประเภทเอกสาร */}
            <SelectStyle
              label="ประเภทเอกสาร"
              options={TypeDocumentOptions}
              value={docType}
              onChange={setDocType}
              className='w-full'
              isRequired={true}
            />
          </div>
          <div />

        </div>

        <div className='p-5 bg-gray-100 rounded-lg flex flex-col gap-2 mt-4 shadow'>
          {/* ชื่อเรื่อง */}
          <InputStyle
            label="ชื่อเรื่อง"
            type='text'
            value={subject}
            setValue={setSubject}
            placeholder="ชื่อเรื่อง"
            isRequired={true}
          />
          {/* รายละเอียด */}

          <TextareaStyle
            label="รายละเอียด"
            value={description}
            setValue={setDescription}
            placeholder="ใส่รายละเอียดเอกสารเพิ่มเติม..."
            rows={5}
            isRequired={true}
          />
          <FileUpload
            onAddFile={handleAddFile}
            className='bg-gray-300'
            isRequired
          />
          <FileList
            files={uploadedFiles}
            className='mt-3'
            removable
            onRemove={(index) => {
              setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
            }}
          />
        </div>
        <div className='mt-5'>
          <InputStyle
            label="หมายเหตุ (ถ้ามี)"
            type='text'
            value={note}
            setValue={setNote}
            placeholder="ระบุหมายเหตุ"
          />
        </div>
        {error && (
          <div className='mt-5'>
            <TextError text={error} />
          </div>
        )}

        {/* ปุ่มส่ง */}
        <div className='flex justify-end mt-8'>
          <BtnStyle
            text="ส่งเอกสาร"
            btn
            className=''
          />
        </div>
      </form>
    </div>
  );
}

export default Page;