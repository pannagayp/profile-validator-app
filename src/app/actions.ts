'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { addProfile, updateProfileStatus, addValidationError, getValidationErrors, clearValidationErrors } from '@/lib/db';
import { summarizeValidationFailures } from '@/ai/flows/summarize-validation-failures';
import { extractContactInfo } from '@/ai/flows/extract-contact-info';

const emailSchema = z.string().email({ message: 'Please enter a valid email address.' });

export type FormState = {
  message: string;
  type: 'success' | 'error';
} | null;

// Simulate a background validation process
async function triggerValidation(profileId: string, email: string) {
  // Simulate network delay and processing time
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Simulated validation logic
  if (email.endsWith('@fail.com')) {
    const error = 'Domain "fail.com" is blocked.';
    await updateProfileStatus(profileId, 'invalid', error);
    await addValidationError(email, error);
  } else if (!email.includes('.')) {
    const error = 'Email address must contain a valid domain.';
    await updateProfileStatus(profileId, 'invalid', error);
    await addValidationError(email, error);
  } else {
    await updateProfileStatus(profileId, 'valid');
  }

  revalidatePath('/');
  revalidatePath('/admin');
}

export async function createProfile(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const email = formData.get('email') as string;

  const validation = emailSchema.safeParse(email);

  if (!validation.success) {
    return {
      message: validation.error.errors[0].message,
      type: 'error',
    };
  }

  try {
    const newProfile = await addProfile(email);
    // Don't wait for the validation to finish, let it run in the background
    triggerValidation(newProfile.id, newProfile.email);
    revalidatePath('/');
    return {
      message: `Profile for ${email} is being created and validated.`,
      type: 'success',
    };
  } catch (e) {
    return {
      message: 'Failed to create profile.',
      type: 'error',
    };
  }
}

export async function generateSummaryAndClearErrors(): Promise<{ summary: string }> {
  const errors = await getValidationErrors();
  if (errors.length === 0) {
    return { summary: 'No validation failures to summarize.' };
  }

  const errorMessages = errors.map(e => `[${e.timestamp}] ${e.email}: ${e.error}`);
  
  try {
    const result = await summarizeValidationFailures({ validationFailures: errorMessages });
    await clearValidationErrors();
    revalidatePath('/admin');
    return { summary: result.summary };
  } catch (error) {
    console.error('AI summary generation failed:', error);
    return { summary: 'Failed to generate summary. Please try again later.' };
  }
}

export async function processEmails() {
  try {
    await extractContactInfo();
    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    console.error("Error processing emails:", error);
    return { success: false, error: "Failed to process emails." };
  }
}
