
'use client';

import { google } from 'googleapis';
import { Message, Attachment } from '@/lib/types';
import {
  collection,
  getDocs,
  getFirestore,
  query,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { FirestorePermissionError } from '@/firebase/errors';

let gapi: any;
let gis: any;
let tokenClient: any;
let onAuthSuccessCallback: () => void;
let onAuthInitCallback: () => void;
let gapiInitialized = false;

const API_KEY = process.env.NEXT_PUBLIC_GMAIL_API_KEY;
const CLIENT_ID = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

export function initialize(onAuthSuccess: () => void, onAuthInit: () => void) {
  onAuthSuccessCallback = onAuthSuccess;
  onAuthInitCallback = onAuthInit;

  const scriptGapi = document.createElement('script');
  scriptGapi.src = 'https://apis.google.com/js/api.js';
  scriptGapi.async = true;
  scriptGapi.defer = true;
  scriptGapi.onload = gapiLoaded;
  document.body.appendChild(scriptGapi);

  const scriptGis = document.createElement('script');
  scriptGis.src = 'https://accounts.google.com/gsi/client';
  scriptGis.async = true;
  scriptGis.defer = true;
  scriptGis.onload = gisLoaded;
  document.body.appendChild(scriptGis);
}

function gapiLoaded() {
  gapi = (window as any).gapi;
  gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [
      'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
    ],
  });
  gapiInitialized = true;
}

function gisLoaded() {
  gis = (window as any).google.accounts;
  tokenClient = gis.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (tokenResponse: any) => {
      if (tokenResponse && tokenResponse.access_token) {
        gapi.client.setToken(tokenResponse);
        onAuthSuccessCallback();
      }
    },
  });
  onAuthInitCallback();
}

export function handleSignIn() {
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

export function handleSignOut() {
  const token = gapi.client.getToken();
  if (token !== null) {
    gis.oauth2.revoke(token.access_token, () => {
      gapi.client.setToken('');
    });
  }
}

async function waitForGapiInitialized() {
  return new Promise<void>((resolve) => {
    const check = () => {
      if (gapiInitialized) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

export async function listMessages(): Promise<Message[]> {
  await waitForGapiInitialized();
  const response = await gapi.client.gmail.users.messages.list({
    userId: 'me',
    maxResults: 10,
    q: 'is:unread',
  });

  const messages = response.result.messages || [];
  const detailedMessages: Message[] = [];

  for (const message of messages) {
    const msg = await gapi.client.gmail.users.messages.get({
      userId: 'me',
      id: message.id,
    });

    const headers = msg.result.payload.headers;
    const senderHeader = headers.find((h: any) => h.name === 'From');
    const subjectHeader = headers.find((h: any) => h.name === 'Subject');
    const dateHeader = headers.find((h: any) => h.name === 'Date');

    const fromHeader = senderHeader?.value || '';
    const match = fromHeader.match(/<(.*)>/);
    const senderEmail = match ? match[1] : fromHeader;
    const senderName = fromHeader.replace(/<.*>/, '').trim();

    detailedMessages.push({
      id: msg.result.id,
      threadId: msg.result.threadId,
      snippet: msg.result.snippet,
      senderName: senderName,
      senderEmail: senderEmail,
      subject: subjectHeader?.value || 'No Subject',
      timestamp: dateHeader ? new Date(dateHeader.value).toISOString() : new Date().toISOString(),
    });
  }
  return detailedMessages;
}

export async function filterMessagesByRegisteredSenders(
  messages: Message[]
): Promise<Message[]> {
  try {
    const { firestore } = initializeFirebase();
    const clientsRef = collection(firestore, 'client');
    const querySnapshot = await getDocs(clientsRef);
    const registeredEmails = new Set(
      querySnapshot.docs.map((doc) => doc.data().email)
    );

    return messages.filter((message) =>
      registeredEmails.has(message.senderEmail)
    );
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      throw new FirestorePermissionError({
        path: 'client',
        operation: 'list',
      });
    }
    // Re-throw other errors
    throw error;
  }
}

function base64UrlDecode(input: string): string {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  let pad = base64.length % 4;
  if (pad) {
    if (pad === 2) base64 += '==';
    else if (pad === 3) base64 += '=';
  }
  return atob(base64);
}

export async function getLatestEmailBody(
  messageId: string
): Promise<{ body: string; attachments: Attachment[] }> {
  try {
    await waitForGapiInitialized();
    const response = await gapi.client.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
    });

    const payload = response.result.payload;
    let body = '';
    const attachments: Attachment[] = [];

    // This function recursively finds the plain text part.
    function findTextPart(parts: any[]): string {
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          return base64UrlDecode(part.body.data);
        }
        if (part.parts) {
          const result = findTextPart(part.parts);
          if (result) return result;
        }
      }
      return '';
    }

    if (payload.parts) {
      body = findTextPart(payload.parts);
      
      // Also collect attachment info
      for (const part of payload.parts) {
        if (part.filename && part.body && part.body.attachmentId) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size,
            attachmentId: part.body.attachmentId,
          });
        }
      }
    } else if (payload.body && payload.body.data) {
      // This is for simple, non-multipart emails.
      body = base64UrlDecode(payload.body.data);
    }
    
    // If body is still empty, fallback to the snippet.
    if (!body) {
      body = response.result.snippet || '';
    }

    return { body, attachments };
  } catch (error: any) {
    console.error('Error fetching email body:', JSON.stringify(error, null, 2));
    throw new Error('Failed to fetch email body.');
  }
}

export async function getAttachmentData(messageId: string, attachmentId: string): Promise<{ mimeType: string, data: string }> {
    await waitForGapiInitialized();
    const messageResponse = await gapi.client.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
    });

    const payload = messageResponse.result.payload;
    
    function findAttachmentPart(parts: any[], attachmentId: string): any | null {
        if (!parts) return null;
        for (const part of parts) {
            if (part.body?.attachmentId === attachmentId) {
                return part;
            }
            if (part.parts) {
                const found = findAttachmentPart(part.parts, attachmentId);
                if (found) return found;
            }
        }
        return null;
    }
    
    let part = findAttachmentPart(payload.parts, attachmentId);

    if (!part && payload.body?.attachmentId === attachmentId) {
        part = payload;
    }
    
    if (!part) {
        console.warn(`Attachment part with ID "${attachmentId}" not found in message "${messageId}".`);
        // Fallback to a default mime type to avoid crashing, but data will likely be missing.
        return {
            mimeType: 'application/octet-stream',
            data: '' // No data can be retrieved without the attachment part.
        };
    }

    if (!part.mimeType) {
        console.warn('Attachment part found, but it has no mimeType. Using default.');
        part.mimeType = 'application/octet-stream';
    }
    
    const response = await gapi.client.gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: messageId,
      id: attachmentId,
    });

    return {
        mimeType: part.mimeType,
        data: response.result.data.replace(/-/g, '+').replace(/_/g, '/')
    };
}
