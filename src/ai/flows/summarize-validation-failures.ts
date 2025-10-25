'use server';

/**
 * @fileOverview An AI-powered error reporting tool that summarizes validation failures.
 *
 * - summarizeValidationFailures - A function that generates a summarized report of validation failures.
 * - SummarizeValidationFailuresInput - The input type for the summarizeValidationFailures function.
 * - SummarizeValidationFailuresOutput - The return type for the summarizeValidationFailures function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeValidationFailuresInputSchema = z.object({
  validationFailures: z
    .array(z.string())
    .describe('An array of validation failure messages.'),
});
export type SummarizeValidationFailuresInput = z.infer<
  typeof SummarizeValidationFailuresInputSchema
>;

const SummarizeValidationFailuresOutputSchema = z.object({
  summary: z
    .string()
    .describe('A summarized report of the validation failures.'),
});
export type SummarizeValidationFailuresOutput = z.infer<
  typeof SummarizeValidationFailuresOutputSchema
>;

export async function summarizeValidationFailures(
  input: SummarizeValidationFailuresInput
): Promise<SummarizeValidationFailuresOutput> {
  return summarizeValidationFailuresFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeValidationFailuresPrompt',
  input: {schema: SummarizeValidationFailuresInputSchema},
  output: {schema: SummarizeValidationFailuresOutputSchema},
  prompt: `You are an AI assistant that summarizes validation failure reports for administrators.

  Summarize the following validation failures into a concise report:

  Validation Failures:
  {{#each validationFailures}}- {{{this}}}\n{{/each}}
  `,
});

const summarizeValidationFailuresFlow = ai.defineFlow(
  {
    name: 'summarizeValidationFailuresFlow',
    inputSchema: SummarizeValidationFailuresInputSchema,
    outputSchema: SummarizeValidationFailuresOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
