import { Suspense } from 'react';
import { RawEmailsTable } from './raw-emails-table';
import { ExtractedProfilesTable } from './extracted-profiles-table';
import { VerificationResultsTable } from './verification-results-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorReport } from './error-report';

function TableSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
    )
}

export default function AdminPage() {
  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="mb-8">
          <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tighter text-foreground">
            Data Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor the email processing pipeline from raw data to verified profiles.
          </p>
        </header>

        <Card>
            <CardHeader>
                <CardTitle>Raw Emails</CardTitle>
                <CardDescription>Unprocessed emails fetched from the Gmail account.</CardDescription>
            </CardHeader>
            <CardContent>
                <Suspense fallback={<TableSkeleton />}>
                    <RawEmailsTable />
                </Suspense>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Extracted Profiles</CardTitle>
                <CardDescription>Contact information extracted from raw emails. Select profiles and approve them.</CardDescription>
            </CardHeader>
            <CardContent>
                <Suspense fallback={<TableSkeleton />}>
                    <ExtractedProfilesTable />
                </Suspense>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Verification Results</CardTitle>
                <CardDescription>Automated verification scores and deliverability checks.</CardDescription>
            </CardHeader>
            <CardContent>
                <Suspense fallback={<TableSkeleton />}>
                    <VerificationResultsTable />
                </Suspense>
            </CardContent>
        </Card>

        <Suspense fallback={<TableSkeleton />}>
            <ErrorReport />
        </Suspense>

      </div>
    </div>
  );
}
