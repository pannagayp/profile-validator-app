'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

type VerificationResult = {
  id: string;
  profileId: string;
  score: number;
  reason: string;
  domainMatch: boolean;
  deliverability: 'DELIVERABLE' | 'UNDELIVERABLE' | 'RISKY';
  timestamp: {
    seconds: number;
    nanoseconds: number;
  };
};

export function VerificationList() {
  const firestore = useFirestore();
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      if (!firestore) return;
      setIsLoading(true);
      const resultsCollection = collection(firestore, 'verification-test');
      const q = query(resultsCollection, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedResults: VerificationResult[] = [];
      querySnapshot.forEach(doc => {
        fetchedResults.push({ id: doc.id, ...doc.data() } as VerificationResult);
      });
      setResults(fetchedResults);
      setIsLoading(false);
    }
    fetchResults();
  }, [firestore]);

  const getScoreVariant = (score: number) => {
    if (score >= 0.7) return 'default';
    if (score >= 0.4) return 'secondary';
    return 'destructive';
  };
  
  const getDeliverabilityVariant = (deliverability: string) => {
    if (deliverability === 'DELIVERABLE') return 'default';
    if (deliverability === 'RISKY') return 'secondary';
    return 'destructive';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification Results</CardTitle>
        <CardDescription>Results from the profile verification process.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96 rounded-md border p-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-3/4" />
            </div>
          ) : results.length > 0 ? (
            <ul className="space-y-4">
              {results.map(r => (
                <li key={r.id} className="p-3 rounded-md border bg-card text-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <p className="font-mono text-xs text-muted-foreground">Profile ID: {r.profileId}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.timestamp.seconds * 1000), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                     <Badge variant={getScoreVariant(r.score)}>Score: {r.score.toFixed(2)}</Badge>
                     <Badge variant={r.domainMatch ? 'default' : 'destructive'}>
                        Domain Match: {r.domainMatch ? 'Yes' : 'No'}
                     </Badge>
                     <Badge variant={getDeliverabilityVariant(r.deliverability)}>
                        {r.deliverability}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs pt-1">{r.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No verification results found.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
