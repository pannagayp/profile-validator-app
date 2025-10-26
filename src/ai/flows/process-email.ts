
'use server';

/**
 * @fileoverview A flow that takes an email body, extracts contact info,
 * saves it to a database, and triggers verification.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { extractContactInfo } from './extract-contact-info';
import { initializeFirebase } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { addDocument } from '@/firebase/server/db';
import { verifyExtractedProfile } from './verify-profile';
import { ExtractedContactInfo, ExtractedContactInfoOutputSchema } from '@/ai/schemas';

const ProcessEmailInputSchema = z.object({
  emailBody: z.string().describe('The full text content of an email.'),
  senderEmail: z.string().email().describe('The email address of the sender.')
});

export const processEmailFlow = ai.defineFlow(
  {
    name: 'processEmailFlow',
    inputSchema: ProcessEmailInputSchema,
    outputSchema: ExtractedContactInfoOutputSchema,
  },
  async ({ emailBody, senderEmail }) => {
    // This flow now only does extraction, not saving.
    const extractedInfo = await extractContactInfo({ emailBody });
    return extractedInfo;
  }
);
