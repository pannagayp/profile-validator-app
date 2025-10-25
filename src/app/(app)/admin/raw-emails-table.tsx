'use client';
import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
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
import { AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type RawEmail = {
  id: string;
  emailBody: string;
  timestamp: {
    seconds: number;
    nanoseconds: number;
  };
};

export function RawEmailsTable() {
  const firestore = useFirestore();
  
  const emailsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'raw-emails-test'), orderBy('timestamp', 'desc'));
  }, [firestore]);

  const { data: emails, isLoading, error } = useCollection<Omit<RawEmail, 'id'>>(emailsQuery);

  if (isLoading) {
    return <div>Loading emails...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load raw emails. Please check your permissions.
        </AlertDescription>
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
                {email.timestamp ? formatDistanceToNow(new Date(email.timestamp.seconds * 1000), { addSuffix: true }) : 'N/A'}
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
