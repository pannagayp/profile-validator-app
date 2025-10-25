'use client';

import { useMemo } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle } from 'lucide-react';


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

export function VerificationResultsTable() {
  const firestore = useFirestore();

  const resultsQuery = useMemoFirebase(() => {
    if(!firestore) return null;
    return query(collection(firestore, 'verification-test'), orderBy('timestamp', 'desc'))
  }, [firestore]);

  const { data: results, isLoading, error } = useCollection<Omit<VerificationResult, 'id'>>(resultsQuery);

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

  if (isLoading) {
    return <div>Loading verification results...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load verification results. Please check your permissions.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <ScrollArea className="h-96 rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Profile ID</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Domain Match</TableHead>
            <TableHead>Deliverability</TableHead>
            <TableHead>Timestamp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results && results.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.profileId}</TableCell>
              <TableCell>
                <Badge variant={getScoreVariant(r.score)}>{r.score.toFixed(2)}</Badge>
              </TableCell>
               <TableCell>
                <Badge variant={r.domainMatch ? 'default' : 'destructive'}>
                    {r.domainMatch ? 'Yes' : 'No'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={getDeliverabilityVariant(r.deliverability)}>
                    {r.deliverability}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">
                {r.timestamp ? formatDistanceToNow(new Date(r.timestamp.seconds * 1000), { addSuffix: true }) : 'N/A'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
        {!results || results.length === 0 && (
            <div className="flex items-center justify-center h-full p-8">
            <p className="text-muted-foreground">No verification results found.</p>
            </div>
        )}
    </ScrollArea>
  );
}
