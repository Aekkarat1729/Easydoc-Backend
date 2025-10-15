"use client"

import BtnBack from '@/components/Form/Btn/BtnBack'
import BtnStyle from '@/components/Form/Btn/BtnStyle'
import FileUpload from '@/components/Form/FileUpload'
import InputAutocomplete from '@/components/Form/InputAutocomplete'
import InputStyle from '@/components/Form/InputStyle'
import TextareaStyle from '@/components/Form/TextareaStyle'
import { SendOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Skeleton } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'
import FileList from '../Display/FIleList'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useSentStore } from '@/stores/useSentStore'
import { SentItem } from '@/types/documentType'
import { getDocumentNameById } from '@/utils/document'
import { useUserStore } from '@/stores/useUserStore'
import { toast } from 'react-toastify'
import TextError from '../Text/TextError'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { formatFileSize } from '@/utils/formatFileSize'
import MailInfoPopover from './MailInfoPopover'
import { formatThaiDateTime } from '@/utils/formatThaiDateTime'
import { SentType } from '@/const/enum'
import { PATHS } from '@/const/paths'

function InboxDocument() {

  const [reply, setReply] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [nameId, setNameId] = useState<string | number | null>(null)
  const [inboxType, setInboxType] = useState<number>(0)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [baseSentDoc, setBaseSentDoc] = useState<SentItem>();
  const [receiverSentDoc, setReceiverSentDoc] = useState<SentItem>();
  const [isSkeletonLoading, setIsSkeletonLoading] = useState<boolean>(true);
  const [userIsReply, setUserIsReply] = useState<boolean>(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const documentId = searchParams.get('id');

  //store
  const { fetchSentDetailById, sendReplyToOfficer, sendReplyToUser } = useSentStore();
  const { fetchUserMail } = useDocumentStore();
  const { allUserNameEmail } = useUserStore();

  const loadData = useCallback(async () => {
    const data = await fetchSentDetailById(documentId ? parseInt(documentId) : 0);
    if (data && data.success) {
      setBaseSentDoc(data.data.base);

      const reply = data.data.reply;
      if (reply && Object.keys(reply).length > 0) {
        setReceiverSentDoc(reply as SentItem);
        setUserIsReply(true);
      }

      setIsSkeletonLoading(false);
    } else {
      router.push(`/${PATHS.ED}/${PATHS.DOCUMENT_STATUS}`);
    }
  }, [documentId, router, fetchSentDetailById]); // ใส่ dependency ของตัวแปรที่ใช้ในฟังก์ชัน

  useEffect(() => {
    if (!documentId) return;

    loadData();
  }, [documentId, loadData]);

  const handleAddFile = (file: File) => {
    setUploadedFiles((prev) => [...prev, file]);
  };

  //reply
  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (inboxType !== 1 && !allUserNameEmail.some((item) => item.email === nameId)) {
      setError("กรุณาเลือกผู้รับเอกสารที่ถูกต้อง");
      return;
    }

    if (!reply.trim()) {
      setError("กรุณากรอกเลขที่เอกสาร");
      return;
    }

    setError("");
    setIsSkeletonLoading(true)

    try {
      let res;

      if (inboxType === 1) {
        res = await sendReplyToOfficer({
          file: uploadedFiles,
          parentSentId: Number(documentId),
          message: reply.trim(),
          remark: note.trim(),
        });
      } else if (inboxType === 2) {
        res = await sendReplyToUser({
          file: uploadedFiles,
          parentSentId: Number(documentId),
          receiverEmail: nameId?.toString(),
          number: baseSentDoc?.number,
          category: baseSentDoc?.category,
          subject: baseSentDoc?.subject,
          description: reply.trim(),
          remark: note.trim(),
        });
      }

      if (res?.success) {
        setNameId("");
        setNote("");
        setReply("");
        setError("");
        setInboxType(0)

        loadData();
        toast.success("ส่งเอกสารสำเร็จ");
        await fetchUserMail();
      } else {
        throw new Error(res?.message || "ส่งเอกสารไม่สำเร็จ");
      }
    } catch (err) {
      console.error("handleReply error:", err);
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      setError("ส่งเอกสารไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setIsSkeletonLoading(false)
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
      <BtnBack />
      <div className='mt-5 border-custom p-5'>
        {isSkeletonLoading ? (
          <>
            {/* Header */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <Skeleton.Avatar active size={40} shape="circle" />
                <div className="flex flex-col gap-1 w-full">
                  <Skeleton.Input active size="small" style={{ width: 120 }} />
                  <Skeleton.Input active size="small" style={{ width: 60 }} />
                </div>
              </div>
              <Skeleton.Input active size="small" style={{ width: 200, marginTop: 8 }} />
            </div>

            {/* File */}
            <div className="mt-5">
              <Skeleton active paragraph={{ rows: 2 }} />
            </div>

            {/* Content */}
            <div className="mt-5">
              <Skeleton.Input active size="small" style={{ width: 150, marginBottom: 4 }} />
              <Skeleton.Input active size="small" style={{ width: 200, marginBottom: 4 }} />
              <Skeleton paragraph={{ rows: 3 }} />
            </div>
            <hr className="my-5 border-custom" />
            <div className="">
              <Skeleton.Input active size="small" style={{ width: 100, marginBottom: 8 }} />
              <div className="mt-4">
                <div className="flex items-center gap-3">
                  <Skeleton.Avatar active size={40} shape="circle" />
                  <div className="flex flex-col gap-1 w-full">
                    <Skeleton.Input active size="small" style={{ width: 120 }} />
                    <Skeleton.Input active size="small" style={{ width: 80 }} />
                  </div>
                </div>
                <Skeleton.Input active size="small" style={{ width: 200, marginTop: 8 }} />
                <Skeleton active paragraph={{ rows: 2 }} className="mt-5" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              {/* Header */}
              <div className='flex flex-col gap-1'>
                <div className='flex items-center gap-3'>
                  <Avatar size={40} src={baseSentDoc?.sender?.profileImage || null} icon={<UserOutlined />} />
                  <div className="flex flex-col leading-tight gap-1">
                    <span className="text-gray-800 font-medium">{baseSentDoc?.sender?.firstName} {baseSentDoc?.sender?.lastName}</span>
                    <MailInfoPopover
                      senderName={`${baseSentDoc?.sender?.firstName} ${baseSentDoc?.sender?.lastName}`}
                      senderEmail={baseSentDoc?.sender?.email || '-'}
                      receiverName={`${baseSentDoc?.receiver?.firstName} ${baseSentDoc?.receiver?.lastName}`}
                      receiverEmail={baseSentDoc?.receiver?.email}
                      sentAt={formatThaiDateTime(baseSentDoc?.sentAt || '')}
                      subject={baseSentDoc?.subject}
                      title='คุณ'
                    />
                  </div>
                </div>
                <p className='text-gray-500 text-xs mt-2'>วันที่ส่ง: {formatThaiDateTime(baseSentDoc?.sentAt || '')}</p>
              </div>

              {/* Content */}
              <div className='mt-3'>
                <p><span className='font-bold'>หมายเลขเอกสาร:</span> {baseSentDoc?.number}</p>
                <p><span className='font-bold'>ประเภทเอกสาร:</span> {getDocumentNameById(baseSentDoc?.category || 1)}</p>
                <div className='mt-3 '>
                  <p ><span className='font-bold'>ชื่อเรื่อง:</span> {baseSentDoc?.subject}</p>
                  <p><span className='font-bold'>รายละเอียด:</span> {baseSentDoc?.description}</p>
                  <p><span className='font-bold'>หมายเหตุ:</span> {baseSentDoc?.remark || '-'}</p>
                </div>
              </div>
            </div>

            {/* File */}
            <div className='mt-5'>
              <FileList
                files={baseSentDoc?.documents?.map((doc) => {
                  const fakeFile = {
                    name: `${doc.name}.${doc.fileType}`,
                    size: doc.fileSize,
                    type: doc.fileType,
                  } as File;

                  return Object.assign(fakeFile, {
                    url: doc.fileUrl,
                    formattedSize: formatFileSize(doc.fileSize)
                  }) as File & { url: string; formattedSize: string };
                })}
              />
            </div>

            {userIsReply ? (
              <>
                <hr className='my-5 border-custom' />
                {/*Reply */}
                <div className=''>
                  <p className='text-lg font-bold'>
                    {receiverSentDoc?.kind === SentType.REPLY ? 'ตอบกลับ' : 'ส่งต่อ'}
                  </p>
                  <div className='mt-4'>
                    {/* Header */}
                    <div className='flex flex-col gap-1'>
                      <div className='flex items-center gap-3'>
                        <Avatar size={40} src={receiverSentDoc?.sender?.profileImage || null} icon={<UserOutlined />} />
                        <div className="flex flex-col leading-tight gap-1">
                          <span className="text-gray-800 font-medium">คุณ</span>
                          <MailInfoPopover
                            senderName={`${receiverSentDoc?.sender?.firstName} ${receiverSentDoc?.sender?.lastName}`}
                            senderEmail={receiverSentDoc?.sender?.email || '-'}
                            receiverName={`${receiverSentDoc?.receiver?.firstName} ${receiverSentDoc?.receiver?.lastName}`}
                            receiverEmail={receiverSentDoc?.receiver?.email}
                            sentAt={formatThaiDateTime(receiverSentDoc?.sentAt || '')}
                            subject={baseSentDoc?.subject}
                            title={`${receiverSentDoc?.receiver?.firstName}`}
                          />
                        </div>
                      </div>
                      <p className='text-gray-500 text-xs mt-2'>วันที่ส่ง: {formatThaiDateTime(receiverSentDoc?.sentAt || '')}</p>
                    </div>

                    {/* Content */}
                    <div className='mt-3'>
                      <p><span className='font-bold'>ข้อความ:</span> {receiverSentDoc?.description}</p>
                      <p><span className='font-bold'>หมายเหตุ:</span> {receiverSentDoc?.remark || '-'}</p>
                    </div>
                    {/* File */}
                    <div className='mt-5'>
                      <FileList
                        files={receiverSentDoc?.documents?.map((doc) => {
                          const fakeFile = {
                            name: `${doc.name}.${doc.fileType}`,
                            size: doc.fileSize,
                            type: doc.fileType,
                          } as File

                          return Object.assign(fakeFile, { url: doc.fileUrl }) as File & { url: string }
                        })}
                      />
                    </div>

                  </div>
                </div>

              </>
            ) : (
              !inboxType ? (
                <div className='mt-8 flex flex-col gap-1'>
                  <BtnStyle
                    text='ส่งต่อ'
                    className=''
                    bgBtn='bg-gray-400 text-white'
                    onClick={() => setInboxType(2)}
                  />
                  <BtnStyle
                    text='ตอบกลับ'
                    className=''
                    onClick={() => setInboxType(1)}
                  />
                </div>
              ) : (
                <>
                  {inboxType ? (
                    <>
                      <hr className='border-custom my-5 border-1' />
                      <p className='font-bold text-lg'>{`คุณ ${inboxType === 1 ? "ตอบกลับ" : "ส่งต่อ"}`}</p>
                      <div className='mt-5 flex flex-col gap-3'>
                        {inboxType === 2 && (
                          <InputAutocomplete
                            label="ชื่อผู้รับ"
                            value={nameId}
                            setValue={setNameId}
                            placeholder="กรอกชื่อผู้รับเอกสาร"
                            options={recipientOptions}
                            isRequired={true}
                          />
                        )}
                        <TextareaStyle
                          isRequired
                          label="ข้อความ:"
                          value={reply}
                          setValue={setReply}
                          placeholder="ระบุข้อความ..."
                          rows={5}
                        />
                        <InputStyle
                          label="หมายเหตุ (ถ้ามี)"
                          type='text'
                          value={note}
                          setValue={setNote}
                          placeholder="ระบุหมายเหตุ"
                        />
                        <FileUpload onAddFile={handleAddFile}
                          className='bg-gray-300' />
                        <FileList
                          files={uploadedFiles}
                          className='mt-3'
                          removable
                          onRemove={(index) => {
                            setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
                          }}
                        />
                      </div>
                    </>
                  ) : null}
                  <div className='mt-8 flex flex-col gap-1'>
                    {error && (
                      <TextError text={error} className='mb-3' />
                    )}
                    <BtnStyle
                      text='ยกเลิก'
                      className=''
                      bgBtn='bg-gray-400 text-white'
                      onClick={() => setInboxType(0)}
                    />
                    <BtnStyle
                      icon={SendOutlined}
                      text='ส่งข้อความ'
                      className=''
                      onClick={handleReply}
                    />

                  </div>
                </>
              )
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default InboxDocument
