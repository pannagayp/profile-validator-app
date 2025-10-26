
'use server';
/**
 * @fileOverview A flow to extract contact information from an email body using regex.
 *
 * - extractContactInfo - A function that takes an email body and extracts contact details.
 */

import { ExtractedContactInfo } from '@/ai/schemas';

// Helper function to safely extract a value using regex
function extractValue(text: string, regex: RegExp): string | null {
  const match = text.match(regex);
  // Return the first capturing group if it exists and is not just whitespace
  return match && match[1] && match[1].trim() ? match[1].trim() : null;
}

export async function extractContactInfo(input: { emailBody: string }): Promise<ExtractedContactInfo> {
  const { emailBody } = input;

  // Case-insensitive and multiline regex patterns
  const nameRegex = /(?:name|full name|full_name)[:\s]+([A-Za-z\s.'-]+)/im;
  const companyRegex = /(?:company|organization)[:\s]+([A-Za-z0-9\s.,'-]+)/im;
  const designationRegex = /(?:designation|title|job title|job_title)[:\s]+([A-Za-z\s-]+)/im;
  const phoneRegex = /(?:phone|mobile|tel)[:\s]*([\d\s().+-]+)/im;
  const linkedinRegex = /(?:linkedin)[:\s]+(https?:\/\/(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+)/im;
  
  const name = extractValue(emailBody, nameRegex);
  const company = extractValue(emailBody, companyRegex);
  const designation = extractValue(emailBody, designationRegex);
  const phone = extractValue(emailBody, phoneRegex);
  const linkedin = extractValue(emailBody, linkedinRegex);

  // Return the extracted information.
  return {
    name,
    company,
    designation,
    phone,
    linkedin,
  };
}
