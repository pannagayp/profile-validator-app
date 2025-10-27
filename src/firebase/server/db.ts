
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '..';
import { processEmailFlow } from '@/ai/flows/process-email';
import { ExtractedContactInfo } from '@/ai/schemas';

const processEmailSchema = z.object({
    emailBody: z.string(),
    senderEmail: z.string().email(),
});

type ProcessEmailInput = z.infer<typeof processEmailSchema>;

export async function processSingleEmail(input: ProcessEmailInput): Promise<{ success: boolean; data?: ExtractedContactInfo; error?: string }> {
    const { firestore } = initializeFirebase();
    const parsedInput = processEmailSchema.safeParse(input);

    if (!parsedInput.success) {
        return { success: false, error: "Invalid input provided." };
    }

    const { emailBody, senderEmail } = parsedInput.data;

    try {
        // Step 1: Check if the sender is registered in the database
        const clientsRef = collection(firestore, 'client');
        const q = query(clientsRef, where('email', '==', senderEmail));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, error: 'Sender is not registered in the database.' };
        }

        // Step 2: If sender exists, proceed with AI processing
        const extractedData = await processEmailFlow({ 
            emailBody: emailBody
        });

        const hasExtractedData = Object.values(extractedData).some(value => value !== null && value !== undefined);

        if (!hasExtractedData) {
            return { success: false, error: "Could not extract any contact information from the email." };
        }

        revalidatePath('/');
        return { success: true, data: extractedData };

    } catch (e: any) {
        console.error("Error processing email action:", e);
        // Distinguish between Firestore errors and other errors if necessary
        if (e.code && e.code.startsWith('permission-denied')) {
            return { success: false, error: "Database permission error. Check your Firestore rules."}
        }
        return { success: false, error: e.message || "An unexpected error occurred while processing the email." };
    }
}
