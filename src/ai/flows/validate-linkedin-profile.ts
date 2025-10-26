
'use server';
/**
 * @fileOverview A flow to validate a profile against LinkedIn.
 * This flow now returns the raw API response for debugging.
 *
 * - validateLinkedInProfile - A function that takes user details and checks them against the Apify LinkedIn Actor.
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
  linkedinUrl: z.string().url().describe('The LinkedIn profile URL.')
});
export type LinkedInValidationInput = z.infer<typeof LinkedInValidationInputSchema>;

// Output schema is now 'any' to allow returning raw API response
const LinkedInValidationOutputSchema = z.any();
export type LinkedInValidationOutput = any;


/**
 * Extracts the username part from a LinkedIn URL.
 * e.g., "https://www.linkedin.com/in/pannaga-y-p-8397072b4/" -> "pannaga-y-p-8397072b4"
 */
function getUsernameFromUrl(url: string): string | null {
    try {
        const path = new URL(url).pathname;
        // Split by '/' and find the part after '/in/'
        const parts = path.split('/');
        const inIndex = parts.indexOf('in');
        if (inIndex !== -1 && parts.length > inIndex + 1 && parts[inIndex + 1]) {
            return parts[inIndex + 1];
        }
        return null;
    } catch (e) {
        console.error("Could not parse LinkedIn URL", e);
        return null;
    }
}

/**
 * Apify LinkedIn Search Function
 * ===================================================================================
 *  This function now attempts a real API call to Apify and returns the raw result.
 * ===================================================================================
 */
async function searchApifyLinkedIn(linkedinUrl: string): Promise<any> {
    console.log(`[Apify Search] Attempting to find profile for: ${linkedinUrl}`);
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
        throw new Error("APIFY_API_TOKEN is not set in the .env file.");
    }
    
    const client = new ApifyClient({ token: apifyToken });
    const ACTOR_ID = "apimaestro/linkedin-profile-batch-scraper-no-cookies-required"; 

    const username = getUsernameFromUrl(linkedinUrl);
    if (!username) {
        throw new Error(`Could not extract a valid username from the LinkedIn URL: ${linkedinUrl}`);
    }

    // Prepare the Actor input based on the provided format.
    const actorInput = {
        "usernames": [username]
    };
    
    console.log(`Starting Apify actor '${ACTOR_ID}' with input:`, JSON.stringify(actorInput));

    // Run the Actor and wait for it to finish.
    const run = await client.actor(ACTOR_ID).call(actorInput);

    console.log(`Apify actor run finished with ID: ${run.id}. Status: ${run.status}. Fetching results...`);
    
    // Fetch the results from the Actor's dataset.
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`Apify returned ${items.length} items.`);
    if (items.length > 0) {
      console.log('First item from Apify:', JSON.stringify(items[0], null, 2));
    }
    
    // Return the raw items array
    return items;
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
  async ({ name, email, company, profileId, linkedinUrl }) => {
    
    let result: LinkedInValidationOutput;

    try {
        const apifyResult = await searchApifyLinkedIn(linkedinUrl);

        if (!apifyResult || apifyResult.length === 0) {
           result = { status: 'profile_not_found', message: `No data returned from Apify for ${linkedinUrl}.` };
        } else {
            // For now, just return the raw data for debugging
            result = apifyResult;
        }

    } catch (e: any) {
        const errorMessage = `An unexpected error occurred: ${e.message}`;
        console.error("Error during LinkedIn validation:", e);
        result = { status: 'error', message: errorMessage };
    }
    
    // Store a simplified validation result in Firestore
    try {
        const { firestore } = initializeFirebase();
        const linkedinVerificationsCol = collection(firestore, 'linkedin-verifications');
        
        // This is a simplified log entry since we aren't parsing the result fully anymore
        const verificationData = {
            extractedProfileId: profileId,
            name,
            email,
            inputCompany: company,
            validationStatus: (result as any)?.status || 'debug',
            validationMessage: (result as any)?.message || 'Raw data returned for debugging.',
            foundLinkedInUrl: linkedinUrl || null,
            timestamp: serverTimestamp(),
        };

        await addDoc(linkedinVerificationsCol, verificationData);
        console.log(`Stored LinkedIn validation (debug) result for profile ID: ${profileId}`);

    } catch (dbError: any) {
        console.error(`Failed to store LinkedIn validation result in Firestore: ${dbError.message}`);
    }

    // Return the final result (raw data or error)
    return result;
  }
);
