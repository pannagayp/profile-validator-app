
'use server';

import { z } from 'zod';
import { extractContactInfo } from '@/ai/flows/extract-contact-info';
import { getLatestEmailBody } from '@/services/gmail';

const emailSchema = z.string().email();

type ExtractedInfo = {
  name?: string | null;
  company?: string | null;
  designation?: string | null;
  phone?: string | null;
  linkedin?: string | null;
};

export async function processSingleEmail(email: string): Promise<{ success: boolean; data?: ExtractedInfo; error?: string }> {
  const validation = emailSchema.safeParse(email);
  if (!validation.success) {
    return { success: false, error: "Invalid email address provided." };
  }

  try {
    // This function will need to be called in an environment where the user is authenticated with Google.
    // It will throw an error if the GAPI client isn't ready.
    const emailBody = await getLatestEmailBody(validation.data);

    if (!emailBody) {
      return { success: false, error: `No email found from ${validation.data}.` };
    }

    const extractedData = await extractContactInfo({ emailBody });
    
    return { success: true, data: extractedData };

  } catch (e: any) {
    console.error("Error processing email action:", e);
    return { success: false, error: e.message || "An unexpected error occurred while processing the email." };
  }
}

    