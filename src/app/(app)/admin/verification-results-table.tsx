'use client';

import { useState, useEffect } from 'react';
import { getVerificationResults } from '@/lib/db';
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
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';


type VerificationResult = {
  id: string;
  profileId: string;
  score: number;
  reason: string;
  domainMatch: boolean;
  deliverability: 'DELIVERABLE' | 'UNDELIVERABLE' | 'RISKY';
  timestamp: string;
};

export function VerificationResultsTable() {
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getVerificationResults();
        setResults(data);
      } catch (e: any) {
        setError("Failed to load verification results.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchResults();
  }, []);

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
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
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
                {r.timestamp ? formatDistanceToNow(new Date(r.timestamp), { addSuffix: true }) : 'N/A'}
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
