
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
 * Extracts the username part from a LinkedIn URL.
 * e.g., "https://www.linkedin.com/in/pannaga-y-p-8397072b4/" -> "pannaga-y-p-8397072b4"
 */
function getUsernameFromUrl(url: string): string | null {
    try {
        const path = new URL(url).pathname;
        const parts = path.split('/').filter(p => p && p !== 'in'); // filter out empty strings and 'in'
        if (parts.length > 0) {
            return parts[0];
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

    const username = getUsernameFromUrl(linkedinUrl);
    if (!username) {
        throw new Error(`Could not extract a valid username from the LinkedIn URL: ${linkedinUrl}`);
    }

    // Prepare the Actor input based on the provided format.
    const actorInput = {
        "usernames": [username]
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
        const resultData: any = items[0]; // The output is a single object in the dataset
        const profileData = resultData?.results?.[username];
        
        if (!profileData) {
            console.warn(`[Apify Result] No 'results' found for username '${username}' in the returned data.`);
            return null;
        }

        const profileUrl = `https://www.linkedin.com/in/${username}`;
        
        // Search through all experiences for a company match
        const experiences = profileData.experience || [];
        for (const job of experiences) {
            // The new output format uses `company` and `title`
            if (job.company && job.company.toLowerCase().includes(companyName.toLowerCase())) {
                console.log(`[Apify Result] Found matching company '${job.company}' for profile: ${profileUrl}`);
                return {
                    profileUrl,
                    company: job.company, // Return the matched company name
                };
            }
        }

        // If no match was found in the loop
        const latestCompany = experiences.length > 0 ? experiences[0].company : 'N/A';
        console.warn(`[Apify Result] No company match found. Provided: ${companyName}, Latest on LinkedIn: ${latestCompany}`);
        return {
            profileUrl,
            company: latestCompany, // Still return the latest company for the mismatch message
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
        const linkedInProfile = await searchApifyLinkedIn(linkedinUrl, company);

        if (!linkedInProfile) {
            result = { status: 'profile_not_found', message: `No valid LinkedIn profile found for ${linkedinUrl}. The actor may have failed or returned no data.` };
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
                    message: `Company mismatch. Provided: ${company}, Found on LinkedIn: ${linkedInProfile.company}.`,
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
