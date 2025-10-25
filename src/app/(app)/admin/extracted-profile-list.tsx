'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

type ExtractedProfile = {
  id: string;
  name?: string;
  email?: string;
  company?: string;
  linkedin?: string;
  extraction_status: 'complete' | 'partial';
  raw_text?: string;
};

export function ExtractedProfileList() {
  const firestore = useFirestore();
  const [profiles, setProfiles] = useState<ExtractedProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProfiles() {
      if (!firestore) return;
      setIsLoading(true);
      const profilesCollection = collection(firestore, 'extracted-profiles-test');
      const q = query(profilesCollection, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedProfiles: ExtractedProfile[] = [];
      querySnapshot.forEach(doc => {
        fetchedProfiles.push({ id: doc.id, ...doc.data() } as ExtractedProfile);
      });
      setProfiles(fetchedProfiles);
      setIsLoading(false);
    }
    fetchProfiles();
  }, [firestore]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Extracted Profiles</CardTitle>
        <CardDescription>Profiles extracted from raw emails.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96 rounded-md border p-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-3/4" />
            </div>
          ) : profiles.length > 0 ? (
            <ul className="space-y-4">
              {profiles.map(p => (
                <li key={p.id} className="p-3 rounded-md border bg-card text-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold">{p.name || 'N/A'}</p>
                      <p className="text-muted-foreground">{p.email || 'N/A'}</p>
                      <p className="text-muted-foreground">{p.company || 'N/A'}</p>
                      {p.linkedin && (
                        <a href={p.linkedin} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          LinkedIn
                        </a>
                      )}
                    </div>
                    <Badge variant={p.extraction_status === 'complete' ? 'default' : 'secondary'} className="flex items-center gap-1.5">
                      {p.extraction_status === 'complete' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      {p.extraction_status}
                    </Badge>
                  </div>
                  {p.extraction_status === 'partial' && p.raw_text && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-muted-foreground">Show Raw Text</summary>
                      <pre className="mt-1 p-2 bg-muted rounded-md whitespace-pre-wrap font-mono text-xs">{p.raw_text}</pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No extracted profiles found.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
