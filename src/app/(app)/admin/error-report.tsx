'use client';

import { useState, useTransition, useEffect } from 'react';
import { generateSummaryAndClearErrors } from '@/app/actions';
import { getValidationErrors } from '@/lib/db';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Bot, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type ValidationError = {
  email: string;
  error: string;
  timestamp: string;
};

export function ErrorReport() {
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isLoadingErrors, setIsLoadingErrors] = useState(true);

  useEffect(() => {
    async function fetchErrors() {
      setIsLoadingErrors(true);
      const fetchedErrors = await getValidationErrors();
      setErrors(fetchedErrors);
      setIsLoadingErrors(false);
    }
    fetchErrors();
  }, [isPending]);

  const handleGenerateSummary = () => {
    startTransition(async () => {
      const result = await generateSummaryAndClearErrors();
      setSummary(result.summary);
      // Errors will be refetched by useEffect
    });
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Validation Failure Log</CardTitle>
          <CardDescription>
            Here are the recent validation failures. Generate a summary to process and clear them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 rounded-md border p-4">
            {isLoadingErrors ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : errors.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {errors.map((e, i) => (
                  <li key={i} className="font-mono text-muted-foreground">
                    <span className="text-foreground">{e.email}:</span> {e.error}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No validation failures logged. Great job!</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerateSummary} disabled={isPending || errors.length === 0}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Bot className="mr-2 h-4 w-4" />
            )}
            Generate AI Summary & Clear Log
          </Button>
        </CardFooter>
      </Card>
      
      {summary && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-headline">AI Generated Summary</AlertTitle>
          <AlertDescription>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{summary}</pre>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
