
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
    
    const prompt = `You are an expert data extractor. Your task is to extract all readable text content from the provided document. Return only the text from the document.`;

    try {
      const { output } = await ai.generate({
        prompt: [
          { text: prompt },
          { media: { url: dataUri } }
        ],
        model: model,
        output: {
          format: 'text',
        },
      });
      
      const rawText = output ?? '';
      
      return { rawContent: rawText };

    } catch (e) {
      console.error("Error in processEmailFlow:", e);
      return {
        rawContent: "Error: Could not extract text from the document.",
      };
    }
  }
);
