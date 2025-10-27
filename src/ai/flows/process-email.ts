
'use server';

import { ai } from '@/ai/genkit';
import { ExtractedContactInfoSchema } from '@/ai/schemas';
import { z } from 'genkit';

const ProcessEmailInputSchema = z.object({
    // The 'dataUri' can be the content of an email body or a file attachment.
    dataUri: z.string().describe("The data URI of the content to process. This could be a text body or a file like a PDF, Word, or Excel document."),
});

// Define the prompt separately using ai.definePrompt for better structure and reliability.
const extractContentPrompt = ai.definePrompt({
    name: 'extractContentPrompt',
    // Specify the model to use directly in the prompt definition.
    model: 'gemini-1.5-pro', 
    input: {
        schema: ProcessEmailInputSchema,
    },
    output: {
        schema: ExtractedContactInfoSchema,
    },
    prompt: `You are an expert data-entry specialist. Your job is to extract all readable text, tables, and key information from the uploaded file content. The content is provided as a data URI. Return the full, verbatim text content you extract.

Content to process: {{media url=dataUri}}`,
    config: {
        temperature: 0.1,
    }
});


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
    
    try {
        // Directly invoke the defined prompt with the input.
        const llmResponse = await extractContentPrompt(input);
        
        // The output of the prompt is already in the correct schema.
        const output = llmResponse.output;

        if (output) {
            return output;
        }
        
        // This should not be reached if the prompt is successful, but it's good practice.
        return { rawContent: 'Failed to get a valid response from the model.' };

    } catch (e: any) {
        console.error(`Error processing email content: ${e.message}`);
        // Return a more informative error if the model fails.
        return { rawContent: `Failed to process content. Error: ${e.message}` };
    }
  }
);
