export const documentTimeline_Mock = {
    success: true,
    isReply: false,
    dataSent: [
        {
            timestamp: '2025-06-29 10:30',
            from: {
                name: 'Phitakpong Supapphet', email: 'admin@example.com', position: 'เจ้าหน้าที่',
            },
            to: { name: 'Manut Choophong', email: 'manager@example.com', position: 'เจ้าหน้าที่ฝ่ายบุคคล' },
            description: 'ส่งเอกสารลงนามการลาออก',
            subject: 'การลาออกจากงาน',
            category: 3,
            number: 'DOC-0001',
            status: 'SUCCESS',
            note: 'ส่งเรียบร้อย',
            documents: [
                {
                    id: 1,
                    name: 'resignation_letter',
                    fileType: 'pdf',
                    fileUrl: 'https://storage.googleapis.com/easydocv1.appspot.com/sent/mock/resignation_letter.pdf',
                    fileSize: 123123,
                },
                {
                    id: 2,
                    name: 'id_card_copy',
                    fileType: 'jpg',
                    fileUrl: 'https://storage.googleapis.com/easydocv1.appspot.com/sent/mock/id_card.jpg',
                    fileSize: 123123,
                },
            ],
        },
        {
            timestamp: '2025-06-30 09:15',
            from: { name: 'Manut Choophong', email: 'manager@example.com', position: 'เจ้าหน้าที่ฝ่ายบุคคล' },
            to: { name: 'Somchai Manee', email: 'president@example.com', position: 'ผู้อำนวยการสำนัก' },
            description: 'เรียนเสนอเพื่อพิจารณาเซ็นอนุมัติ',
            status: 'SUCCESS',
            note: 'ถึงปลายทางแล้ว',

            documents: [
                {
                    id: 3,
                    name: 'approval_form',
                    fileType: 'docx',
                    fileUrl: 'https://storage.googleapis.com/easydocv1.appspot.com/sent/mock/approval_form.docx',
                    fileSize: 123123,
                },
            ],
        },
        {
            timestamp: '2025-07-01 14:00',
            from: { name: 'Somchai Manee', email: 'president@example.com', position: 'ผู้อำนวยการสำนัก' },
            to: { name: 'Jaruwan Swangwong', email: 'jaruwan.s@example.com', position: 'เจ้าหน้าที่ฝ่ายเซิฟเวอร์' },
            description: 'ฝากฝ่ายเซิฟเวอร์เซ็นอนุมัติ',
            status: 'WAITING',
            note: 'เร่งด่วน',
            documents: [
                {
                    id: 4,
                    name: 'review_notes',
                    fileType: 'png',
                    fileUrl: 'https://storage.googleapis.com/easydocv1.appspot.com/sent/mock/review_notes.png',
                    fileSize: 123123,
                },
            ],
        },
    ]
};
