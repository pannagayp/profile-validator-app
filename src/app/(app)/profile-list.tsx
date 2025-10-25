import { getProfiles } from '@/lib/db';
import { ProfileCard } from './profile-card';
import { Card, CardContent } from '@/components/ui/card';

export async function ProfileList() {
  const profiles = await getProfiles();

  if (profiles.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p>No profiles found. Create one to get started!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {profiles.map(profile => (
        <ProfileCard key={profile.id} profile={profile} />
      ))}
    </div>
  );
}
