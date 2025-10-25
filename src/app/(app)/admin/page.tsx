import { ErrorReport } from './error-report';
import { ExtractProfiles } from './extract-profiles';
import { ExtractedProfileList } from './extracted-profile-list';
import { Suspense } from 'react';

export default function AdminPage() {
  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="mb-8">
          <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tighter text-foreground">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Admin tools for managing profiles and data.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ErrorReport />
          <ExtractProfiles />
        </div>
        
        <Suspense fallback={<div>Loading profiles...</div>}>
          <ExtractedProfileList />
        </Suspense>
      </div>
    </div>
  );
}
