
'use client'

const CLIENT_ID = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID;
const API_KEY = process.env.NEXT_PUBLIC_GMAIL_API_KEY;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let gapiInited = false;
let gisInited = false;
let gapiLoadedPromise: Promise<void> | null = null;
let gisLoadedPromise: Promise<void> | null = null;

// This function is the main public API for this module.
export async function getLatestEmailBody(fromEmail: string): Promise<string | null> {
    await initialize();
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

function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
    });
}


function gapiLoaded() {
    gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    }).then(function () {
        gapiInited = true;
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
                    return;
                }
                 console.log("Authentication successful.");
            },
        });
        gisInited = true;
    } else {
        console.error('Google Identity Services not initialized');
    }
}


function initializeGapiClient(): Promise<void> {
    if (!gapiLoadedPromise) {
        gapiLoadedPromise = new Promise((resolve, reject) => {
            loadScript('https://apis.google.com/js/api.js')
                .then(() => {
                    gapi.load('client', () => {
                        gapi.client.init({
                            apiKey: API_KEY,
                            discoveryDocs: [DISCOVERY_DOC],
                        }).then(() => {
                            gapiInited = true;
                            resolve();
                        }).catch(reject);
                    });
                })
                .catch(reject);
        });
    }
    return gapiLoadedPromise;
}

function initializeGisClient(): Promise<void> {
    if (!gisLoadedPromise) {
        gisLoadedPromise = new Promise((resolve, reject) => {
            loadScript('https://accounts.google.com/gsi/client')
                .then(() => {
                    tokenClient = window.google.accounts.oauth2.initTokenClient({
                        client_id: CLIENT_ID,
                        scope: SCOPES,
                        callback: (resp) => {
                            if (resp.error) {
                                console.error("Token client error:", resp.error);
                            } else {
                                console.log("Authentication successful.");
                            }
                        },
                    });
                    gisInited = true;
                    resolve();
                })
                .catch(reject);
        });
    }
    return gisLoadedPromise;
}

export async function initialize() {
    if (gapiInited && gisInited) {
        return;
    }
    await Promise.all([initializeGapiClient(), initializeGisClient()]);
}

export function handleSignIn() {
    if (tokenClient) {
        // This is the call that opens the popup.
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        // This can happen if the GIS script hasn't loaded when the user clicks.
        // We can try to initialize again, and then prompt the user to click again.
        console.error("Token client is not ready. GIS might not have been initialized correctly.");
        initialize().then(() => {
            if (tokenClient) {
                tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                alert("Gmail connection is not yet ready. Please try again in a moment.");
            }
        });
    }
}

