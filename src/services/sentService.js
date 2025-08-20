// src/services/sentService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sendDocument = async (data) => {
  try {
    if (data.isForwarded && data.parentSentId) {
      return await prisma.sent.create({
        data: {
          documentId: data.documentId,
          senderId: data.senderId,
          receiverId: data.receiverId,
          number: data.number,
          category: data.category,
          description: data.description,
          status: data.status,
          isForwarded: true,
          parentSentId: data.parentSentId,
          forwarded: { connect: { id: data.parentSentId } },
          sentAt: new Date(),
        }
      });
    } else {
      return await prisma.sent.create({
        data: {
          documentId: data.documentId,
          senderId: data.senderId,
          receiverId: data.receiverId,
          number: data.number,
          category: data.category,
          description: data.description,
          status: data.status,
          sentAt: new Date(),
        }
      });
    }
  } catch (err) {
    throw new Error('Failed to send document: ' + err.message);
  }
};

/** ✅ ดึงการส่งเอกสารตาม id (รวม document/sender/receiver) */
const getSentById = async (id) => {
  try {
    const record = await prisma.sent.findUnique({
      where: { id: Number(id) },
      include: {
        document: true,
        sender:  { select: { id: true, email: true, firstName: true, lastName: true } },
        receiver:{ select: { id: true, email: true, firstName: true, lastName: true } },
      }
    });
    if (!record) throw new Error('Sent not found');
    return record;
  } catch (err) {
    throw new Error('Failed to fetch sent: ' + err.message);
  }
};

/**
 * ดึง sent ตาม id พร้อม chain (เส้นทางก่อนหน้า + การส่งต่อ)
 * (ใช้ใน /sent/chain/{id})
 */
const getSentByIdWithChain = async (id) => {
  const base = await prisma.sent.findUnique({
    where: { id: Number(id) },
    include: {
      document: true,
      sender: { select: { id: true, email: true, firstName: true, lastName: true } },
      receiver: { select: { id: true, email: true, firstName: true, lastName: true } },
    }
  });
  if (!base) { const e = new Error('Sent not found'); e.code = 'NOT_FOUND'; throw e; }

  const rootId = base.threadId ?? base.id;

  // 1) โหลดทั้งเธรดตามปกติ
  const thread = await prisma.sent.findMany({
    where: { threadId: rootId },
    orderBy: [{ depth: 'asc' }, { sentAt: 'asc' }],
    include: {
      document: true,
      sender: { select: { id: true, email: true, firstName: true, lastName: true } },
      receiver: { select: { id: true, email: true, firstName: true, lastName: true } },
    }
  });

  const byId = new Map(thread.map(x => [x.id, x]));

  // 2) เดินย้อน ancestor แบบ fallback ถ้า parent ไม่ได้อยู่ในเธรด
  const ancestors = [];
  let parentId = base.parentSentId;
  while (parentId) {
    let node = byId.get(parentId);
    if (!node) {
      node = await prisma.sent.findUnique({
        where: { id: parentId },
        include: {
          document: true,
          sender: { select: { id: true, email: true, firstName: true, lastName: true } },
          receiver: { select: { id: true, email: true, firstName: true, lastName: true } },
        }
      });
    }
    if (!node) break;  // parent ไม่พบจริงๆ
    ancestors.push(node);
    parentId = node.parentSentId;
  }

  // 3) path = ancestors(จาก root จริง) + base
  const pathFromRoot = [...ancestors.reverse(), base];

  // 4) descendants จาก base (เหมือนเดิม)
  const childrenMap = new Map();
  for (const node of thread) {
    if (node.parentSentId == null) continue;
    const arr = childrenMap.get(node.parentSentId) || [];
    arr.push(node);
    childrenMap.set(node.parentSentId, arr);
  }
  for (const arr of childrenMap.values()) {
    arr.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
  }
  const forwardsFromThis = [];
  (function dfs(pid){
    (childrenMap.get(pid) || []).forEach(ch => {
      forwardsFromThis.push(ch);
      dfs(ch.id);
    });
  })(base.id);

  const fullChain = [...pathFromRoot, ...forwardsFromThis];

  return {
    rootId,
    threadCount: thread.length,
    base,
    pathFromRoot,
    forwardsFromThis,
    fullChain,
  };
};

/** ✅ สร้างเรคคอร์ด "ตอบกลับ" (ไม่รวมอัปโหลดไฟล์) */
const replyDocument = async (data) => {
  try {
    return await prisma.sent.create({ data });
  } catch (err) {
    throw new Error('Failed to reply: ' + err.message);
  }
};

module.exports = { sendDocument, getSentById, getSentByIdWithChain, replyDocument };
