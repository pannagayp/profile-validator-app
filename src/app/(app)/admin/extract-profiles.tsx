'use client';

import { useTransition } from 'react';
import { processEmails } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit, Loader2 } from 'lucide-react';

export function ExtractProfiles() {
  const [isPending, startTransition] = useTransition();

  const handleExtract = () => {
    startTransition(async () => {
      await processEmails();
      // Optionally, show a toast or message on completion
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Process Raw Emails</CardTitle>
        <CardDescription>
          Extract contact information from emails stored in Firestore and save them to a new collection.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleExtract} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <BrainCircuit className="mr-2 h-4 w-4" />
          )}
          Start Extraction
        </Button>
      </CardContent>
    </Card>
  );
}
