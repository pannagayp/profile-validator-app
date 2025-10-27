
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { collection, query, where, getDocs, getFirestore } from 'firebase/firestore';
import { processEmailFlow } from '@/ai/flows/process-email';
import { ExtractedContactInfo } from '@/ai/schemas';

// We need a library to parse DOCX and XLSX files.
// ApifyClient is a good choice as it can handle various file types.
import { ApifyClient } from 'apify-client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';

const processEmailSchema = z.object({
    senderEmail: z.string().email(),
    attachmentId: z.string().optional(),
    attachmentData: z.string().optional(), // Base64 encoded attachment data
    mimeType: z.string().optional(),
});

type ProcessEmailInput = z.infer<typeof processEmailSchema>;


// Server-side Firebase initialization
function initializeFirebaseOnServer() {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

function getSdks(firebaseApp: FirebaseApp) {
  return {
    firestore: getFirestore(firebaseApp),
  };
}

// Helper function to decode and parse file content
async function extractTextFromAttachment(base64Data: string, mimeType: string): Promise<string> {
    // ApifyClient requires an API token.
    // We should ensure this is set in environment variables.
    if (!process.env.APIFY_TOKEN) {
        console.warn("APIFY_TOKEN is not set. File parsing will be skipped.");
        return "File parsing skipped: APIFY_TOKEN not configured.";
    }
    const apifyClient = new ApifyClient({ token: process.env.APIFY_TOKEN });

    // The 'unofficial/document-parser' actor can parse various document types.
    const run = await apifyClient.actor('unofficial/document-parser').call({
        documents: [
            {
                url: `data:${mimeType};base64,${base64Data}`,
            },
        ],
    });

    const { output } = await apifyClient.run(run.id).waitForFinish();
    
    if (output && output.body && Array.isArray(output.body) && output.body.length > 0) {
        // The actor returns an array of parsed documents. We only sent one.
        const parsedDoc = output.body[0];
        if (parsedDoc.error) {
            return `Error parsing document: ${parsedDoc.error}`;
        }
        return parsedDoc.content || "No content extracted.";
    }
    
    return "Could not parse document.";
}


export async function processSingleEmail(input: ProcessEmailInput): Promise<{ success: boolean; data?: ExtractedContactInfo; error?: string }> {
    const app = initializeFirebaseOnServer();
    const { firestore } = getSdks(app);
    const parsedInput = processEmailSchema.safeParse(input);

    if (!parsedInput.success) {
        return { success: false, error: "Invalid input provided." };
    }

    const { senderEmail, attachmentData, mimeType } = parsedInput.data;

    try {
        const clientsRef = collection(firestore, 'client');
        const q = query(clientsRef, where('email', '==', senderEmail));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, error: 'Sender is not registered in the database.' };
        }
        
        if (!attachmentData || !mimeType) {
            return { success: false, error: 'No attachment provided for processing.' };
        }

        const rawContent = await extractTextFromAttachment(attachmentData, mimeType);
        
        if (rawContent.startsWith("Error") || rawContent.startsWith("File parsing skipped")) {
            return { success: false, error: rawContent };
        }

        const extractedData = await processEmailFlow({ 
            rawContent: rawContent
        });

        if (!extractedData) {
            return { success: false, error: "Could not extract any contact information from the attachment." };
        }
        
        revalidatePath('/');
        return { success: true, data: extractedData };

    } catch (e: any) {
        console.error("Error processing email action:", e);
        if (e.code && e.code.startsWith('permission-denied')) {
            return { success: false, error: "Database permission error. Check your Firestore rules."}
        }
        return { success: false, error: e.message || "An unexpected error occurred while processing the email." };
    }
}
