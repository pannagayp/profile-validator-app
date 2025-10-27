
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
    
    const models = [
      'models/gemini-1.5-pro',
      'models/gemini-1.5-flash',
      'models/gemini-1.0-pro'
    ];

    for (const modelName of models) {
        try {
            const llmResponse = await ai.generate({
                prompt: `You are an expert data-entry specialist. Your job is to extract all readable text, tables, and key information from the uploaded file content. The content is provided as a data URI. Return the full, verbatim text content you extract.

Content to process: {{media url=${input.dataUri}}}`,
                model: modelName,
                output: {
                    schema: ExtractedContactInfoSchema,
                },
            });

            const output = llmResponse.output();
            if (output) {
                return output;
            }
        } catch (e: any) {
            if (e.message.includes('NOT_FOUND') || e.message.includes('not found')) {
                console.warn(`Model '${modelName}' not found, trying next model.`);
            } else {
                // For other errors, rethrow them.
                throw e;
            }
        }
    }
    
    // If all models fail, return a failure message.
    return { rawContent: 'Failed to process content with all available models.' };
  }
);
