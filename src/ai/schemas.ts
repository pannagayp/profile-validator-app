
import { z } from 'genkit';

/**
 * @fileOverview Shared schemas and types for AI flows.
 */

export const ExtractedContactInfoSchema = z.object({
  firstName: z.string().nullable().describe('The first name of the contact.'),
  lastName: z.string().nullable().describe('The last name of the contact.'),
  email: z.string().email().nullable().describe('The email address of the contact.'),
  contactNumber: z.string().nullable().describe('The contact phone number.'),
  experience: z.string().nullable().describe('The years of experience.'),
  linkedin: z.string().url().nullable().describe('The LinkedIn profile URL of the contact.'),
  rawContent: z.string().nullable().describe('The full raw text extracted from the document.'),
});

export type ExtractedContactInfo = z.infer<typeof ExtractedContactInfoSchema>;

export const LinkedInValidationInputSchema = z.object({
    profileUrl: z.string().url(),
    requiredSkills: z.array(z.string()).optional(),
    requiredCompany: z.string().optional(),
});

export const LinkedInValidationOutputSchema = z.object({
    isMatch: z.boolean(),
    reason: z.string(),
    profileName: z.string().optional(),
    profileCompany: z.string().optional(),
    profileSkills: z.array(z.string()).optional(),
});

export type LinkedInValidationOutput = z.infer<typeof LinkedInValidationOutputSchema>;
