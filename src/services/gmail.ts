
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
            // This now happens in the gisInitialized callback after the user clicks sign in.
            // It's better to request the token upon user action.
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
                    // Do not throw here as it can be an unhandled promise rejection
                    // Let the UI handle the error state if needed.
                    return;
                }
                 // On successful token, we can now use the GAPI client.
                 console.log("Authentication successful.");
            },
        });
        gisInited = true;
        // Now that GIS is initialized, we can prompt for login if gapi is also ready.
        // This is typically triggered by user interaction (handleSignIn)
    } else {
        console.error('Google Identity Services not initialized');
    }
}

function loadScript(src: string, onLoad: () => void) {
    if (document.querySelector(`script[src="${src}"]`)) {
        onLoad();
        return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = onLoad;
    document.body.appendChild(script);
}

// Kicks off the sign-in and authorization process.
export function handleSignIn() {
    loadScript('https://apis.google.com/js/api.js', () => {
        gapi.load('client', gapiLoaded);
    });

    loadScript('https://accounts.google.com/gsi/client', () => {
        gisInitalized();
        // The real token request is triggered here, after initialization
        // and upon user's click.
        if (tokenClient) {
            // Prompt the user to select an account and grant access.
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            console.error("Token client is not ready. GIS might not have been initialized correctly.");
        }
    });
}
