'use server';

import { ai } from '@/ai/genkit';
import { ExtractedContactInfoSchema } from '@/ai/schemas';
import { z } from 'genkit';

// The input is now the raw text content of the email body.
const ProcessEmailInputSchema = z.object({
    emailBody: z.string().describe("The text content of the email body."),
});

export const processEmailFlow = ai.defineFlow(
  {
    name: 'processEmailFlow',
    inputSchema: ProcessEmailInputSchema,
    outputSchema: ExtractedContactInfoSchema,
  },
  async (input) => {
    
    // If there's no body, return an empty result.
    if (!input.emailBody) {
      return { rawContent: 'No email body provided.' };
    }

    // The AI's task is now to summarize or process the text.
    // For now, we are just returning the raw text directly.
    // This can be enhanced later with a more sophisticated prompt.
    return { rawContent: input.emailBody };
  }
);
