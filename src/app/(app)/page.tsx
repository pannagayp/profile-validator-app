import { Suspense } from 'react';
import { ProfileForm } from './profile-form';
import { ProfileList } from './profile-list';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function ProfileListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tighter text-foreground">
            Profile Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Submit new email profiles for validation and monitor their status. 
            Results will update automatically as they are processed.
          </p>
        </header>

        <div className="grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <h2 className="font-headline text-2xl font-semibold mb-4 text-foreground">
              Create New Profile
            </h2>
            <ProfileForm />
          </div>
          <div className="lg:col-span-3">
            <h2 className="font-headline text-2xl font-semibold mb-4 text-foreground">
              Existing Profiles
            </h2>
            <Suspense fallback={<ProfileListSkeleton />}>
              <ProfileList />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
