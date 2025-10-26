
'use server';
/**
 * @fileOverview A flow to extract contact information from an email body.
 *
 * - extractContactInfo - A function that takes an email body and extracts contact details.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';

const ExtractContactInfoInputSchema = z.object({
  emailBody: z.string().describe('The full text content of an email.'),
});

const ExtractedContactInfoOutputSchema = z.object({
  name: z.string().nullish().describe('The full name of the contact.'),
  company: z.string().nullish().describe('The company the contact works for.'),
  designation: z.string().nullish().describe('The job title or designation of the contact.'),
  phone: z.string().nullish().describe('The phone number of the contact.'),
  linkedin: z.string().url().nullish().describe('The LinkedIn profile URL of the contact.'),
});

export type ExtractedContactInfo = z.infer<typeof ExtractedContactInfoOutputSchema>;

export async function extractContactInfo(input: { emailBody: string }): Promise<ExtractedContactInfo> {
  return extractContactInfoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractContactInfoPrompt',
  model: googleAI.model('gemini-1.5-flash-latest'),
  input: { schema: ExtractContactInfoInputSchema },
  output: { schema: ExtractedContactInfoOutputSchema },
  prompt: `You are an expert at extracting structured contact information from unstructured email text.
From the email body provided, extract the following details for the person who sent the email or is the main subject of the email signature:
- Full Name
- Company
- Designation (Job Title)
- Phone Number
- LinkedIn Profile URL

If a piece of information is not present, leave it null. Do not guess or make up information.

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
    const { output } = await prompt(input);
    return output!;
  }
);
