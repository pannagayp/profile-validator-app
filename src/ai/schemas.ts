import { z } from 'genkit';

/**
 * @fileOverview Shared schemas and types for AI flows.
 * This file does not contain 'use server' and can be imported by both client and server components.
 */

// Schema for data extracted from an email
export const ExtractedContactInfoOutputSchema = z.object({
  name: z.string().nullish().describe('The full name of the contact.'),
  company: z.string().nullish().describe('The company the contact works for.'),
  designation: z.string().nullish().describe('The job title or designation of the contact.'),
  phone: z.string().nullish().describe('The phone number of the contact.'),
  linkedin: z.string().url().nullish().describe('The LinkedIn profile URL of the contact.'),
});
export type ExtractedContactInfo = z.infer<typeof ExtractedContactInfoOutputSchema>;


// Input schema for the UI-facing LinkedIn validation flow
export const LinkedInValidationInputSchema = z.object({
  linkedinUrl: z.string().url('Please enter a valid LinkedIn URL.'),
  company: z.string().describe('The company the user claims to work for.'),
});
export type LinkedInValidationInput = z.infer<typeof LinkedInValidationInputSchema>;

// Output schema for the UI-facing LinkedIn validation flow
export const LinkedInValidationOutputSchema = z.object({
  status: z.enum(['verified', 'company_mismatch', 'profile_not_found', 'api_limit_reached', 'error']),
  message: z.string(),
  linkedInProfileUrl: z.string().url().optional(),
});
export type LinkedInValidationOutput = z.infer<typeof LinkedInValidationOutputSchema>;
