
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
 *  TO MAKE THIS REAL:
 *  1. You have already chosen Apify and have your API token in the .env file.
 *  2. You have provided the Actor ID, which is now in the code below.
 *  3. UNCOMMENT the `fetch` logic below.
 *  4. READ the documentation for your chosen Actor (`apimaestro/linkedin-profile-batch-scraper-no-cookies-required`)
 *     to confirm its exact input and output structure. You may need to adjust the `body` of the
 *     `fetch` call and how the `results` are parsed.
 * ===================================================================================
 */
async function searchApifyLinkedIn(email: string, name: string): Promise<{ profileUrl: string; company: string } | null> {
    console.log(`[Apify Search] Searching for profile with email: ${email} and name: ${name}`);
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
        throw new Error("APIFY_API_TOKEN is not set in the .env file.");
    }
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay


    // ============================================================================================
    // START: REPLACE THIS MOCK LOGIC WITH YOUR REAL APIFY API CALL
    // ============================================================================================

    // You would use `fetch` here to call the Apify API.
    // This is a simplified example. You'll need to read Apify's documentation.
    /*
    const ACTOR_ID = "apimaestro/linkedin-profile-batch-scraper-no-cookies-required";
    const runResponse = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${apifyToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            // The input for your actor, e.g., a search query or profile URL
            // This is a guess based on common actor inputs! CHECK THE DOCUMENTATION.
            "profileUrls": [`https://www.linkedin.com/in/${name.replace(/\s+/g, '-')}`]
        }),
    });
    const runData = await runResponse.json();
    const runId = runData.data.id;

    // You would then need to poll the run until it's finished and fetch the dataset.
    // This is a complex process and Apify provides client libraries that can simplify this.
    // For a real implementation, consider using the `apify-client` NPM package.
    */

    // For now, we will continue to use the mock logic so the app doesn't break.
    // UNCOMMENT the code above and DELETE the mock logic below when you are ready.
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
