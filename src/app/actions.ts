
'use server';

import { z } from 'zod';
import { summarizeValidationFailures } from '@/ai/flows/summarize-validation-failures';
import { getValidationErrors, clearValidationErrors } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { processEmailFlow } from '@/ai/flows/process-email';
import { addDocument } from '@/firebase/server/db';
import { collection, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { verifyExtractedProfile } from '@/ai/flows/verify-profile';
import { ExtractedContactInfo } from '@/ai/schemas';


const processEmailSchema = z.object({
    emailBody: z.string(),
    senderEmail: z.string().email(),
})

type ProcessEmailInput = z.infer<typeof processEmailSchema>;

export async function processSingleEmail(input: ProcessEmailInput): Promise<{ success: boolean; data?: ExtractedContactInfo; error?: string }> {
    const parsedInput = processEmailSchema.safeParse(input);

    if (!parsedInput.success) {
        return { success: false, error: "Invalid input provided." };
    }

  try {
    // This server action now simply calls the Genkit flow
    const extractedData = await processEmailFlow({ 
        emailBody: parsedInput.data.emailBody,
        senderEmail: parsedInput.data.senderEmail
    });

    // For now, just return the data to the client without saving to DB
    return { success: true, data: extractedData };

  } catch (e: any) {
    console.error("Error processing email action:", e);
    // The error message might contain instructions for the user (e.g., auth URL)
    return { success: false, error: e.message || "An unexpected error occurred while processing the email." };
  }
}


export async function generateSummaryAndClearErrors() {
  const errors = await getValidationErrors();
  if (errors.length === 0) {
    return { summary: "No errors to summarize." };
  }
  const errorMessages = errors.map(e => `${e.email}: ${e.error}`);
  const result = await summarizeValidationFailures({ validationFailures: errorMessages });
  
  await clearValidationErrors();

  revalidatePath('/admin');
  
  return { summary: result.summary };
}


const ExtractedProfileSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  company: z.string().optional(),
  linkedin: z.string().optional(),
  extraction_status: z.enum(['complete', 'partial']),
});

type ExtractedProfile = z.infer<typeof ExtractedProfileSchema>;

export async function approveProfile(profiles: ExtractedProfile[]): Promise<{ success: boolean, error?: string}> {
  const { firestore } = initializeFirebase();
  const verifiedProfilesCol = collection(firestore, 'profiles-verified');

  try {
    for (const profile of profiles) {
      await addDocument(verifiedProfilesCol, {
        name: profile.name,
        email: profile.email,
        company: profile.company,
        verified: true,
        verification_details: "Manually Approved",
        timestamp: serverTimestamp(),
      });
    }
     revalidatePath('/admin');
    return { success: true };
  } catch (e: any) {
    console.error("Failed to approve profiles", e);
    return { success: false, error: e.message };
  }
}
