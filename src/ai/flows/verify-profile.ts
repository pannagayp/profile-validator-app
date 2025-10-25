'use server';
/**
 * @fileOverview A flow to verify an extracted profile.
 *
 * - verifyExtractedProfile - A function that takes a profile, verifies it, and saves the result.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { addDocumentNonBlocking, initializeFirebase } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';

// Define the input schema based on the ExtractedProfile type
const ExtractedProfileSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  company: z.string().optional(),
  linkedin: z.string().optional(),
  extraction_status: z.enum(['complete', 'partial']),
  raw_text: z.string().optional(),
});
type ExtractedProfile = z.infer<typeof ExtractedProfileSchema>;

// Mock Email Verification API
type EmailVerificationVerdict = 'DELIVERABLE' | 'UNDELIVERABLE' | 'RISKY';

async function verifyEmailDeliverability(email: string): Promise<{
  deliverability: EmailVerificationVerdict;
  reason: string;
}> {
  // This is a mock sandbox API.
  await new Promise(resolve => setTimeout(resolve, 1000));
  if (email.includes('undeliverable')) {
    return { deliverability: 'UNDELIVERABLE', reason: 'Email address does not exist.' };
  }
  if (email.includes('risky')) {
    return { deliverability: 'RISKY', reason: 'Accept-all domain, cannot confirm validity.' };
  }
  return { deliverability: 'DELIVERABLE', reason: 'Email address is valid and can receive mail.' };
}


export async function verifyExtractedProfile(profile: ExtractedProfile): Promise<void> {
  await verifyProfileFlow(profile);
}

const verifyProfileFlow = ai.defineFlow(
  {
    name: 'verifyProfileFlow',
    inputSchema: ExtractedProfileSchema,
    outputSchema: z.void(),
  },
  async (profile) => {
    let score = 0;
    let reason = '';
    
    // 1. Domain-Company Match
    let domainMatch = false;
    if (profile.email && profile.company) {
        try {
            const emailDomain = profile.email.split('@')[1].toLowerCase();
            const companyDomain = new URL(`http://${profile.company.toLowerCase().replace(/\s+/g, '')}`).hostname.replace('www.','');
            
            if(emailDomain.includes(companyDomain)) {
                domainMatch = true;
                score += 0.4;
                reason += 'Email domain matches company name. ';
            } else {
                reason += `Email domain (${emailDomain}) does not match company domain (${companyDomain}). `;
            }
        } catch (e) {
            reason += 'Could not parse company name as a valid domain. ';
        }
    } else {
        reason += 'Missing email or company for domain match check. ';
    }

    // 2. Email Deliverability
    let deliverability: EmailVerificationVerdict = 'RISKY';
    if(profile.email) {
        const verificationResult = await verifyEmailDeliverability(profile.email);
        deliverability = verificationResult.deliverability;
        reason += verificationResult.reason;

        if(deliverability === 'DELIVERABLE') {
            score += 0.6;
        } else if (deliverability === 'RISKY') {
            score += 0.2;
        }
    } else {
        reason += 'Missing email for deliverability check.';
    }

    // Clamp score between 0 and 1
    score = Math.max(0, Math.min(1, score));


    // 3. Save results to Firestore
    const { firestore } = initializeFirebase();
    const verificationCol = collection(firestore, 'verification-test');

    const result = {
      profileId: profile.id,
      score,
      reason,
      domainMatch,
      deliverability,
      timestamp: serverTimestamp(),
    };

    addDocumentNonBlocking(verificationCol, result);
  }
);
