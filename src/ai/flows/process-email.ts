
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
    // 1. Extract contact information using the regex-based function.
    const extractedInfo = await extractContactInfo({ emailBody });

    // 2. Determine the extraction status.
    const isComplete = !!(extractedInfo.name && extractedInfo.company && extractedInfo.linkedin);
    const extractionStatus = isComplete ? 'complete' : 'partial';

    // 3. Save the extracted profile to Firestore.
    const { firestore } = initializeFirebase();
    const extractedProfilesCol = collection(firestore, 'extracted-profiles-test');
    
    const profileToSave = {
      ...extractedInfo,
      email: extractedInfo.email || senderEmail, // Use sender's email if not found in body
      extraction_status: extractionStatus,
      raw_text: emailBody,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDocument(extractedProfilesCol, profileToSave);

    // 4. Trigger the verification flow for the newly created profile.
    // This runs in the background and does not block the response.
    verifyExtractedProfile({
      id: docRef.id,
      ...profileToSave
    });

    // 5. Return the extracted info to the client.
    return extractedInfo;
  }
);
