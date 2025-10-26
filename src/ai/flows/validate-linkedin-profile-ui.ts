
'use server';
/**
 * @fileOverview A flow to validate a profile against LinkedIn, designed for UI interaction.
 * This flow does NOT write to Firestore.
 *
 * - validateLinkedInProfileForUi - A function that takes user details and checks them against a mock LinkedIn API.
 */

import { ai } from '@/ai/genkit';
import { LinkedInValidationInputSchema, LinkedInValidationOutputSchema, type LinkedInValidationInput, type LinkedInValidationOutput } from '@/ai/schemas';
import { ApifyClient } from 'apify-client';


/**
 * Apify LinkedIn Search Function
 * ===================================================================================
 *  This function now attempts a real API call to Apify.
 * ===================================================================================
 */
async function searchApifyLinkedIn(linkedinUrl: string, companyName: string): Promise<{ profileUrl: string; company: string } | null> {
    console.log(`[Apify Search] Attempting to find profile for: ${linkedinUrl}`);
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
        throw new Error("APIFY_API_TOKEN is not set in the .env file.");
    }

    const client = new ApifyClient({ token: apifyToken });
    const ACTOR_ID = "apimaestro/linkedin-profile-batch-scraper-no-cookies-required";

    // Prepare the Actor input.
    const actorInput = {
        "profileUrls": [linkedinUrl]
    };

    console.log(`Starting Apify actor '${ACTOR_ID}' with input:`, actorInput);

    // Run the Actor and wait for it to finish.
    const run = await client.actor(ACTOR_ID).call(actorInput);

    console.log(`Apify actor run finished with ID: ${run.id}. Status: ${run.status}. Fetching results...`);

    // Fetch the results from the Actor's dataset.
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Log the raw items for debugging purposes
    console.log(`Apify returned ${items.length} items.`);
    if (items.length > 0) {
      console.log('First item from Apify:', JSON.stringify(items[0], null, 2));
    }

    // Process the results to find the best match.
    if (items && items.length > 0) {
        // The structure of `items[0]` depends entirely on the Actor's output.
        // You will need to inspect the 'Output' or 'Dataset' tab on the Actor's page in Apify.
        const firstResult: any = items[0];

        // This is a guess for the output fields. You will likely need to change these.
        const profileUrl = firstResult.linkedinUrl || firstResult.url;
        // Company is often nested in the most recent experience
        const company = firstResult.company || (firstResult.experience && firstResult.experience.length > 0 && firstResult.experience[0]?.company);

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


export async function validateLinkedInProfileForUi(input: LinkedInValidationInput): Promise<LinkedInValidationOutput> {
  return await validateLinkedInProfileFlow(input);
}


const validateLinkedInProfileFlow = ai.defineFlow(
  {
    name: 'validateLinkedInProfileUiFlow',
    inputSchema: LinkedInValidationInputSchema,
    outputSchema: LinkedInValidationOutputSchema,
  },
  async ({ linkedinUrl, company }) => {
    
    let result: LinkedInValidationOutput;

    try {
        // We now call the function intended for Apify.
        const linkedInProfile = await searchApifyLinkedIn(linkedinUrl, company);

        if (!linkedInProfile) {
            result = { status: 'profile_not_found', message: `No LinkedIn profile found for ${linkedinUrl}.` };
        } else {
            // Compare company names (case-insensitive)
            if (linkedInProfile.company.toLowerCase().includes(company.toLowerCase())) {
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
    
    // Return the final validation status without writing to DB
    return result;
  }
);
