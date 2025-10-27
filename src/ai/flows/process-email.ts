
'use server';

import { ai } from '@/ai/genkit';
import { ExtractedContactInfoSchema } from '@/ai/schemas';
import { z } from 'genkit';

const ProcessEmailInputSchema = z.object({
    attachmentData: z.string().describe("The base64 encoded data of the document file."),
    mimeType: z.string().describe("The MIME type of the document file (e.g., 'application/pdf').")
});

export const processEmailFlow = ai.defineFlow(
  {
    name: 'processEmailFlow',
    inputSchema: ProcessEmailInputSchema,
    outputSchema: ExtractedContactInfoSchema,
  },
  async (input) => {

    const model = 'googleai/gemini-1.5-flash';
    const dataUri = `data:${input.mimeType};base64,${input.attachmentData}`;
    
    const prompt = `You are an expert data extractor specializing in parsing resumes and contact documents. Your task is to extract specific information from the provided document.

    From the document, intelligently identify and extract the following information:
    - First Name
    - Last Name
    - Email Address
    - Contact Number / Phone
    - Years of Experience
    - LinkedIn Profile URL

    Return the output in the specified JSON format. If any field is missing in the file, return it as "null".
    `;

    try {
      const { output } = await ai.generate({
        prompt: [
          { text: prompt },
          { media: { url: dataUri } }
        ],
        model: model,
        output: {
          schema: ExtractedContactInfoSchema,
        },
      });
      
      // If output is null or undefined, return a structured object with nulls
      if (!output) {
        return {
          firstName: null,
          lastName: null,
          email: null,
          contactNumber: null,
          experience: null,
          linkedin: null,
          rawContent: null,
        };
      }

      // Also include the raw content in the final output object. For multimodal, we don't have raw text, so we'll leave it null.
      return { ...output, rawContent: null };

    } catch (e) {
      console.error("Error in processEmailFlow:", e);
      // On any error, return the structured object with nulls to prevent crashes
      return {
        firstName: null,
        lastName: null,
        email: null,
        contactNumber: null,
        experience: null,
        linkedin: null,
        rawContent: "Error during extraction.",
      };
    }
  }
);
