
'use server';

/**
 * @fileoverview A flow that takes an email body and extracts contact info.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { extractContactInfo } from './extract-contact-info';
import { ExtractedContactInfoOutputSchema } from '@/ai/schemas';

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
    // 1. Extract contact information using the regex-based function.
    const extractedInfo = await extractContactInfo({ emailBody });
    
    // 2. Return the extracted data.
    return extractedInfo;
  }
);
