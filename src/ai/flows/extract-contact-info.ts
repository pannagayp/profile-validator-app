'use server';
/**
 * @fileOverview A flow to extract contact information from raw emails.
 *
 * - extractContactInfo - A function that reads emails from Firestore, extracts data, and writes to a new collection.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

export async function extractContactInfo(): Promise<void> {
  await extractContactInfoFlow();
}

const extractContactInfoFlow = ai.defineFlow(
  {
    name: 'extractContactInfoFlow',
    inputSchema: z.void(),
    outputSchema: z.void(),
  },
  async () => {
    const { firestore } = initializeFirebase();
    const rawEmailsCol = collection(firestore, 'raw-emails-test');
    const extractedProfilesCol = collection(firestore, 'extracted-profiles-test');

    const emailSnapshot = await getDocs(rawEmailsCol);

    for (const doc of emailSnapshot.docs) {
      const emailData = doc.data();
      const rawText = emailData.emailBody;

      const nameRegex = /Name:\s*(.*)/;
      const emailRegex = /Email:\s*(.*)/;
      const companyRegex = /Company:\s*(.*)/;
      const linkedinRegex = /LinkedIn:\s*(.*)/;

      const nameMatch = rawText.match(nameRegex);
      const emailMatch = rawText.match(emailRegex);
      const companyMatch = rawText.match(companyRegex);
      const linkedinMatch = rawText.match(linkedinRegex);

      const name = nameMatch ? nameMatch[1].trim() : null;
      const email = emailMatch ? emailMatch[1].trim() : null;
      const company = companyMatch ? companyMatch[1].trim() : null;
      const linkedin = linkedinMatch ? linkedinMatch[1].trim() : null;

      const isComplete = name && email && company && linkedin;

      const extractedData = {
        name,
        email,
        company,
        linkedin,
        extraction_status: isComplete ? 'complete' : 'partial',
        createdAt: serverTimestamp(),
        ...(isComplete ? {} : { raw_text: rawText }),
      };

      await addDoc(extractedProfilesCol, extractedData);
    }
  }
);
