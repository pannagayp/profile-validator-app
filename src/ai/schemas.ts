
import { z } from 'genkit';

/**
 * @fileOverview Shared schemas and types for AI flows.
 */

// Simplified schema to just hold the raw text content.
export const ExtractedContactInfoSchema = z.object({
  rawContent: z.string().nullable().describe('The full raw text extracted from the document or email body.'),
  dataUri: z.string().nullable().describe('The data URI of the email body.'),
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
