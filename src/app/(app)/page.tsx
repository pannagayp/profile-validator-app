
'use client';

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { processSingleEmail, validateProfileOnLinkedIn } from '@/app/actions';
import { initialize, handleSignIn, handleSignOut, isUserAuthenticated, getRecentEmails, getLatestEmailBody, type RecentEmail } from '@/services/gmail';
import type { ExtractedContactInfo, LinkedInValidationOutput } from '@/ai/schemas';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, User, Building, Linkedin, Phone, RefreshCw, Mail, ShieldCheck, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const emailFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

type EmailFormValues = z.infer<typeof emailFormSchema>;


const linkedinFormSchema = z.object({
  linkedinUrl: z.string().url({ message: 'Please enter a valid LinkedIn URL.' }),
  company: z.string().min(1, 'Company is required.'),
});
type LinkedInFormValues = z.infer<typeof linkedinFormSchema>;

const getStatusConfig = (status: LinkedInValidationOutput['status']) => {
  switch (status) {
      case 'verified':
          return { variant: 'default', icon: <CheckCircle className="mr-1.5 h-3 w-3"/>, label: 'Verified' };
      case 'company_mismatch':
          return { variant: 'secondary', icon: <AlertCircle className="mr-1.5 h-3 w-3"/>, label: 'Mismatch' };
      case 'profile_not_found':
          return { variant: 'secondary', icon: <XCircle className="mr-1.5 h-3 w-3"/>, label: 'Not Found' };
      case 'api_limit_reached':
          return { variant: 'destructive', icon: <AlertCircle className="mr-1.5 h-3 w-3"/>, label: 'API Limit' };
      case 'error':
          return { variant: 'destructive', icon: <XCircle className="mr-1.5 h-3 w-3"/>, label: 'Error' };
      default:
          return { variant: 'secondary', icon: <AlertCircle className="mr-1.5 h-3 w-3"/>, label: 'Unknown' };
  }
};


