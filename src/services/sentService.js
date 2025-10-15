/** ดึง sent ตาม id พร้อม parent และ children (1 ชั้น) */
const getSentWithNeighborsById = async (id) => {
  const base = await prisma.sent.findUnique({
    where: { id: Number(id) },
    include: {
      document: true,
      sender: { select: { id: true, email: true, firstName: true, lastName: true } },
      receiver: { select: { id: true, email: true, firstName: true, lastName: true } },
    }
  });
  if (!base) throw new Error('Sent not found');
  let parent = null;
  if (base.parentSentId) {
    parent = await prisma.sent.findUnique({
      where: { id: base.parentSentId },
      include: {
        document: true,
        sender: { select: { id: true, email: true, firstName: true, lastName: true } },
        receiver: { select: { id: true, email: true, firstName: true, lastName: true } },
      }
    });
  }

  const children = await prisma.sent.findMany({
    where: { parentSentId: base.id },
    include: {
      document: true,
  sender: { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } },
  receiver: { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } },
    },
    orderBy: { sentAt: 'asc' }
  });

  const allDocIds = new Set();
  [base, ...(parent ? [parent] : []), ...children].forEach(n => {
    const ids = (n.documentIds?.length ? n.documentIds : [n.documentId]) || [];
    ids.forEach(v => allDocIds.add(v));
  });
  const docMap = await fetchDocumentsByIds(Array.from(allDocIds));
  const attachDocs = (n) => ({
    ...n,
    documents: (n.documentIds?.length ? n.documentIds : [n.documentId]).map(id => docMap.get(id)).filter(Boolean)
  });

  const hasReplyBase = base ? await hasReplyInThread(base.threadId ?? base.id) : false;
  const hasReplyParent = parent ? await hasReplyInThread(parent.threadId ?? parent.id) : false;
  const childrenWithIsReply = await Promise.all(
    children.map(async (child) => {
      const isReply = await hasReplyInThread(child.threadId ?? child.id);
      return { ...attachDocs(child), isReply };
    })
  );
  return {
    base: base ? { ...attachDocs(base), isReply: hasReplyBase } : null,
    parent: parent ? { ...attachDocs(parent), isReply: hasReplyParent } : null,
    children: childrenWithIsReply
  };
};
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fetchDocumentsByIds(ids = []) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return new Map();
  const docs = await prisma.document.findMany({ where: { id: { in: unique } } });
  async function getFileSize(fileUrl) {
    try {
      const res = await fetch(fileUrl, { method: 'HEAD' });
      const size = res.headers.get('content-length');
      return size ? Number(size) : null;
    } catch {
      return null;
    }
  }

  const docsWithSize = await Promise.all(docs.map(async d => {
    const fileSize = d.fileUrl ? await getFileSize(d.fileUrl) : null;
    return { ...d, fileSize };
  }));
  const map = new Map(docsWithSize.map(d => [d.id, d]));
  return map;
}


const sendDocument = async (data) => {
  try {
    if (data.isForwarded && data.parentSentId) {
      return await prisma.sent.create({
        data: {
          documentId: data.documentId,
          documentIds: data.documentIds ?? [data.documentId], 
          senderId: data.senderId,
          receiverId: data.receiverId,
          number: data.number,
          category: typeof data.category === 'string' ? parseInt(data.category) : data.category,
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
          documentIds: data.documentIds ?? [data.documentId], 
          senderId: data.senderId,
          receiverId: data.receiverId,
          number: data.number,
          category: typeof data.category === 'string' ? parseInt(data.category) : data.category,
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

const getSentById = async (id) => {
  try {
    const record = await prisma.sent.findUnique({
      where: { id: Number(id) },
      include: {
        document: true,
        sender:  { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } },
        receiver:{ select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } },
      }
    });
    if (!record) throw new Error('Sent not found');
    const map = await fetchDocumentsByIds(record.documentIds?.length ? record.documentIds : [record.documentId]);
    const documents = (record.documentIds?.length ? record.documentIds : [record.documentId])
      .map(id => map.get(id))
      .filter(Boolean);
  const isReplyCurrent = await hasReplyInThread(record.threadId ?? record.id);
  const current = { ...record, documents, isReply: isReplyCurrent };
    const children = await prisma.sent.findMany({
      where: { parentSentId: record.id },
      include: {
        document: true,
        sender: { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } },
        receiver: { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } },
      },
      orderBy: { sentAt: 'asc' }
    });
    const allDocIds = new Set();
    children.forEach(n => {
      const ids = (n.documentIds?.length ? n.documentIds : [n.documentId]) || [];
      ids.forEach(v => allDocIds.add(v));
    });
    const docMap = await fetchDocumentsByIds(Array.from(allDocIds));
    const actions = await Promise.all(children.map(async n => ({
      ...n,
      documents: (n.documentIds?.length ? n.documentIds : [n.documentId]).map(id => docMap.get(id)).filter(Boolean),
      isReply: await hasReplyInThread(n.threadId ?? n.id)
    })));
    return { current, actions };
  } catch (err) {
    throw new Error('Failed to fetch sent: ' + err.message);
  }
};

const hasReplyInThread = async (rootThreadId) => {
  const count = await prisma.sent.count({
    where: { threadId: rootThreadId, parentSentId: { not: null }, isForwarded: false }
  });
  return count > 0;
};

const getSentByIdWithChain = async (id) => {
  const base = await prisma.sent.findUnique({
    where: { id: Number(id) },
    include: {
      document: true,
  sender: { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } },
  receiver: { select: { id: true, email: true, firstName: true, lastName: true, position: true, profileImage: true } },
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
    forwardsFromThis: fullChainWithDocs.filter(x => x.parentSentId === base.id),
    fullChain: fullChainWithDocs,
    hasReply,
  };
};

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
  hasReplyInThread,
  getSentWithNeighborsById
};