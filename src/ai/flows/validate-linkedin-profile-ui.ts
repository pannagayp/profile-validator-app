
'use server';
/**
 * @fileOverview A flow to validate a profile against LinkedIn, designed for UI interaction.
 * This flow does NOT write to Firestore and returns the raw API response for debugging.
 *
 * - validateLinkedInProfileForUi - A function that takes user details and checks them against the Apify LinkedIn Actor.
 */

import { ai } from '@/ai/genkit';
import { LinkedInValidationInputSchema, LinkedInValidationOutputSchema, type LinkedInValidationInput, type LinkedInValidationOutput } from '@/ai/schemas';
import { ApifyClient } from 'apify-client';

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


export async function validateLinkedInProfileForUi(input: LinkedInValidationInput): Promise<LinkedInValidationOutput> {
  return await validateLinkedInProfileFlow(input);
}


const validateLinkedInProfileFlow = ai.defineFlow(
  {
    name: 'validateLinkedInProfileUiFlow',
    inputSchema: LinkedInValidationInputSchema,
    outputSchema: LinkedInValidationOutputSchema,
  },
  async ({ linkedinUrl }) => {
    
    try {
        const apifyResult = await searchApifyLinkedIn(linkedinUrl);

        if (!apifyResult || apifyResult.length === 0) {
           return { error: `No data returned from Apify for ${linkedinUrl}. The actor may have failed or the profile is private.` };
        }
        
        // Return the raw result for debugging
        return apifyResult;

    } catch (e: any) {
        const errorMessage = `An unexpected error occurred: ${e.message}`;
        console.error("Error during LinkedIn validation:", e);
        return { error: errorMessage };
    }
  }
);
