
'use server';

/**
 * @fileoverview A flow that takes an email body and extracts contact info.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { extractContactInfo } from './extract-contact-info';
import { ExtractedContactInfoOutputSchema } from '@/ai/schemas';
import { initializeFirebase } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { addDocument } from '@/firebase/server/db';
import { verifyExtractedProfile } from './verify-profile';

const ProcessEmailInputSchema = z.object({
  emailBody: z.string().describe('The full text content of an email.'),
});

export const processEmailFlow = ai.defineFlow(
  {
    name: 'processEmailFlow',
    inputSchema: ProcessEmailInputSchema,
    outputSchema: ExtractedContactInfoOutputSchema,
  },
  async ({ emailBody }) => {
    // 1. Save raw email to Firestore
    const { firestore } = initializeFirebase();
    const rawEmailsCol = collection(firestore, 'raw-emails');
    const emailDoc = await addDocument(rawEmailsCol, {
      emailBody,
      timestamp: serverTimestamp(),
    });
    console.log(`Stored raw email with ID: ${emailDoc.id}`);
    
    // 2. Extract contact information using the regex-based function.
    const extractedInfo = await extractContactInfo({ emailBody });
    
    // 3. If information was extracted, save it to Firestore.
    const hasExtractedData = Object.values(extractedInfo).some(value => value !== null && value !== undefined);
    if (hasExtractedData) {
      const extractedProfilesCol = collection(firestore, 'extracted-profiles-test');
      
      const profileData = {
        ...extractedInfo,
        rawEmailId: emailDoc.id,
        extraction_status: extractedInfo.name && extractedInfo.company && extractedInfo.linkedin ? 'complete' : 'partial',
        createdAt: serverTimestamp(),
      };
      
      const profileDoc = await addDocument(extractedProfilesCol, profileData);
      console.log(`Stored extracted profile with ID: ${profileDoc.id}`);

      // 4. Trigger the verification flow asynchronously (don't wait for it to finish)
      if (profileData.name && profileData.company) {
        verifyExtractedProfile({
            id: profileDoc.id,
            name: profileData.name,
            email: profileData.email || undefined,
            company: profileData.company,
            linkedin: profileData.linkedin || undefined,
            extraction_status: profileData.extraction_status as 'complete' | 'partial',
            raw_text: emailBody,
        });
      }
    }

    return extractedInfo;
  }
);
