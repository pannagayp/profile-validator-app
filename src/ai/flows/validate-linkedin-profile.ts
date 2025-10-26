
'use server';
/**
 * @fileOverview A flow to validate a profile against LinkedIn.
 *
 * - validateLinkedInProfile - A function that takes user details and checks them against a mock LinkedIn API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { initializeFirebase } from '@/firebase';
import { collection, serverTimestamp, addDoc } from 'firebase/firestore';
import { ApifyClient } from 'apify-client';

// Input schema for the LinkedIn validation flow
const LinkedInValidationInputSchema = z.object({
  name: z.string().describe('The full name of the user.'),
  email: z.string().email().describe('The email of the user.'),
  company: z.string().describe('The company the user claims to work for.'),
  profileId: z.string().describe('The ID of the original extracted profile document.'),
});
export type LinkedInValidationInput = z.infer<typeof LinkedInValidationInputSchema>;

// Output schema for the LinkedIn validation flow
const LinkedInValidationOutputSchema = z.object({
  status: z.enum(['verified', 'company_mismatch', 'profile_not_found', 'api_limit_reached', 'error']),
  message: z.string(),
  linkedInProfileUrl: z.string().url().optional(),
});
export type LinkedInValidationOutput = z.infer<typeof LinkedInValidationOutputSchema>;


/**
 * Apify LinkedIn Search Function
 * ===================================================================================
 *  This function now attempts a real API call to Apify.
 * ===================================================================================
 */
async function searchApifyLinkedIn(email: string, name: string): Promise<{ profileUrl: string; company: string } | null> {
    console.log(`[Apify Search] Attempting to find profile for: ${name} (${email})`);
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
        throw new Error("APIFY_API_TOKEN is not set in the .env file.");
    }
    
    const client = new ApifyClient({ token: apifyToken });
    const ACTOR_ID = "apimaestro/linkedin-profile-batch-scraper-no-cookies-required";

    // Prepare the Actor input.
    // NOTE: This input structure is a GUESS. You MUST check the documentation for your Actor.
    const actorInput = {
        "profileUrls": [`https://www.linkedin.com/in/${name.replace(/\s+/g, '-')}`]
    };
    
    console.log(`Starting Apify actor '${ACTOR_ID}' with input:`, actorInput);

    // Run the Actor and wait for it to finish.
    const run = await client.actor(ACTOR_ID).call(actorInput);

    console.log('Apify actor run finished. Fetching results...');
    
    // Fetch the results from the Actor's dataset.
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Process the results to find the best match.
    if (items && items.length > 0) {
        // The structure of `items[0]` depends entirely on the Actor's output.
        // You will need to inspect the 'Output' or 'Dataset' tab on the Actor's page in Apify.
        const firstResult: any = items[0];

        // This is a guess for the output fields. You will likely need to change these.
        const profileUrl = firstResult.linkedinUrl || firstResult.url;
        const company = firstResult.company || (firstResult.experience && firstResult.experience[0]?.company);

        if (!profileUrl || !company) {
            console.warn("Could not extract 'profileUrl' or 'company' from Apify result. Check Actor output schema.", firstResult);
            return null;
        }

        console.log(`[Apify Result] Found profile: ${profileUrl} at ${company}`);
        return {
            profileUrl,
            company,
        };
    } else {
        console.log('Apify actor did not return any items.');
        return null;
    }
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
        // We now call the function intended for Apify.
        const linkedInProfile = await searchApifyLinkedIn(email, name);

        if (!linkedInProfile) {
            result = { status: 'profile_not_found', message: `No LinkedIn profile found for ${name}.` };
        } else {
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
        if (e.message.includes('API limit reached')) {
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

        await addDoc(linkedinVerificationsCol, verificationData);
        console.log(`Stored LinkedIn validation result for profile ID: ${profileId}`);

    } catch (dbError: any) {
        console.error(`Failed to store LinkedIn validation result in Firestore: ${dbError.message}`);
    }

    // Return the final validation status
    return result;
  }
);
