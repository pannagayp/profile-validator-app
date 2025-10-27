
'use server';

import { ai } from '@/ai/genkit';
import { ExtractedContactInfoSchema } from '@/ai/schemas';
import { z } from 'genkit';

const ProcessEmailInputSchema = z.object({
    rawContent: z.string().describe("The full text content extracted from a document like a resume."),
});

export const processEmailFlow = ai.defineFlow(
  {
    name: 'processEmailFlow',
    inputSchema: ProcessEmailInputSchema,
    outputSchema: ExtractedContactInfoSchema,
  },
  async (input) => {
    const prompt = `You are an expert data extractor specializing in parsing resumes and contact documents. Your task is to extract specific information from the provided text content.

    From the parsed text, intelligently identify and extract the following information:
    - First Name
    - Last Name
    - Email Address
    - Contact Number / Phone
    - Years of Experience
    - LinkedIn Profile URL

    Return the output in the specified JSON format. If any field is missing in the file, return it as "null".

    Extracted Text Content:
    ---
    ${input.rawContent}
    ---
    `;

    const { output } = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-1.5-flash',
      output: {
        schema: ExtractedContactInfoSchema,
      },
    });
    
    // Also include the raw content in the final output object.
    return output ? { ...output, rawContent: input.rawContent } : null;
  }
);
