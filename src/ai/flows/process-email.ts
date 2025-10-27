
'use server';

import { ai } from '@/ai/genkit';
import { ExtractedContactInfoSchema } from '@/ai/schemas';
import { z } from 'genkit';

const ProcessEmailInputSchema = z.object({
  rawContent: z.string().describe("The raw text content extracted from an email or a document."),
});

const extractContentPrompt = ai.definePrompt({
  name: 'extractContentPrompt',
  input: {
    schema: ProcessEmailInputSchema,
  },
  output: {
    schema: ExtractedContactInfoSchema,
  },
  prompt: `You are an expert data-entry specialist. Your job is to process the following text content. Take the text and return it exactly as is inside the 'rawContent' field of your response.

Content to process:
---
{{rawContent}}
---`,
  config: {
    temperature: 0.0,
  },
});

export const processEmailFlow = ai.defineFlow(
  {
    name: 'processEmailFlow',
    inputSchema: ProcessEmailInputSchema,
    outputSchema: ExtractedContactInfoSchema,
  },
  async (input) => {
    if (!input.rawContent || input.rawContent.trim() === '') {
      return { rawContent: 'No content provided.' };
    }
    
    try {
      const llmResponse = await extractContentPrompt(input);
      const output = llmResponse.output;

      if (output) {
        return output;
      }
      
      return { rawContent: 'Failed to get a valid response from the model.' };
    } catch (e: any) {
      console.error(`Error processing email content: ${e.message}`);
      return { rawContent: `Failed to process content. Error: ${e.message}` };
    }
  }
);