export default function HomePage() {
  const [extractedInfo, setExtractedInfo] = useState<ExtractedContactInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [recentEmails, setRecentEmails] = useState<RecentEmail[]>([]);
  const [isFetchingEmails, setIsFetchingEmails] = useState(false);
  const [isGisLoaded, setIsGisLoaded] = useState(false);

  const [isLinkedInValidating, setIsLinkedInValidating] = useState(false);
  const [linkedInResult, setLinkedInResult] = useState<LinkedInValidationOutput | null>(null);
  const [linkedInError, setLinkedInError] = useState<string | null>(null);


  const { toast } = useToast();

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { email: '' },
  });

  const linkedinForm = useForm<LinkedInFormValues>({
    resolver: zodResolver(linkedinFormSchema),
    defaultValues: { linkedinUrl: '', company: '' },
  });


  useEffect(() => {
    initialize(() => {
      setIsGisLoaded(true);
      const authenticated = isUserAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        handleRefresh();
      }
    });
  }, []);

  // When contact info is extracted, pre-fill the LinkedIn form
  useEffect(() => {
    if (extractedInfo?.linkedin && extractedInfo?.company) {
      linkedinForm.reset({
        linkedinUrl: extractedInfo.linkedin,
        company: extractedInfo.company,
      });
    }
  }, [extractedInfo, linkedinForm]);

  const onConnect = () => {
    handleSignIn();
    const interval = setInterval(() => {
      const authenticated = isUserAuthenticated();
      if (authenticated) {
        setIsAuthenticated(true);
        handleRefresh();
        clearInterval(interval);
      }
    }, 500);
  };
  
  const handleRefresh = async () => {
    setIsFetchingEmails(true);
    try {
      const emails = await getRecentEmails();
      setRecentEmails(emails);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch recent emails.',
        variant: 'destructive',
      });
    } finally {
      setIsFetchingEmails(false);
    }
  };


  const onEmailSubmit: SubmitHandler<EmailFormValues> = async (data) => {
    setIsProcessing(true);
    setExtractedInfo(null);
    setError(null);
    try {
      if (!isUserAuthenticated()) {
        throw new Error("Please connect with Gmail first.");
      }

      const emailBody = await getLatestEmailBody(data.email);

      if (!emailBody) {
        throw new Error(`No recent email found from ${data.email}.`);
      }

      const result = await processSingleEmail({ emailBody: emailBody, senderEmail: data.email });

      if (result.success && result.data) {
        setExtractedInfo(result.data);
      } else {
        setError(result.error || "Could not process email. Please check server logs.");
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };


  const onLinkedInSubmit: SubmitHandler<LinkedInFormValues> = async (data) => {
    setIsLinkedInValidating(true);
    setLinkedInResult(null);
    setLinkedInError(null);
    try {
        const result = await validateProfileOnLinkedIn(data);
        if (result.success && result.data) {
            setLinkedInResult(result.data);
        } else {
            setLinkedInError(result.error || "An unknown validation error occurred.");
        }
    } catch (e: any) {
        setLinkedInError(e.message || 'An unexpected error occurred.');
    } finally {
        setIsLinkedInValidating(false);
    }
  };


  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto grid gap-8">
        <header className="text-center">
          <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tighter text-foreground">
            Email Contact Extractor
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Connect your Gmail to find a client's latest email, and use AI to extract their key information.
          </p>
        </header>

        {!isAuthenticated && (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Connect to Gmail</CardTitle>
              <CardDescription>You need to authorize the app to read your Gmail inbox.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={onConnect} className="w-full" disabled={!isGisLoaded}>
                { !isGisLoaded ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2" /> }
                { !isGisLoaded ? 'Initializing...' : 'Connect with Gmail' }
              </Button>
            </CardFooter>
          </Card>
        )}

        {isAuthenticated && (
           <div className="grid gap-8 md:grid-cols-2">
           <Card>
             <Form {...emailForm}>
               <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="flex flex-col h-full">
                 <CardHeader>
                   <CardTitle>Extract Contact Information</CardTitle>
                   <CardDescription>Enter an email to find and process the latest email from that sender.</CardDescription>
                 </CardHeader>
                 <CardContent className="flex-grow">
                   <FormField
                     control={emailForm.control}
                     name="email"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Client's Email Address</FormLabel>
                         <FormControl>
                           <Input placeholder="name@example.com" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 </CardContent>
                 <CardFooter>
                   <Button type="submit" disabled={isProcessing} className="w-full">
                     {isProcessing ? (
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     ) : null}
                     Fetch & Extract Contact
                   </Button>
                 </CardFooter>
               </form>
             </Form>
           </Card>
 
           <Card>
             <CardHeader>
               <CardTitle>Extracted Information</CardTitle>
               <CardDescription>Contact details will appear here after processing.</CardDescription>
             </CardHeader>
             <CardContent className="h-[250px] flex items-center justify-center">
               {isProcessing && (
                 <div className="flex flex-col items-center gap-2">
                   <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                   <p className="text-muted-foreground text-sm">Extracting information...</p>
                 </div>
               )}
               {error && (
                 <div className="text-destructive text-sm font-medium text-center">{error}</div>
               )}
               {!isProcessing && !error && !extractedInfo && (
                 <div className="text-center text-muted-foreground">
                   <p>Awaiting submission...</p>
                 </div>
               )}
               {extractedInfo && (
                 <div className="space-y-4 w-full">
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
                       <p className="font-medium break-all">{extractedInfo.linkedin ? <a href={extractedInfo.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{extractedInfo.linkedin}</a> : 'NA'}</p>
                     </div>
                   </div>
                 </div>
               )}
             </CardContent>
           </Card>
          </div>
        )}

        {isAuthenticated && (
           <div className="grid gap-8 md:grid-cols-2">
           <Card>
             <Form {...linkedinForm}>
               <form onSubmit={linkedinForm.handleSubmit(onLinkedInSubmit)} className="flex flex-col h-full">
                 <CardHeader>
                   <CardTitle>LinkedIn Profile Validation</CardTitle>
                   <CardDescription>Enter a profile URL and company to validate against the LinkedIn service.</CardDescription>
                 </CardHeader>
                 <CardContent className="flex-grow space-y-4">
                    <FormField
                     control={linkedinForm.control}
                     name="linkedinUrl"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>LinkedIn Profile URL</FormLabel>
                         <FormControl>
                           <Input placeholder="https://www.linkedin.com/in/username" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                    <FormField
                     control={linkedinForm.control}
                     name="company"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Company Name</FormLabel>
                         <FormControl>
                           <Input placeholder="ExampleCorp" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 </CardContent>
                 <CardFooter>
                   <Button type="submit" disabled={isLinkedInValidating} className="w-full">
                     {isLinkedInValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                     Validate Profile
                   </Button>
                 </CardFooter>
               </form>
             </Form>
           </Card>
 
           <Card>
             <CardHeader>
               <CardTitle>Validation Result</CardTitle>
               <CardDescription>The result of the LinkedIn validation will appear here.</CardDescription>
             </CardHeader>
             <CardContent className="h-[250px] flex items-center justify-center">
                {isLinkedInValidating && (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-muted-foreground text-sm">Validating...</p>
                    </div>
                )}
                {linkedInError && (
                    <div className="text-destructive text-sm font-medium text-center">{linkedInError}</div>
                )}
                {!isLinkedInValidating && !linkedInError && !linkedInResult && (
                    <div className="text-center text-muted-foreground">
                        <p>Awaiting validation...</p>
                    </div>
                )}
                {linkedInResult && (
                  <div className="w-full space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={getStatusConfig(linkedInResult.status).variant} className="mt-1">
                          {getStatusConfig(linkedInResult.status).icon}
                          {getStatusConfig(linkedInResult.status).label}
                      </Badge>
                    </div>
                    <Separator/>
                     <div>
                      <p className="text-sm text-muted-foreground">Message</p>
                      <p className="font-medium">{linkedInResult.message}</p>
                    </div>
                    {linkedInResult.linkedInProfileUrl && (
                      <>
                        <Separator/>
                        <div>
                          <p className="text-sm text-muted-foreground">LinkedIn Profile</p>
                          <a href={linkedInResult.linkedInProfileUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline break-all">
                            {linkedInResult.linkedInProfileUrl}
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                )}
             </CardContent>
           </Card>
          </div>
        )}

        {isAuthenticated && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Emails</CardTitle>
                <CardDescription>Your 5 most recent emails.</CardDescription>
              </div>
              <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isFetchingEmails}>
                {isFetchingEmails ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </CardHeader>
            <CardContent>
              {isFetchingEmails && recentEmails.length === 0 ? (
                <div className="flex justify-center items-center h-24">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : recentEmails.length > 0 ? (
                <ul className="space-y-4">
                  {recentEmails.map(email => (
                    <li key={email.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <p className="font-semibold">{email.subject}</p>
                      <p className="text-sm text-muted-foreground">From: {email.from}</p>
                      <p className="text-sm text-muted-foreground truncate">{email.snippet}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-muted-foreground">No recent emails found.</p>              )}
            </CardContent>
            <CardFooter>
                 <Button variant="outline" onClick={handleSignOut} className="w-full">Sign Out of Gmail</Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
