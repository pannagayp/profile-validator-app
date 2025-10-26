
'use server';
/**
 * @fileOverview A flow to validate a profile against LinkedIn, designed for UI interaction.
 * This flow does NOT write to Firestore.
 *
 * - validateLinkedInProfileForUi - A function that takes user details and checks them against a mock LinkedIn API.
 */

import { ai } from '@/ai/genkit';
import { LinkedInValidationInputSchema, LinkedInValidationOutputSchema, type LinkedInValidationInput, type LinkedInValidationOutput } from '@/ai/schemas';


/**
 * MOCK LinkedIn API Client
 * In a real application, this would be a client for a service like Nubela or People Data Labs.
 */
async function mockLinkedInSearch(name: string): Promise<{ profileUrl: string; company: string } | null> {
    console.log(`[Mock LinkedIn API] Searching for profile with name: ${name}`);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

    // Simulate API limit reached
    if (process.env.MOCK_LINKEDIN_API_LIMIT_REACHED === 'true') {
        throw new Error('LinkedIn API limit reached');
    }

    // Simulate "profile not found"
    if (name.toLowerCase().includes('unknown')) {
        console.log('[Mock LinkedIn API] Profile not found.');
        return null;
    }

    // Simulate a successful find with a generic company
    const mockCompany = 'MockTech Inc.';
    
    // Sanitize name for URL: lowercase, replace spaces/special chars with '-', and remove any other invalid characters.
    const sanitizedName = name.trim().toLowerCase().replace(/[\s\r\n\t_'.]+/g, '-').replace(/[^a-z0-9-]/g, '');
    const mockProfileUrl = `https://www.linkedin.com/in/${sanitizedName}`;
    
    console.log(`[Mock LinkedIn API] Found profile: ${mockProfileUrl} at ${mockCompany}`);
    return {
        profileUrl: mockProfileUrl,
        company: mockCompany,
    };
}


export async function validateLinkedInProfileForUi(input: LinkedInValidationInput): Promise<LinkedInValidationOutput> {
  return await validateLinkedInProfileFlow(input);
}


const validateLinkedInProfileFlow = ai.defineFlow(
  {
    name: 'validateLinkedInProfileUiFlow',
    inputSchema: LinkedInValidationInputSchema,
    outputSchema: LinkedInValidationOutputSchema,
  },
  async ({ name, company }) => {
    
    let result: LinkedInValidationOutput;

    try {
        const linkedInProfile = await mockLinkedInSearch(name);

        if (!linkedInProfile) {
            result = { status: 'profile_not_found', message: `No LinkedIn profile found for ${name}.` };
        } else {
            // Compare company names (case-insensitive)
            if (linkedInProfile.company.toLowerCase() === company.toLowerCase()) {
                result = { 
                    status: 'verified', 
                    message: `Company name matched on LinkedIn profile.`,
                    linkedInProfileUrl: linkedInProfile.profileUrl
                };
            } else {
                result = { 
                    status: 'company_mismatch', 
                    message: `Company mismatch. Provided: ${company}, LinkedIn: ${linkedInProfile.company}.`,
                    linkedInProfileUrl: linkedInProfile.profileUrl
                };
            }
        }
    } catch (e: any) {
        if (e.message.includes('LinkedIn API limit reached')) {
             result = { status: 'api_limit_reached', message: e.message };
        } else {
            result = { status: 'error', message: `An unexpected error occurred: ${e.message}` };
        }
        console.error("Error during LinkedIn validation:", e);
    }
    
    // Return the final validation status without writing to DB
    return result;
  }
);
