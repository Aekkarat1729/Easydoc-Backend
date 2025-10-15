const nodemailer = require('nodemailer');

// สร้าง transporter สำหรับ Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Gmail address
      pass: process.env.EMAIL_PASSWORD // Gmail app password
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Template สำหรับแจ้งเตือนเอกสารใหม่
const createDocumentNotificationTemplate = (recipientName, documentTitle, senderName, documentType) => {
  return {
    subject: 'แจ้งเตือนระบบ EasyDoc: มีเอกสารเข้าระบบ',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body { 
            font-family: 'Segoe UI', 'Kanit', Arial, sans-serif; 
            line-height: 1.6; 
            color: #2c3e50;
            background: #ecf0f1;
            padding: 20px;
          }
          
          .email-container { 
            max-width: 650px; 
            margin: 0 auto; 
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          }
          
          .header { 
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white; 
            padding: 30px;
            text-align: center;
            position: relative;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #3498db, #e74c3c, #f39c12, #27ae60);
          }
          
          .logo-section {
            margin-bottom: 15px;
          }
          
          .header h1 { 
            font-size: 26px;
            font-weight: 600;
            margin: 0;
            letter-spacing: 0.5px;
          }
          
          .header p {
            font-size: 14px;
            opacity: 0.9;
            margin-top: 5px;
          }
          
          .content { 
            padding: 40px 35px;
            background: white;
          }
          
          .greeting {
            font-size: 18px;
            color: #2c3e50;
            margin-bottom: 25px;
            font-weight: 500;
          }
          
          .notification-message {
            background: #f8f9fa;
            border-left: 5px solid #3498db;
            padding: 20px 25px;
            margin: 25px 0;
            border-radius: 0 8px 8px 0;
          }
          
          .document-details { 
            background: linear-gradient(135deg, #ecf0f1 0%, #f8f9fa 100%);
            border: 1px solid #e9ecef;
            padding: 25px;
            border-radius: 10px;
            margin: 25px 0;
          }
          
          .document-details h3 {
            color: #2c3e50;
            font-size: 18px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .detail-row {
            display: flex;
            margin-bottom: 12px;
            align-items: flex-start;
          }
          
          .detail-label {
            font-weight: 600;
            color: #34495e;
            min-width: 100px;
            margin-right: 15px;
          }
          
          .detail-value {
            color: #2c3e50;
            flex: 1;
          }
          
          .cta-section {
            text-align: center;
            margin: 35px 0;
          }
          
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
            color: white;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
            transition: all 0.3s ease;
          }
          
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
          }
          
          .note {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 6px;
            margin-top: 25px;
            font-size: 14px;
            text-align: center;
          }
          
          .footer { 
            background: #f8f9fa;
            text-align: center;
            padding: 25px;
            border-top: 1px solid #e9ecef;
          }
          
          .footer-content {
            color: #6c757d;
            font-size: 13px;
            line-height: 1.8;
          }
          
          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #ddd, transparent);
            margin: 20px 0;
          }
          
          .section-title {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 8px;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 1px;
          }
          
          @media (max-width: 600px) {
            .email-container { margin: 10px; }
            .content { padding: 25px 20px; }
            .header { padding: 25px 20px; }
            .detail-row { flex-direction: column; }
            .detail-label { min-width: auto; margin-bottom: 5px; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <div class="logo-section">
              <h1>EasyDoc System</h1>
              <p>ระบบจัดการเอกสารอิเล็กทรอนิกส์</p>
            </div>
          </div>
          
          <div class="content">
            <div class="greeting">
              เรียน คุณ${recipientName}
            </div>
            
            <div class="notification-message">
              <div class="section-title">แจ้งเตือน</div>
              <strong>คุณมีเอกสารใหม่เข้าสู่ระบบ EasyDoc แล้ว</strong><br>
              กรุณาตรวจสอบและดำเนินการต่อไป
            </div>
            
            <div class="document-details">
              <h3>รายละเอียดเอกสาร</h3>
              
              <div class="detail-row">
                <div class="detail-label">ชื่อเอกสาร:</div>
                <div class="detail-value"><strong>${documentTitle}</strong></div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">ประเภท:</div>
                <div class="detail-value">${documentType}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">ผู้ส่ง:</div>
                <div class="detail-value">${senderName}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">วันที่-เวลา:</div>
                <div class="detail-value">${new Date().toLocaleString('th-TH', {
                  year: 'numeric',
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}</div>
              </div>
            </div>
            
            <div class="divider"></div>
            
            <p style="margin: 20px 0; color: #5a6c7d;">
              เพื่อให้การดำเนินการเป็นไปอย่างรวดเร็วและมีประสิทธิภาพ กรุณาเข้าสู่ระบบเพื่อดูรายละเอียดและดำเนินการต่อไป
            </p>
            
            <div class="cta-section">
              <a href="${process.env.FRONTEND_URL}/ed/inbox" class="cta-button">
                เข้าสู่ระบบ EasyDoc
              </a>
            </div>
            
            <div class="note">
              <strong>หมายเหตุ:</strong> อีเมลนี้ถูกส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับอีเมลนี้
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-content">
              <strong>EasyDoc System</strong><br>
              ระบบจัดการเอกสารอิเล็กทรอนิกส์<br>
              <small>© 2025 All Rights Reserved | Powered by EasyDoc Technology</small>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      แจ้งเตือน: มีเอกสารใหม่เข้าระบบ EasyDoc
      
      สวัสดี ${recipientName}
      
      รายละเอียดเอกสาร:
      - ชื่อเอกสาร: ${documentTitle}
      - ประเภท: ${documentType}
      - ผู้ส่ง: ${senderName}
      - เวลา: ${new Date().toLocaleString('th-TH')}
      
      กรุณาเข้าสู่ระบบเพื่อดูรายละเอียด: ${process.env.FRONTEND_URL}/ed/inbox
    `
  };
};

// ฟังก์ชันส่งอีเมลแจ้งเตือนเอกสารใหม่
const sendDocumentNotification = async (recipientEmail, recipientName, documentTitle, senderName, documentType = 'เอกสาร') => {
  try {
    const transporter = createTransporter();
    const emailTemplate = createDocumentNotificationTemplate(recipientName, documentTitle, senderName, documentType);
    
    const mailOptions = {
      from: {
        name: 'EasyDoc System',
        address: process.env.EMAIL_USER
      },
      to: recipientEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    };

    console.log(`Sending email notification to: ${recipientEmail}`);
    const result = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', result.messageId);
    return {
      success: true,
      messageId: result.messageId,
      recipient: recipientEmail
    };
    
  } catch (error) {
    console.error('Failed to send email notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันทดสอบการส่งอีเมล
const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email connection verified successfully');
    return true;
  } catch (error) {
    console.error('Email connection failed:', error);
    return false;
  }
};

// ส่งอีเมลแจ้งเตือนแบบหลายคนพร้อมกัน
const sendBulkDocumentNotification = async (recipients, documentTitle, senderName, documentType = 'เอกสาร') => {
  const results = [];
  
  for (const recipient of recipients) {
    const result = await sendDocumentNotification(
      recipient.email,
      recipient.name,
      documentTitle,
      senderName,
      documentType
    );
    
    results.push({
      ...result,
      recipientName: recipient.name,
      recipientEmail: recipient.email
    });
    
    // หน่วงเวลาเล็กน้อยเพื่อไม่ให้ spam Gmail
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
};

module.exports = {
  sendDocumentNotification,
  sendBulkDocumentNotification,
  testEmailConnection,
  createTransporter
};