
'use server';
/**
 * @fileOverview A flow to validate a profile against LinkedIn.
 *
 * - validateLinkedInProfile - A function that takes user details and checks them against a mock LinkedIn API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { initializeFirebase } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { addDocument } from '@/firebase/server/db';

// Input schema for the LinkedIn validation flow
const LinkedInValidationInputSchema = z.object({
  name: z.string().describe('The full name of the user.'),
  email: z.string().email().describe('The email of the user.'),
  company: z.string().describe('The company the user claims to work for.'),
  profileId: z.string().describe('The ID of the original extracted profile document.'),
});
type LinkedInValidationInput = z.infer<typeof LinkedInValidationInputSchema>;

// Output schema for the LinkedIn validation flow
const LinkedInValidationOutputSchema = z.object({
  status: z.enum(['verified', 'company_mismatch', 'profile_not_found', 'api_limit_reached', 'error']),
  message: z.string(),
  linkedInProfileUrl: z.string().url().optional(),
});
export type LinkedInValidationOutput = z.infer<typeof LinkedInValidationOutputSchema>;


/**
 * MOCK LinkedIn API Client
 * In a real application, this would be a client for a service like Nubela or People Data Labs.
 * You would use process.env.LINKEDIN_API_KEY here.
 */
async function mockLinkedInSearch(email: string, name: string): Promise<{ profileUrl: string; company: string } | null> {
    console.log(`[Mock LinkedIn API] Searching for profile with email: ${email} and name: ${name}`);
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

    // Simulate a successful find
    const mockCompany = name.split(' ')[0] + 'Corp'; // e.g., "John Doe" -> "JohnCorp"
    const mockProfileUrl = `https://www.linkedin.com/in/${name.toLowerCase().replace(' ', '-')}`;
    
    console.log(`[Mock LinkedIn API] Found profile: ${mockProfileUrl} at ${mockCompany}`);
    return {
        profileUrl: mockProfileUrl,
        company: mockCompany,
    };
}


export async function validateLinkedInProfile(input: LinkedInValidationInput): Promise<LinkedInValidationOutput> {
  return await validateLinkedInProfileFlow(input);
}


const validateLinkedInProfileFlow = ai.defineFlow(
  {
    name: 'validateLinkedInProfileFlow',
    inputSchema: LinkedInValidationInputSchema,
    outputSchema: LinkedInValidationOutputSchema,
  },
  async ({ name, email, company, profileId }) => {
    
    let result: LinkedInValidationOutput;

    try {
        const linkedInProfile = await mockLinkedInSearch(email, name);

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
                    message: `Company mismatch. Email: ${company}, LinkedIn: ${linkedInProfile.company}.`,
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
    
    // Store the validation result in Firestore
    try {
        const { firestore } = initializeFirebase();
        const linkedinVerificationsCol = collection(firestore, 'linkedin-verifications');

        const verificationData = {
            extractedProfileId: profileId,
            name,
            email,
            inputCompany: company,
            validationStatus: result.status,
            validationMessage: result.message,
            foundLinkedInUrl: result.linkedInProfileUrl || null,
            timestamp: serverTimestamp(),
        };

        await addDocument(linkedinVerificationsCol, verificationData);
        console.log(`Stored LinkedIn validation result for profile ID: ${profileId}`);

    } catch (dbError: any) {
        console.error(`Failed to store LinkedIn validation result in Firestore: ${dbError.message}`);
        // Do not overwrite the original result, but log the DB error.
    }

    // Return the final validation status
    return result;
  }
);
