
'use server';

import { ai } from '@/ai/genkit';
import { ExtractedContactInfoSchema } from '@/ai/schemas';
import { z } from 'genkit';

const ProcessEmailInputSchema = z.object({
    // The 'dataUri' can be the content of an email body or a file attachment.
    dataUri: z.string().describe("The data URI of the content to process. This could be a text body or a file like a PDF, Word, or Excel document."),
});

const processEmailPrompt = ai.definePrompt(
    {
        name: 'processEmailPrompt',
        model: 'gemini-1.5-pro',
        input: { schema: ProcessEmailInputSchema },
        output: { schema: ExtractedContactInfoSchema },
        prompt: `You are an expert data-entry specialist. Your job is to extract all readable text, tables, and key information from the uploaded file content. The content is provided as a data URI. Return the full, verbatim text content you extract.

Content to process: {{media url=dataUri}}
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
    // If there's no content, return an empty result.
    if (!input.dataUri) {
      return { rawContent: 'No content provided.' };
    }
    
    const { output } = await processEmailPrompt(input);
    return output || { rawContent: 'Failed to process content.' };
  }
);
