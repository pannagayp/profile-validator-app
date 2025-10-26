
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
 * Apify LinkedIn Search Function
 * ===================================================================================
 *  TO MAKE THIS REAL:
 *  1. You have already chosen Apify and have your API token in the .env file.
 *  2. You need to find the right Apify Actor for scraping a LinkedIn profile (e.g., "surrey.ai/linkedin-profile-scraper").
 *  3. Replace the logic in this function with a real API call to Apify.
 *     The basic flow is:
 *       a. Start an Actor run with the LinkedIn profile URL or search query.
 *       b. Wait for the run to finish.
 *       c. Fetch the results from the Actor's dataset.
 *  4. Parse the response and return an object with `profileUrl` and `company`.
 * ===================================================================================
 */
async function searchApifyLinkedIn(name: string): Promise<{ profileUrl: string; company: string } | null> {
    console.log(`[Apify Search] Searching for profile with name: ${name}`);
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
        console.warn("APIFY_API_TOKEN is not set. Using mock data. For a real search, add your Apify token to the .env file.");
    }
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

    // ============================================================================================
    // START: REPLACE THIS MOCK LOGIC WITH YOUR REAL APIFY API CALL
    // ============================================================================================

    // You would use `fetch` here to call the Apify API.
    // This is a simplified example. You'll need to read Apify's documentation.
    /*
    const ACTOR_ID = "YOUR_CHOSEN_ACTOR_ID"; // e.g., "surrey.ai/linkedin-profile-scraper"
    const runResponse = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${apifyToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            // The input for your actor, e.g., a search query or profile URL
            "profileUrls": [`https://www.linkedin.com/in/${name.replace(/\s+/g, '-')}`] // This is a guess!
        }),
    });
    const runData = await runResponse.json();
    const runId = runData.data.id;

    // You would then need to poll the run until it's finished and fetch the dataset.
    // This is a complex process and Apify provides client libraries that can simplify this.
    // For a real implementation, consider using the `apify-client` NPM package.
    */

    // For now, we will continue to use the mock logic.
    if (process.env.MOCK_LINKEDIN_API_LIMIT_REACHED === 'true') {
        throw new Error('Apify API limit reached or task failed');
    }
    if (name.toLowerCase().includes('unknown')) {
        return null;
    }
    const mockCompany = 'MockTech Inc.';
    const sanitizedName = name.trim().toLowerCase().replace(/[\s\r\n\t_'.]+/g, '-').replace(/[^a-z0-9-]/g, '');
    const mockProfileUrl = `https://www.linkedin.com/in/${sanitizedName}`;
    console.log(`[Mock Response] Found profile: ${mockProfileUrl} at ${mockCompany}`);
    return {
        profileUrl: mockProfileUrl,
        company: mockCompany,
    };
    // ============================================================================================
    // END: REPLACE MOCK LOGIC
    // ============================================================================================
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
        // We now call the function intended for Apify.
        const linkedInProfile = await searchApifyLinkedIn(name);

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
