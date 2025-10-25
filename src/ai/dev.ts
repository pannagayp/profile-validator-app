import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-validation-failures.ts';
import '@/ai/flows/extract-contact-info.ts';
import '@/ai/flows/verify-profile.ts';
