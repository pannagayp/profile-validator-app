'use client'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getSdks } from '@/firebase';

const CLIENT_ID = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID;
const API_KEY = process.env.NEXT_PUBLIC_GMAIL_API_KEY;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;

async function listAndSaveEmails() {
  try {
    const response = await gapi.client.gmail.users.messages.list({
      'userId': 'me',
      'q': 'subject:"Portfolio Submission" in:inbox',
      'maxResults': 5
    });

    const messages = response.result.messages || [];
    const { firestore } = getSdks();
    const rawEmailsCollection = collection(firestore, 'raw-emails-test');

    for (const message of messages) {
      if (message.id) {
        const emailResponse = await gapi.client.gmail.users.messages.get({
          'userId': 'me',
          'id': message.id,
          'format': 'full'
        });

        let emailBody = '';
        const payload = emailResponse.result.payload;

        if (payload?.parts) {
          const part = payload.parts.find(p => p.mimeType === 'text/plain' || p.mimeType === 'text/html');
          if (part && part.body?.data) {
            emailBody = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }
        } else if (payload?.body?.data) {
          emailBody = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }

        await addDoc(rawEmailsCollection, {
          emailBody: emailBody,
          timestamp: serverTimestamp(),
        });
      }
    }
  } catch (err: any) {
    console.error(err);
  }
}

function gisLoaded() {
    if (gapi && gapi.client) {
        gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
        }).then(function () {
            if (tokenClient) {
                tokenClient.requestAccessToken({prompt: 'consent'});
            }
        }).catch(function(err) {
            console.error('Error initializing GAPI client:', err);
        });
    } else {
        console.error('GAPI client not loaded');
    }
}

function gisInitalized() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: async (resp) => {
                if (resp.error !== undefined) {
                    throw (resp);
                }
                await listAndSaveEmails();
            },
        });
        gisLoaded();
    } else {
        console.error('Google Identity Services not initialized');
    }
}

export function handleSignIn() {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => gapi.load('client', () => gisInitalized());
    document.body.appendChild(script);

    const script2 = document.createElement('script');
    script2.src = 'https://accounts.google.com/gsi/client';
    script2.async = true;
    script2.defer = true;
    script2.onload = () => gisInitalized();
    document.body.appendChild(script2);
}
