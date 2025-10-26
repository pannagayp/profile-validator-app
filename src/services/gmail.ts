
'use client'

const CLIENT_ID = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID;
const API_KEY = process.env.NEXT_PUBLIC_GMAIL_API_KEY;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let gapiInited = false;
let gisInited = false;

// This function is the main public API for this module.
export async function getLatestEmailBody(fromEmail: string): Promise<string | null> {
    // Ensure GAPI is ready.
    if (!gapi || !gapi.client) {
        throw new Error("GAPI client not loaded.");
    }
    
    try {
        const response = await gapi.client.gmail.users.messages.list({
            'userId': 'me',
            'q': `from:${fromEmail}`,
            'maxResults': 1
        });

        const messages = response.result.messages || [];
        if (messages.length === 0) {
            return null; // No email found
        }
        
        const messageId = messages[0].id;
        if (!messageId) {
            return null;
        }

        const emailResponse = await gapi.client.gmail.users.messages.get({
            'userId': 'me',
            'id': messageId,
            'format': 'full'
        });

        const payload = emailResponse.result.payload;
        if (!payload) return null;

        let emailBody = '';
        if (payload.parts) {
          const part = payload.parts.find(p => p.mimeType === 'text/plain' || p.mimeType === 'text/html');
          if (part && part.body?.data) {
            emailBody = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }
        } else if (payload.body?.data) {
          emailBody = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
        
        // Basic HTML to text conversion
        if (emailBody.includes('<body')) {
            const doc = new DOMParser().parseFromString(emailBody, 'text/html');
            emailBody = doc.body.innerText;
        }

        return emailBody;

    } catch (err: any) {
        console.error("Error fetching email:", err);
        throw new Error(err.result?.error?.message || "Failed to fetch email from Gmail.");
    }
}


function gapiLoaded() {
    gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    }).then(function () {
        gapiInited = true;
        if (gisInited) {
            tokenClient?.requestAccessToken({ prompt: 'consent' });
        }
    }).catch(function(err) {
        console.error('Error initializing GAPI client:', err);
    });
}

function gisInitalized() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (resp) => {
                if (resp.error) {
                    console.error("Token client error:", resp.error);
                    throw (resp);
                }
                // Callback doesn't need to do anything here, access token is now available.
            },
        });
        gisInited = true;
        if (gapiInited) {
            tokenClient?.requestAccessToken({ prompt: 'consent' });
        }
    } else {
        console.error('Google Identity Services not initialized');
    }
}

// Kicks off the sign-in and authorization process.
export function handleSignIn() {
    // Load GAPI script
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => gapi.load('client', gapiLoaded);
    document.body.appendChild(gapiScript);

    // Load GIS script
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = gisInitalized;
    document.body.appendChild(gisScript);
}

    