
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { collection, query, where, getDocs, getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

// Schema for processing an email, prioritizing attachment over body
const processEmailSchema = z.object({
    senderEmail: z.string().email(),
    dataUri: z.string(),
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

async function extractTextFromDataUri(dataUri: string): Promise<string> {
    const [header, base64Data] = dataUri.split(',');
    if (!header || !base64Data) {
        throw new Error('Invalid Data URI');
    }

    const mimeTypeMatch = header.match(/data:(.*?);/);
    if (!mimeTypeMatch) {
        throw new Error('Could not determine MIME type from Data URI');
    }
    const mimeType = mimeTypeMatch[1];
    const buffer = Buffer.from(base64Data, 'base64');

    if (mimeType === 'application/pdf') {
        const data = await pdf(buffer);
        return data.text;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const { value } = await mammoth.extractRawText({ buffer });
        return value;
    } else if (mimeType.startsWith('text/')) {
        return buffer.toString('utf-8');
    } else {
        throw new Error(`Unsupported MIME type for extraction: ${mimeType}`);
    }
}

export async function processSingleEmail(input: ProcessEmailInput): Promise<{ success: boolean; data?: { rawContent: string }; error?: string }> {
    const app = initializeFirebaseOnServer();
    const { firestore } = getSdks(app);
    const parsedInput = processEmailSchema.safeParse(input);

    if (!parsedInput.success) {
        return { success: false, error: "Invalid input provided." };
    }

    const { senderEmail, dataUri } = parsedInput.data;

    try {
        const clientsRef = collection(firestore, 'client');
        const q = query(clientsRef, where('email', '==', senderEmail));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, error: 'Sender is not registered in the database.' };
        }
        
        // Handle empty or malformed data URI before extraction
        if (!dataUri.includes(',')) {
            revalidatePath('/');
            return { success: true, data: { rawContent: 'No content provided.' } };
        }

        const rawContent = await extractTextFromDataUri(dataUri);
        
        revalidatePath('/');
        return { success: true, data: { rawContent } };

    } catch (e: any) {
        console.error("Error processing email action:", e);
        if (e && typeof e.code === 'string' && e.code.startsWith('permission-denied')) {
            return { success: false, error: "Database permission error. Check your Firestore rules."}
        }
        return { success: false, error: e.message || "An unexpected error occurred while processing the email." };
    }
}
