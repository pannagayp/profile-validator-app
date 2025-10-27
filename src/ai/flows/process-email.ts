'use server';

import { ai } from '@/ai/genkit';
import { ExtractedContactInfoSchema } from '@/ai/schemas';
import { z } from 'genkit';

const ProcessEmailInputSchema = z.object({
    emailBody: z.string().describe("The text content of the email body."),
});

const processEmailPrompt = ai.definePrompt(
    {
        name: 'processEmailPrompt',
        input: { schema: ProcessEmailInputSchema },
        output: { schema: ExtractedContactInfoSchema },
        prompt: `You are an expert data-entry specialist. Your ONLY job is to extract the raw text content from the following email body. Do not summarize, analyze, or alter the content in any way. Return the full, verbatim text content.

Email Body:
{{{emailBody}}}
`,
    },
);

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
    
    const { output } = await processEmailPrompt(input);
    return output || { rawContent: 'Failed to process email content.' };
  }
);
