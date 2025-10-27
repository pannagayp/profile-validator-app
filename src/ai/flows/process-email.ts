
'use server';

import { ai } from '@/ai/genkit';
import { ExtractedContactInfoSchema, type ExtractedContactInfo } from '@/ai/schemas';
import { z } from 'genkit';

const ProcessEmailInputSchema = z.object({
    emailBody: z.string().describe("The full text content of an email."),
});

export const processEmailFlow = ai.defineFlow(
  {
    name: 'processEmailFlow',
    inputSchema: ProcessEmailInputSchema,
    outputSchema: ExtractedContactInfoSchema,
  },
  async (input) => {
    const prompt = `You are an expert data extractor. Your task is to extract contact information from the provided email body.

    Email Body:
    ---
    ${input.emailBody}
    ---

    Extract the name, email, company, and LinkedIn profile URL. If any piece of information is not present, return null for that field.`;

    const { output } = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-1.5-flash',
      output: {
        schema: ExtractedContactInfoSchema,
      },
    });

    return output ?? { name: null, email: null, company: null, linkedin: null };
  }
);
