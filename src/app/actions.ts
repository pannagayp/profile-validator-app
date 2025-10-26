
'use server';

import { z } from 'zod';
import { extractContactInfo } from '@/ai/flows/extract-contact-info';
import { getLatestEmailBody } from '@/services/gmail';
import { summarizeValidationFailures } from '@/ai/flows/summarize-validation-failures';
import { addProfile, getValidationErrors, clearValidationErrors, updateProfileStatus } from '@/lib/db';
import { collection, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';
import { verifyExtractedProfile } from '@/ai/flows/verify-profile';
import { addDocument } from '@/firebase/server/db';

const emailSchema = z.string().email();

type ExtractedInfo = {
  name?: string | null;
  company?: string | null;
  designation?: string | null;
  phone?: string | null;
  linkedin?: string | null;
};

// This action now accepts the email body directly from the client
export async function processSingleEmail(emailBody: string): Promise<{ success: boolean; data?: ExtractedInfo; error?: string }> {
  if (!emailBody) {
    return { success: false, error: "Email body was empty." };
  }

  try {
    // Save the raw email to Firestore for auditing
    const { firestore } = initializeFirebase();
    const rawEmailsCol = collection(firestore, 'raw-emails-test');
    await addDocument(rawEmailsCol, {
        emailBody: emailBody,
        timestamp: serverTimestamp()
    });

    const extractedData = await extractContactInfo({ emailBody });
    
    // Save extracted profile to Firestore
    const extractedProfilesCol = collection(firestore, 'extracted-profiles-test');
    const docRef = await addDocument(extractedProfilesCol, {
        ...extractedData,
        extraction_status: extractedData.name && extractedData.email && extractedData.company ? 'complete' : 'partial',
        raw_text: emailBody,
        createdAt: serverTimestamp()
    });

    if (docRef) {
      // Trigger verification flow asynchronously
      // The schema for verifyExtractedProfile expects an id, which we have from the docRef
      const profileForVerification = { 
        id: docRef.id, 
        ...extractedData, 
        // Ensure status matches the expected enum, defaulting to partial
        extraction_status: (extractedData.name && extractedData.email && extractedData.company ? 'complete' : 'partial') as 'complete' | 'partial',
        raw_text: emailBody
      };
      // We don't await this so it runs in the background
      verifyExtractedProfile(profileForVerification);
    }
    
    revalidatePath('/admin');
    
    return { success: true, data: extractedData };

  } catch (e: any) {
    console.error("Error processing email action:", e);
    return { success: false, error: e.message || "An unexpected error occurred while processing the email." };
  }
}

export async function createProfile(_prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const validation = emailSchema.safeParse(email);

  if (!validation.success) {
    return { type: 'error', message: 'Invalid email address.' };
  }

  try {
    const newProfile = await addProfile(validation.data);
    
    // Simulate validation
    setTimeout(async () => {
      if (validation.data.includes('fail')) {
        await updateProfileStatus(newProfile.id, 'invalid', 'Domain is blocked');
      } else {
        await updateProfileStatus(newProfile.id, 'valid');
      }
      revalidatePath('/'); // Revalidate to show updated status
    }, 3000);

    revalidatePath('/');
    return { type: 'success', message: 'Profile created and validation initiated!' };
  } catch (e) {
    return { type: 'error', message: 'Failed to create profile.' };
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

type ExtractedProfileForApproval = {
  id: string;
  name?: string;
  email?: string;
  company?: string;
  linkedin?: string;
  extraction_status: 'complete' | 'partial';
};

export async function approveProfile(profiles: ExtractedProfileForApproval[]) {
    try {
      const { firestore } = initializeFirebase();
      const verifiedProfilesCol = collection(firestore, 'profiles-verified');

      for (const profile of profiles) {
          const verifiedProfileData = {
              name: profile.name,
              email: profile.email,
              company: profile.company,
              verified: true,
              verification_details: "Manually approved by admin",
              timestamp: serverTimestamp(),
          };
          await addDocument(verifiedProfilesCol, verifiedProfileData);
      }
      
      // In a real app with Firestore, you would also delete the profiles
      // from the 'extracted-profiles-test' collection here.
      // For the mock DB, we can't easily do that without more complex state management.
      
      revalidatePath('/admin');
      return { success: true };
    } catch(e: any) {
        console.error("Error in approveProfile action: ", e);
        return { success: false, error: e.message || 'An unknown error occurred during approval.'}
    }
}
