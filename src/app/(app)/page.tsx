
'use client';

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { processSingleEmail } from '@/app/actions';
import { initialize, handleSignIn as attemptSignIn, getRecentEmails, getLatestEmailBody, type GmailMessage } from '@/services/gmail';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Mail, User, Building, Linkedin, Phone, Inbox, RefreshCw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';


const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

type FormValues = z.infer<typeof formSchema>;

type ExtractedInfo = {
  name?: string | null;
  company?: string | null;
  designation?: string | null;
  phone?: string | null;
  linkedin?: string | null;
};

export default function HomePage() {
  const [extractedInfo, setExtractedInfo] = useState<ExtractedInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [recentEmails, setRecentEmails] = useState<GmailMessage[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);


  const fetchEmails = async () => {
    setIsLoadingEmails(true);
    try {
      const emails = await getRecentEmails();
      setRecentEmails(emails);
    } catch (e) {
      console.error("Failed to fetch recent emails", e);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  const onAuthSuccess = () => {
    setIsAuthenticated(true);
    fetchEmails();
  }

  useEffect(() => {
    initialize(onAuthSuccess);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsProcessing(true);
    setExtractedInfo(null);
    setError(null);
    try {
      // Step 1: Fetch email body on the client
      const emailBody = await getLatestEmailBody(data.email);
      
      if (!emailBody) {
        setError(`No email found from ${data.email}.`);
        setIsProcessing(false);
        return;
      }
      
      // Step 2: Pass the email body to the server action
      const result = await processSingleEmail(emailBody);

      if (result.success && result.data) {
        setExtractedInfo(result.data);
      } else {
        setError(result.error || "Could not process email.");
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tighter text-foreground">
            Email Contact Extractor
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Connect your Gmail to fetch the latest email from a client and extract their key information using AI.
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Connect Gmail</CardTitle>
                <CardDescription>Authorize the app to read your Gmail inbox.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" onClick={attemptSignIn} disabled={isAuthenticated}>
                  <Mail className="mr-2 h-4 w-4" /> {isAuthenticated ? 'Gmail Connected' : 'Connect with Gmail'}
                </Button>
              </CardContent>
            </Card>

            {isAuthenticated && (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2">
                                    <Inbox />
                                    Recent Emails
                                </CardTitle>
                                <CardDescription>
                                    Here are your 5 most recent emails.
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={fetchEmails} disabled={isLoadingEmails}>
                                <RefreshCw className={`h-4 w-4 ${isLoadingEmails ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoadingEmails && recentEmails.length === 0 ? (
                             <div className="flex items-center justify-center h-48">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <ul className="space-y-4">
                                {recentEmails.map(email => (
                                    <li key={email.id} className="flex items-start gap-3">
                                        <Avatar className="h-8 w-8 text-xs">
                                            <AvatarFallback>{email.from.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex justify-between items-baseline">
                                                <p className="font-medium text-sm truncate">{email.from}</p>
                                                <p className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                                                </p>
                                            </div>
                                            <p className="text-sm font-semibold truncate">{email.subject}</p>
                                            <p className="text-xs text-muted-foreground truncate">{email.snippet}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            )}
          </div>
          
          <div className="space-y-6">
             <Card>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <CardHeader>
                    <CardTitle>Step 2: Extract Information</CardTitle>
                    <CardDescription>Enter a client's email to find and process their latest email.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client's Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="name@example.com" {...field} disabled={!isAuthenticated} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={isProcessing || !isAuthenticated} className="w-full">
                      {isProcessing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Fetch & Extract
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <CardTitle>Extracted Information</CardTitle>
                <CardDescription>Contact details will appear here after processing.</CardDescription>
              </CardHeader>
              <CardContent>
                {isProcessing && (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
                {error && (
                  <div className="text-destructive text-sm font-medium">{error}</div>
                )}
                {extractedInfo && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{extractedInfo.name || 'N/A'}</p>
                      </div>
                    </div>
                     <Separator />
                    <div className="flex items-center gap-4">
                      <Building className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Company</p>
                        <p className="font-medium">{extractedInfo.company || 'N/A'}</p>
                      </div>
                    </div>
                    <Separator />
                     <div className="flex items-center gap-4">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{extractedInfo.phone || 'N/A'}</p>
                      </div>
                    </div>
                     <Separator />
                    <div className="flex items-center gap-4">
                      <Linkedin className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">LinkedIn</p>
                        <p className="font-medium break-all">{extractedInfo.linkedin ? <a href={extractedInfo.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{extractedInfo.linkedin}</a> : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
