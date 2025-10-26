'use client';
import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getRawEmails } from '@/lib/db';

type RawEmail = {
  id: string;
  emailBody: string;
  timestamp: string;
};

export function RawEmailsTable() {
  const [emails, setEmails] = useState<RawEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEmails() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getRawEmails();
        setEmails(data);
      } catch (e: any) {
        setError("Failed to load raw emails.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchEmails();
  }, []);

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
            <TableHead>Timestamp</TableHead>
            <TableHead>Email Snippet</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emails && emails.map(email => (
            <TableRow key={email.id}>
              <TableCell className="font-medium w-[200px]">
                {email.timestamp ? formatDistanceToNow(new Date(email.timestamp), { addSuffix: true }) : 'N/A'}
              </TableCell>
              <TableCell>
                <pre className="whitespace-pre-wrap font-mono text-xs">{email.emailBody.substring(0, 150)}...</pre>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
       {!emails || emails.length === 0 && (
             <div className="flex items-center justify-center h-full p-8">
                <p className="text-muted-foreground">No raw emails found.</p>
            </div>
        )}
    </ScrollArea>
  );
}
