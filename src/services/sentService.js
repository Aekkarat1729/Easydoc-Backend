// src/services/sentService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/* -------- helpers -------- */
async function fetchDocumentsByIds(ids = []) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return new Map();
  const docs = await prisma.document.findMany({ where: { id: { in: unique } } });
  const map = new Map(docs.map(d => [d.id, d]));
  return map;
}

/* -------- sendDocument (ใช้ตอน forward แบบเดิม) -------- */
const sendDocument = async (data) => {
  try {
    if (data.isForwarded && data.parentSentId) {
      return await prisma.sent.create({
        data: {
          documentId: data.documentId,
          documentIds: data.documentIds ?? [data.documentId], // ✅
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
          documentIds: data.documentIds ?? [data.documentId], // ✅
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

/** ดึงการส่งเอกสารตาม id (รวม document/sender/receiver + documents[] จาก array) */
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

    // แนบเอกสารทั้งหมดจาก documentIds
    const map = await fetchDocumentsByIds(record.documentIds?.length ? record.documentIds : [record.documentId]);
    const documents = (record.documentIds?.length ? record.documentIds : [record.documentId])
      .map(id => map.get(id))
      .filter(Boolean);

    return { ...record, documents };
  } catch (err) {
    throw new Error('Failed to fetch sent: ' + err.message);
  }
};

/** helper: มี reply ใน thread ไหม */
const hasReplyInThread = async (rootThreadId) => {
  const count = await prisma.sent.count({
    where: { threadId: rootThreadId, parentSentId: { not: null }, isForwarded: false }
  });
  return count > 0;
};

/** ดึง sent ตาม id พร้อม chain */
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

  const thread = await prisma.sent.findMany({
    where: { threadId: rootId },
    orderBy: [{ depth: 'asc' }, { sentAt: 'asc' }],
    include: {
      document: true,
      sender: { select: { id: true, email: true, firstName: true, lastName: true } },
      receiver: { select: { id: true, email: true, firstName: true, lastName: true } },
    }
  });

  const withKind = thread.map(x => ({
    ...x,
    kind: x.parentSentId == null ? 'root' : (x.isForwarded ? 'forward' : 'reply'),
  }));

  const byId = new Map(withKind.map(x => [x.id, x]));

  // ancestors
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
      if (node) node = { ...node, kind: node.parentSentId == null ? 'root' : (node.isForwarded ? 'forward' : 'reply') };
    }
    if (!node) break;
    ancestors.push(node);
    parentId = node.parentSentId;
  }

  const baseWithKind = byId.get(base.id) || { ...base, kind: base.parentSentId == null ? 'root' : (base.isForwarded ? 'forward' : 'reply') };
  const pathFromRoot = [...ancestors.reverse(), baseWithKind];

  const childrenMap = new Map();
  for (const node of withKind) {
    if (node.parentSentId == null) continue;
    const arr = childrenMap.get(node.parentSentId) || [];
    arr.push(node);
    childrenMap.set(node.parentSentId, arr);
  }
  for (const arr of childrenMap.values()) arr.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));

  const forwardsFromThis = [];
  (function dfs(pid){ (childrenMap.get(pid) || []).forEach(ch => { forwardsFromThis.push(ch); dfs(ch.id); }); })(base.id);

  const fullChain = [...pathFromRoot, ...forwardsFromThis];

  // ✅ แนบ documents ให้ทุก node จาก documentIds array (batch โหลดครั้งเดียว)
  const allDocIds = new Set();
  for (const n of fullChain) {
    const ids = (n.documentIds?.length ? n.documentIds : [n.documentId]) || [];
    ids.forEach(v => allDocIds.add(v));
  }
  const docMap = await fetchDocumentsByIds(Array.from(allDocIds));
  const attachDocs = (n) => ({
    ...n,
    documents: (n.documentIds?.length ? n.documentIds : [n.documentId]).map(id => docMap.get(id)).filter(Boolean)
  });

  const fullChainWithDocs   = fullChain.map(attachDocs);
  const pathFromRootWithDocs = pathFromRoot.map(attachDocs);
  const baseWithDocs         = attachDocs(baseWithKind);

  const hasReply = fullChainWithDocs.some(x => x.kind === 'reply');

  return {
    rootId,
    threadCount: thread.length,
    base: baseWithDocs,
    pathFromRoot: pathFromRootWithDocs,
    forwardsFromThis: fullChainWithDocs.filter(x => x.parentSentId === base.id), // children of base
    fullChain: fullChainWithDocs,
    hasReply,
  };
};

/** สร้างเรคคอร์ด "ตอบกลับ" */
const replyDocument = async (data) => {
  try {
    return await prisma.sent.create({ data });
  } catch (err) {
    throw new Error('Failed to reply: ' + err.message);
  }
};

module.exports = {
  sendDocument,
  getSentById,
  getSentByIdWithChain,
  replyDocument,
  hasReplyInThread
};
