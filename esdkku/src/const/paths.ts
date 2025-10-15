export const PATHS = {
    ED: 'ed',
    INBOX: 'inbox',
    DOCUMENT_STATUS: 'document-status',
    SEND_DOCUMENT: 'send-document',
    DOWNLOAD_DOCUMENT: 'download-document',
    SETTING: 'setting',
    MGN_USER: 'mgn-user',
    MGN_DOC: 'mgn-doc',
} 

export const ROLE_HOME_PATH = {
    1: `/${PATHS.ED}/${PATHS.MGN_USER}`, // Admin
    2: `/${PATHS.ED}/${PATHS.DOCUMENT_STATUS}`, // Sender
    3: `/${PATHS.ED}`, // User
}