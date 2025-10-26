
'use server';
/**
 * @fileOverview A flow to extract contact information from an email body.
 *
 * - extractContactInfo - A function that takes an email body and extracts contact details.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';
import { ExtractedContactInfo, ExtractedContactInfoOutputSchema } from '@/ai/schemas';


const ExtractContactInfoInputSchema = z.object({
  emailBody: z.string().describe('The full text content of an email.'),
});

// Define a tool that the AI model can "call" with the extracted information.
const contactInfoTool = ai.defineTool(
  {
    name: 'contactInfoTool',
    description: 'Extracts contact information from an email.',
    inputSchema: ExtractedContactInfoOutputSchema,
    outputSchema: ExtractedContactInfoOutputSchema,
  },
  async (input) => input
);

export async function extractContactInfo(input: { emailBody: string }): Promise<ExtractedContactInfo> {
  return extractContactInfoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractContactInfoPrompt',
  model: googleAI.model('gemini-1.5-flash'),
  tools: [contactInfoTool],
  prompt: `You are an expert at extracting contact information from unstructured email text.
Examine the email body provided. Find the full name, company, designation (job title), phone number, and LinkedIn Profile URL for the person who sent the email or is the main subject of the email signature.
Then, call the contactInfoTool with the information you have found.

If a piece of information is not present, pass null for that field. Do not guess or make up information.

Email Body:
{{{emailBody}}}
`,
});

const extractContactInfoFlow = ai.defineFlow(
  {
    name: 'extractContactInfoFlow',
    inputSchema: ExtractContactInfoInputSchema,
    outputSchema: ExtractedContactInfoOutputSchema,
  },
  async (input) => {
    const llmResponse = await prompt(input);
    const toolRequest = llmResponse.toolRequest();
    
    if (!toolRequest || toolRequest.tool.name !== 'contactInfoTool') {
        // If the model didn't call the tool, return an empty object or handle as an error
        return {
            name: null,
            company: null,
            designation: null,
            phone: null,
            linkedin: null,
        };
    }
    
    // The arguments passed to the tool are the extracted info we need.
    return toolRequest.input;
  }
);
