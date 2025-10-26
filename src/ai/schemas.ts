import { z } from 'genkit';

/**
 * @fileOverview Shared schemas and types for AI flows.
 * This file does not contain 'use server' and can be imported by both client and server components.
 */

export const ExtractedContactInfoOutputSchema = z.object({
  name: z.string().nullish().describe('The full name of the contact.'),
  company: z.string().nullish().describe('The company the contact works for.'),
  designation: z.string().nullish().describe('The job title or designation of the contact.'),
  phone: z.string().nullish().describe('The phone number of the contact.'),
  linkedin: z.string().url().nullish().describe('The LinkedIn profile URL of the contact.'),
});

export type ExtractedContactInfo = z.infer<typeof ExtractedContactInfoOutputSchema>;
