# **App Name**: Email Validator Demo

## Core Features:

- Email Validation: Validate email addresses using regular expressions and third-party APIs.
- Gmail OAuth Connection: Connect to a test Gmail account using OAuth for email validation and data retrieval.
- Profile Storage: Store validated email profiles and associated data in a Firestore collection profiles-test.
- Validation Trigger: Trigger email validation upon profile creation using a Cloud Function.
- Profile View: View user profile details and validation status in the UI.
- Error Reporting: Implement an AI powered reporting tool which sends validation failures to an admin.

## Style Guidelines:

- Primary color: Muted blue (#6699CC) to convey trust and reliability.
- Background color: Light gray (#F0F0F0), very desaturated to ensure readability and a clean aesthetic.
- Accent color: Soft green (#8FBC8F), to subtly signal 'valid' status without overwhelming the interface.
- Font pairing: 'Inter' (sans-serif) for body text, 'Space Grotesk' (sans-serif) for headlines.
- Use simple, flat icons for email, profile, and validation status.
- Clean, organized layout with clear sections for profile data, validation results, and error messages.
- Subtle transition animations to indicate validation status changes and data loading.