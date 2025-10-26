
import type { Profile } from './types';

type RawEmail = { id: string; emailBody: string; timestamp: string; };
type ExtractedProfile = { id: string; name?: string; email?: string; company?: string; linkedin?: string; extraction_status: 'complete' | 'partial'; };
type VerificationResult = { id: string; profileId: string; score: number; reason: string; domainMatch: boolean; deliverability: 'DELIVERABLE' | 'UNDELIVERABLE' | 'RISKY'; timestamp: string; };
type LinkedInVerification = { id: string; extractedProfileId: string; name: string; email: string; inputCompany: string; validationStatus: 'verified' | 'company_mismatch' | 'profile_not_found' | 'api_limit_reached' | 'error'; validationMessage: string; foundLinkedInUrl: string | null; timestamp: string; };


// This is a mock database. In a real application, you would use a service like Firestore.
let profiles: Profile[] = [];
let validationFailures: { email: string; error: string; timestamp: string }[] = [];
let rawEmails: RawEmail[] = [];
let extractedProfiles: ExtractedProfile[] = [];
let verificationResults: VerificationResult[] = [];
let linkedInVerifications: LinkedInVerification[] = [];


// Simulate some initial data
if (process.env.NODE_ENV === 'development' && profiles.length === 0) {
  profiles.push(
    { id: '1', email: 'user.valid@example.com', status: 'valid', createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    { id: '2', email: 'user.invalid@fail.com', status: 'invalid', error: 'Domain "fail.com" is blocked.', createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
    { id: '3', email: 'user.pending@example.com', status: 'pending', createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString() }
  );
  validationFailures.push({ email: 'user.invalid@fail.com', error: 'Domain "fail.com" is blocked.', timestamp: new Date().toISOString() });
  
  rawEmails.push({ id: 'raw1', emailBody: 'From: test@example.com\nSubject: Portfolio Submission\n\nName: Jane Doe\nEmail: jane.doe@example.com\nCompany: ExampleCorp\nLinkedIn: https://linkedin.com/in/janedoe', timestamp: new Date().toISOString() });

  extractedProfiles.push({ id: 'ext1', name: 'Jane Doe', email: 'jane.doe@example.com', company: 'ExampleCorp', linkedin: 'https://linkedin.com/in/janedoe', extraction_status: 'complete' });

  verificationResults.push({ id: 'ver1', profileId: 'ext1', score: 0.8, reason: 'Email domain matches company name. Email address is valid.', domainMatch: true, deliverability: 'DELIVERABLE', timestamp: new Date().toISOString() });

  linkedInVerifications.push({ id: 'linkedin1', extractedProfileId: 'ext1', name: 'Jane Doe', email: 'jane.doe@example.com', inputCompany: 'ExampleCorp', validationStatus: 'verified', validationMessage: 'Company name matched on LinkedIn profile.', foundLinkedInUrl: 'https://www.linkedin.com/in/jane-doe', timestamp: new Date().toISOString() });
}

export async function getProfiles(): Promise<Profile[]> {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...profiles].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function addProfile(email: string): Promise<Profile> {
  await new Promise(resolve => setTimeout(resolve, 100));
  const newProfile: Profile = {
    id: (profiles.length + 1).toString(),
    email,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  profiles.unshift(newProfile);
  return newProfile;
}

export async function updateProfileStatus(id: string, status: Profile['status'], error?: string): Promise<Profile | undefined> {
  await new Promise(resolve => setTimeout(resolve, 100));
  const profileIndex = profiles.findIndex(p => p.id === id);
  if (profileIndex > -1) {
    profiles[profileIndex].status = status;
    profiles[profileIndex].error = error;
    return profiles[profileIndex];
  }
  return undefined;
}

export async function addValidationError(email: string, error: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 100));
  validationFailures.push({ email, error, timestamp: new Date().toISOString() });
}

export async function getValidationErrors(): Promise<{ email: string; error: string; timestamp: string }[]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return [...validationFailures];
}

export async function clearValidationErrors(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 100));
  validationFailures = [];
}


// --- Mock functions for admin dashboard ---

export async function getRawEmails(): Promise<RawEmail[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...rawEmails].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getExtractedProfiles(): Promise<ExtractedProfile[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return [...extractedProfiles];
}

export async function getVerificationResults(): Promise<VerificationResult[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...verificationResults].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getLinkedInVerifications(): Promise<LinkedInVerification[]> {
    await new Promise(resolve => setTimeout(resolve, 600));
    return [...linkedInVerifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
