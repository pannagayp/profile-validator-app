export interface Message {
  id: string;
  threadId: string;
  snippet: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  timestamp: string;
}

export interface Attachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}
