'use client'

import React, { useEffect, useState } from 'react';
import { Timeline, Card, Skeleton } from 'antd';
import {
	HourglassOutlined,
	FileTextOutlined,
} from '@ant-design/icons';
import BtnBack from '@/components/Form/Btn/BtnBack';
import { useSentStore } from '@/stores/useSentStore';
import { MappedSentItem } from '@/types/documentType';
import { useSearchParams } from 'next/navigation';
import { SentDocStatusTag } from '../Tag/SentDocStatusTag';
import { useRouter } from 'next/navigation';
import { getDocumentNameById } from '@/utils/document';
import FileList from '../Display/FIleList';
import { formatFileSize } from '@/utils/formatFileSize';
import ProfileDisplay from '../Display/ProfileDisplay/ProfileDisplay';
import { PATHS } from '@/const/paths';

export default function TrackDocument() {

	const [documentTimeline, setDocumentTimeline] = useState<MappedSentItem[]>([]);
	const [isSkeletonLoading, setIsSkeletonLoading] = useState<boolean>(true);
	const [isReply, setIsReply] = useState<boolean>(false);

	const router = useRouter();
	const searchParams = useSearchParams();
	const documentId = searchParams.get('id');

	//store
	const { fetchSentById } = useSentStore();

	useEffect(() => {
		if (!documentId) return;
		const loadData = async () => {
			const data = await fetchSentById(documentId ? parseInt(documentId) : 0);
			if (data && data.success) {
				setDocumentTimeline(data?.dataSent || []);
				setIsReply(data?.isReply || false);
				setIsSkeletonLoading(false);
			} else {
				router.push(`/${PATHS.ED}/${PATHS.DOCUMENT_STATUS}`)
			}
		};
		loadData();
	}, [fetchSentById, documentId, router]);

	//set status
	function getSentDocStatusCode(index: number, length: number, isReply: boolean): number {
		if (length === 1) {
			return 3; // WAITING_REPLY
		}

		if (index < length - 1) {
			return 2; // ALREADY_SENT
		}

		// index === length - 1 (อันสุดท้าย)
		return isReply ? 1 : 3;
	}

	return (
		<div className="">
			<BtnBack label="ย้อนกลับ" className=''  />
			<div className='mt-5 '>
				{isSkeletonLoading ? (
					<div className="flex flex-col gap-1 ">
						<Skeleton.Input active size="small" style={{ width: 200, marginTop: 8 }} />
						<Skeleton.Input active size="small" style={{ width: 300, marginTop: 8 }} />
						<Skeleton.Input active size="small" style={{ width: 300, marginTop: 8 }} />
					</div>
				) : documentTimeline && (
					<div className='flex flex-col gap-1 '>
						<p className="text-lg" style={{ margin: 0 }}>
							หมายเลขเอกสาร: {documentTimeline[0]?.number}
						</p>
						<p className="text-lg" style={{ margin: 0 }}>
							ชื่อเรื่อง: {documentTimeline[0]?.subject}
						</p>
						<p style={{ margin: 0 }} className="text-lg">ประเภท: {getDocumentNameById(documentTimeline[0]?.category || 1)}</p>
					</div>
				)}
			</div>
			<Timeline
				mode="alternate"
				className="overflow-x-auto"
				style={{ marginTop: "20px", padding: "10px" }}
			>
				{isSkeletonLoading
					? Array.from({ length: 3 }).map((_, index) => (
						<Timeline.Item key={index}>
							<Card className="shadow-md rounded-xl w-full max-w-2xl">
								<Skeleton active paragraph={{ rows: 4 }} />
							</Card>
						</Timeline.Item>
					))
					: documentTimeline?.map((item, index) => (
						<Timeline.Item
							key={index}
							label={<span className="text-gray-500 text-sm">{item.timestamp}</span>}
							position={index === 0 ? "left" : "right"}
						>
							<Card className="shadow-md rounded-xl w-full max-w-2xl">
								<div className="flex flex-col gap-4">
									{/* Status */}
									<div className="flex items-center gap-2 font-semibold text-gray-700">
										<SentDocStatusTag
											code={getSentDocStatusCode(index, documentTimeline.length, isReply)}
										/>
									</div>

									{/* From */}
									<div className=" p-3 border rounded-lg bg-white flex flex-col gap-1">
										<p className="text-xs text-gray-400 mb-1 flex items-center">ผู้ส่ง</p>
										<ProfileDisplay profileImage={item?.from?.profileImage || ''} name={item.from.name} email={item.from.email} />
										<p className="text-xs text-gray-400 flex items-center mt-2">
											วันที่ส่ง: {item?.timestamp}
										</p>
										<p className="text-xs text-gray-400 flex items-center">
											ตำแหน่ง: {item.from.position || "-"}
										</p>
									</div>

									{/* To */}
									{item.to && (
										<div className="p-3 border rounded-lg bg-white flex flex-col gap-1">
											<p className="text-xs text-gray-400 mb-1 flex items-center">ผู้รับ</p>
											<ProfileDisplay profileImage={item?.to?.profileImage || ''} name={item.to.name} email={item.to.email} />
											<p className="text-xs text-gray-400 flex items-center mt-2">
												ตำแหน่ง: {item.to.position || "-"}
											</p>
										</div>
									)}

									{/* Description */}
									{item.description && (
										<p className="text-gray-700 flex items-center gap-2">
											<FileTextOutlined className="text-gray-500" /> {item.description}
										</p>
									)}

									{/* Documents */}
									{item.documents && item.documents.length > 0 && (
										<div className="">
											<FileList
												files={item.documents.map((doc) => {
													const fakeFile = {
														name: `${doc.name}.${doc.fileType}`,
														size: doc.fileSize,
														type: doc.fileType,
													} as File

													return Object.assign(fakeFile, {
														url: doc.fileUrl,
														formattedSize: formatFileSize(doc.fileSize)
													}) as File & { url: string; formattedSize: string };
												})}
											/>

										</div>
									)}

									{/* Note */}
									{item.note && (
										<p className="text-sm text-gray-500 flex items-center">
											📝 หมายเหตุ: {item.note}
										</p>
									)}
								</div>
							</Card>
						</Timeline.Item>
					))}
			</Timeline>
			{/* Current Holder */}
			<div className="mt-5 p-4 border border-gray-200 rounded-xl shadow-md bg-white">
				{isSkeletonLoading ? (
					<Skeleton active paragraph={{ rows: 2 }} />
				) : documentTimeline && (
					<>
						<h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-gray-800">
							<HourglassOutlined className="text-yellow-500" /> สถานะปัจจุบัน
						</h2>
						<div className='flex flex-col gap-1'>
							<div className="flex gap-2 items-center">
								<p className='text-gray-700 text-sm'>เอกสารอยู่ที่:{" "}</p>
								<p className="">
									<span className='font-semibold'>{documentTimeline[documentTimeline.length - 1].to?.name}</span>{`  `}<span className='text-xs'>{`<${documentTimeline[documentTimeline.length - 1].to?.email}>`}</span><span className='font-semibold'>{`  `}{isReply && `(คุณ)`}</span>
								</p>
							</div>
							<div className="flex gap-2 items-center">
								<p className='text-gray-700 text-sm'>ตำแหน่ง:{" "}</p>
								<p className="">
									{documentTimeline[documentTimeline.length - 1].to?.position}
								</p>
							</div>
							<div className='flex gap-2 items-center'>
								<p>สถานะ:</p> <SentDocStatusTag code={isReply ? 1 : 3} />
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}