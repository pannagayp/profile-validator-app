
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

export type GmailMessage = {
    id: string;
    subject: string;
    from: string;
    snippet: string;
    date: string;
}

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

export async function getRecentEmails(count = 5): Promise<GmailMessage[]> {
    if (!gapi || !gapi.client) {
        throw new Error("GAPI client not loaded.");
    }

    try {
        const response = await gapi.client.gmail.users.messages.list({
            'userId': 'me',
            'maxResults': count
        });

        const messages = response.result.messages || [];
        if (messages.length === 0) {
            return [];
        }

        const batch = gapi.client.newBatch();
        for (const message of messages) {
            if (message.id) {
                batch.add(gapi.client.gmail.users.messages.get({
                    'userId': 'me',
                    'id': message.id,
                    'format': 'metadata',
                    'metadataHeaders': ['Subject', 'From', 'Date']
                }));
            }
        }

        const batchResponse = await batch;
        const emailList: GmailMessage[] = [];

        for (const messageId in batchResponse.result) {
            const res = batchResponse.result[messageId];
            const emailData = res.result;
            const headers = emailData.payload?.headers || [];
            
            const getHeader = (name: string) => headers.find(h => h.name === name)?.value || '';
            
            emailList.push({
                id: emailData.id,
                subject: getHeader('Subject'),
                from: getHeader('From').replace(/<.*>/, '').trim(),
                snippet: emailData.snippet || '',
                date: getHeader('Date')
            });
        }
        
        return emailList;

    } catch (err: any) {
        console.error("Error fetching recent emails:", err);
        throw new Error(err.result?.error?.message || "Failed to fetch recent emails from Gmail.");
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

function initializeGisClient(authCallback: () => void): Promise<void> {
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
                                return;
                            }
                            if (gapi && gapi.client) {
                                gapi.client.setToken({ access_token: resp.access_token });
                            }
                            console.log("Authentication successful and token set.");
                            authCallback();
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

export async function initialize(authCallback: () => void) {
    if (gapiInited && gisInited) {
        return;
    }
    await Promise.all([initializeGapiClient(), initializeGisClient(authCallback)]);
}

export function handleSignIn() {
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        console.error("Token client is not ready. GIS might not have been initialized correctly.");
    }
}
