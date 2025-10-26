
'use client';

import { useState, useEffect } from 'react';
import { getLinkedInVerifications } from '@/lib/db';
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
import { AlertCircle, CheckCircle, XCircle, Clock, HelpCircle } from 'lucide-react';


type LinkedInVerification = {
  id: string;
  extractedProfileId: string;
  name: string;
  email: string;
  inputCompany: string;
  validationStatus: 'verified' | 'company_mismatch' | 'profile_not_found' | 'api_limit_reached' | 'error';
  validationMessage: string;
  foundLinkedInUrl: string | null;
  timestamp: string;
};

export function LinkedInVerificationTable() {
  const [results, setResults] = useState<LinkedInVerification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getLinkedInVerifications();
        setResults(data);
      } catch (e: any) {
        setError("Failed to load LinkedIn verification results.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchResults();
  }, []);

  const getStatusConfig = (status: LinkedInVerification['validationStatus']) => {
    switch (status) {
        case 'verified':
            return { variant: 'default', icon: <CheckCircle className="mr-1.5 h-3 w-3"/>, label: 'Verified' };
        case 'company_mismatch':
            return { variant: 'secondary', icon: <AlertCircle className="mr-1.5 h-3 w-3"/>, label: 'Mismatch' };
        case 'profile_not_found':
            return { variant: 'secondary', icon: <HelpCircle className="mr-1.5 h-3 w-3"/>, label: 'Not Found' };
        case 'api_limit_reached':
            return { variant: 'destructive', icon: <Clock className="mr-1.5 h-3 w-3"/>, label: 'API Limit' };
        case 'error':
            return { variant: 'destructive', icon: <XCircle className="mr-1.5 h-3 w-3"/>, label: 'Error' };
        default:
            return { variant: 'secondary', icon: <HelpCircle className="mr-1.5 h-3 w-3"/>, label: 'Unknown' };
    }
  };
  
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
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Timestamp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results && results.map(r => {
            const statusConfig = getStatusConfig(r.validationStatus);
            return (
                <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                        <Badge variant={statusConfig.variant}>
                            {statusConfig.icon}
                            {statusConfig.label}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.validationMessage}</TableCell>
                    <TableCell className="text-xs">
                        {r.timestamp ? formatDistanceToNow(new Date(r.timestamp), { addSuffix: true }) : 'N/A'}
                    </TableCell>
                </TableRow>
            )
          })}
        </TableBody>
      </Table>
        {!results || results.length === 0 && (
            <div className="flex items-center justify-center h-full p-8">
            <p className="text-muted-foreground">No LinkedIn verification results found.</p>
            </div>
        )}
    </ScrollArea>
  );
}
