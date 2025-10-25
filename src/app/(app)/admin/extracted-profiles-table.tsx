'use client';
import { useState, useMemo, useTransition } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { approveProfile } from '@/app/actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

type ExtractedProfile = {
  id: string;
  name?: string;
  email?: string;
  company?: string;
  linkedin?: string;
  extraction_status: 'complete' | 'partial';
};

export function ExtractedProfilesTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selectedProfiles, setSelectedProfiles] = useState<ExtractedProfile[]>([]);

  const profilesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'extracted-profiles-test'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: profiles, isLoading, error } = useCollection<Omit<ExtractedProfile, 'id'>>(profilesQuery);

  const handleSelect = (profile: ExtractedProfile, checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedProfiles(prev => [...prev, profile]);
    } else {
      setSelectedProfiles(prev => prev.filter(p => p.id !== profile.id));
    }
  };
  
  const handleApprove = () => {
    if (selectedProfiles.length === 0) {
        toast({
            title: "No profiles selected",
            description: "Please select at least one profile to approve.",
            variant: "destructive"
        });
        return;
    }

    startTransition(async () => {
        const result = await approveProfile(selectedProfiles);
        if (result.success) {
            toast({
                title: "Profiles Approved",
                description: `${selectedProfiles.length} profile(s) have been approved and moved to the verified collection.`,
            });
            setSelectedProfiles([]);
        } else {
            toast({
                title: 'Approval Failed',
                description: result.error || 'An unknown error occurred.',
                variant: 'destructive',
            });
        }
    })
  }

  if (isLoading) {
    return <div>Loading profiles...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load extracted profiles. Please check your permissions.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
        <div className="flex justify-end">
            <Button onClick={handleApprove} disabled={isPending || selectedProfiles.length === 0}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Approve Selected ({selectedProfiles.length})
            </Button>
        </div>
        <ScrollArea className="h-96 rounded-md border">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {profiles && profiles.map(profile => (
                <TableRow key={profile.id}>
                <TableCell>
                    <Checkbox
                        onCheckedChange={(checked) => handleSelect(profile, checked)}
                        checked={selectedProfiles.some(p => p.id === profile.id)}
                    />
                </TableCell>
                <TableCell className="font-medium">{profile.name || 'N/A'}</TableCell>
                <TableCell>{profile.email || 'N/A'}</TableCell>
                <TableCell>{profile.company || 'N/A'}</TableCell>
                <TableCell>
                    <Badge variant={profile.extraction_status === 'complete' ? 'default' : 'secondary'}>
                        {profile.extraction_status === 'complete' ? <CheckCircle2 className="mr-1.5 h-3 w-3" /> : <AlertCircle className="mr-1.5 h-3 w-3" />}
                        {profile.extraction_status}
                    </Badge>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
        {!profiles || profiles.length === 0 && (
             <div className="flex items-center justify-center h-full p-8">
                <p className="text-muted-foreground">No extracted profiles yet.</p>
            </div>
        )}
        </ScrollArea>
    </div>
  );
}
