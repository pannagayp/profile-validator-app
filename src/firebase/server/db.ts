
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { processEmailFlow } from '@/ai/flows/process-email';
import { ExtractedContactInfo, LinkedInValidationInputSchema, type LinkedInValidationOutput } from '@/ai/schemas';

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
    const extractedData = await processEmailFlow({ 
        emailBody: parsedInput.data.emailBody
    });

    const hasExtractedData = Object.values(extractedData).some(value => value !== null && value !== undefined);

    if (!hasExtractedData) {
      return { success: false, error: "Could not extract any contact information from the email." };
    }

    revalidatePath('/');
    return { success: true, data: extractedData };

  } catch (e: any) {
    console.error("Error processing email action:", e);
    return { success: false, error: e.message || "An unexpected error occurred while processing the email." };
  }
}
