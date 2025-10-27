
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { collection, query, where, getDocs, getFirestore } from 'firebase/firestore';
import { processEmailFlow } from '@/ai/flows/process-email';
import { ExtractedContactInfo } from '@/ai/schemas';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';

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

        const extractedData = await processEmailFlow({ 
            attachmentData,
            mimeType,
        });

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
