
'use client';

import { google } from 'googleapis';

type GisTokenClient = {
    requestAccessToken: (overrideConfig: { prompt: string }) => void;
};

let tokenClient: GisTokenClient | null = null;

const GAPI_CLIENT_ID = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID || '';
const GAPI_API_KEY = process.env.NEXT_PUBLIC_GMAIL_API_KEY || '';
const GAPI_DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';
const GAPI_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

let gapiLoaded = false;
let gisLoaded = false;

/**
 * Initializes the Google API client and Google Identity Services client.
 * @param onGisLoaded - Callback to run when GIS is loaded and ready.
 * @param onAuthSuccess - Callback to run after a user successfully authenticates.
 */
export function initialize(onGisLoaded: () => void, onAuthSuccess: () => void) {
  if (typeof window === 'undefined') return;

  // Load GAPI script
  const gapiScript = document.createElement('script');
  gapiScript.src = 'https://apis.google.com/js/api.js';
  gapiScript.async = true;
  gapiScript.defer = true;
  gapiScript.onload = () => {
    window.gapi.load('client', initializeGapiClient);
  };
  document.body.appendChild(gapiScript);

  // Load GIS script
  const gisScript = document.createElement('script');
  gisScript.src = 'https://accounts.google.com/gsi/client';
  gisScript.async = true;
  gisScript.defer = true;
  gisScript.onload = () => {
    initializeGisClient(onGisLoaded, onAuthSuccess);
  };
  document.body.appendChild(gisScript);
}

async function initializeGapiClient() {
  try {
    await window.gapi.client.init({
      apiKey: GAPI_API_KEY,
      discoveryDocs: [GAPI_DISCOVERY_DOC],
    });
    gapiLoaded = true;
  } catch (error) {
    console.error('Error initializing GAPI client:', error);
  }
}

function initializeGisClient(onGisLoaded: () => void, onAuthSuccess: () => void) {
  try {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GAPI_CLIENT_ID,
      scope: GAPI_SCOPES,
      callback: (resp: any) => {
        if (resp.error) {
          console.error('GIS Token Client Error:', resp.error);
          throw new Error(resp.error);
        }
        // Set the token for the GAPI client.
        window.gapi.client.setToken({ access_token: resp.access_token });
        // Trigger the success callback to update React state.
        onAuthSuccess();
      },
    });
    gisLoaded = true;
    onGisLoaded();
  } catch (error) {
    console.error('Error initializing GIS client:', error);
  }
}

export function handleSignIn() {
  if (gapiLoaded && gisLoaded && tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    console.error("Token client is not ready. GIS might not have been initialized correctly.");
  }
}

export function handleSignOut() {
  const token = window.gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token, () => {
      console.log('Token revoked');
      window.gapi.client.setToken(null);
      // Reload the page to reset the entire application state
      window.location.reload(); 
    });
  }
}

export function isUserAuthenticated(): boolean {
  if (typeof window === 'undefined' || !window.gapi || !window.gapi.client) {
    return false;
  }
  const token = window.gapi.client.getToken();
  return token !== null && token.access_token !== null;
}

export function isGapiAndGisReady(): boolean {
  return gapiLoaded && gisLoaded;
}

/**
 * Fetches the body of the latest email from a specific sender.
 * @param senderEmail - The email address of the sender.
 * @returns The body of the email as a string, or null if not found.
 */
export async function getLatestEmailBody(senderEmail: string): Promise<string | null> {
  if (!isUserAuthenticated()) {
    throw new Error('User is not authenticated. Please sign in first.');
  }

  try {
    // 1. Search for the latest message from the sender
    const listResponse = await window.gapi.client.gmail.users.messages.list({
      userId: 'me',
      q: `from:${senderEmail}`,
      maxResults: 1,
    });

    const messages = listResponse.result.messages;
    if (!messages || messages.length === 0) {
      console.log(`No emails found from ${senderEmail}`);
      return null;
    }

    const messageId = messages[0].id;

    // 2. Fetch the full message
    const msgResponse = await window.gapi.client.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    // 3. Extract the email body
    const payload = msgResponse.result.payload;
    if (!payload) {
      return null;
    }

    let bodyData = '';
    if (payload.parts) {
      // Look for text/plain first
      let part = payload.parts.find(
        (p: any) => p.mimeType === 'text/plain'
      );
      // If not found, fall back to text/html
      if (!part) {
          part = payload.parts.find(
            (p: any) => p.mimeType === 'text/html'
          );
      }
      if (part && part.body && part.body.data) {
        bodyData = part.body.data;
      }
    } else if (payload.body && payload.body.data) {
      bodyData = payload.body.data;
    }

    if (bodyData) {
      // Decode from base64
      return atob(bodyData.replace(/-/g, '+').replace(/_/g, '/'));
    }

    return null; // No body found
  } catch (error) {
    console.error('Error fetching email body:', error);
    throw new Error('Failed to fetch email from Gmail.');
  }
}

export type RecentEmail = {
  id: string;
  subject: string;
  from: string;
  snippet: string;
};

export async function getRecentEmails(): Promise<RecentEmail[]> {
    if (!isUserAuthenticated()) {
        throw new Error('User is not authenticated.');
    }

    try {
        const response = await window.gapi.client.gmail.users.messages.list({
            userId: 'me',
            maxResults: 5,
        });

        const messages = response.result.messages || [];
        if (messages.length === 0) {
            return [];
        }

        const emailPromises = messages.map(async (message: any) => {
            const msg = await window.gapi.client.gmail.users.messages.get({
                userId: 'me',
                id: message.id,
            });
            const headers = msg.result.payload.headers;
            const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
            const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
            return {
                id: msg.result.id,
                subject,
                from,
                snippet: msg.result.snippet,
            };
        });

        return Promise.all(emailPromises);

    } catch (error) {
        console.error('Error fetching recent emails:', error);
        throw new Error('Failed to fetch recent emails.');
    }
}
    
