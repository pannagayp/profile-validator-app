import type { Profile } from './types';

// This is a mock database. In a real application, you would use a service like Firestore.
let profiles: Profile[] = [];
let validationFailures: { email: string; error: string; timestamp: string }[] = [];

// Simulate some initial data
if (process.env.NODE_ENV === 'development' && profiles.length === 0) {
  profiles.push(
    { id: '1', email: 'user.valid@example.com', status: 'valid', createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    { id: '2', email: 'user.invalid@fail.com', status: 'invalid', error: 'Domain "fail.com" is blocked.', createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
    { id: '3', email: 'user.pending@example.com', status: 'pending', createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString() }
  );
  validationFailures.push({ email: 'user.invalid@fail.com', error: 'Domain "fail.com" is blocked.', timestamp: new Date().toISOString() });
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
