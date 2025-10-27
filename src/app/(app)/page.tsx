
'use client';

import { useEffect, useState } from 'react';
import {
  initialize,
  handleSignIn,
  listMessages,
  getLatestEmailBody,
  getAttachmentData,
  Message,
  Attachment,
  filterMessagesByRegisteredSenders,
} from '@/services/gmail';
import { processSingleEmail } from '@/firebase/server/db';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ArrowPathIcon,
  ExclamationCircleIcon,
  PaperclipIcon,
} from '@heroicons/react/24/outline';
import { type ExtractedContactInfo } from '@/ai/schemas';

type Status = 'idle' | 'loading' | 'success' | 'error';
const SUPPORTED_ATTACHMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export default function HomePage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<Record<string, Attachment[]>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const [processedEmails, setProcessedEmails] = useState<
    Record<string, ExtractedContactInfo | null>
  >({});
  const [processingState, setProcessingState] = useState<
    Record<string, { isProcessing: boolean; error?: string }>
  >({});

  const onAuthSuccess = () => {
    setIsSignedIn(true);
    fetchMessages();
  };

  const onAuthInit = () => {
    setStatus('idle');
  };

  useEffect(() => {
    initialize(onAuthSuccess, onAuthInit);
  }, []);

  const fetchMessages = async () => {
    setStatus('loading');
    setError(null);
    try {
      const fetchedMessages = await listMessages();
      const filteredMessages = await filterMessagesByRegisteredSenders(fetchedMessages);
      setMessages(filteredMessages);

      // After fetching messages, fetch their attachments
      const newAttachments: Record<string, Attachment[]> = {};
      for (const message of filteredMessages) {
        const { attachments } = await getLatestEmailBody(message.id);
        newAttachments[message.id] = attachments;
      }
      setAttachments(newAttachments);

      setStatus('success');
    } catch (err: any) {
      setError('Failed to fetch messages. Please try again.');
      setStatus('error');
      console.error(err);
    }
  };

  const onEmailSubmit = async (message: Message) => {
    const processId = message.id; // Can be a message ID or attachment ID
    setProcessingState((prev) => ({
      ...prev,
      [processId]: { isProcessing: true, error: undefined },
    }));
    setProcessedEmails((prev) => ({ ...prev, [processId]: null }));

    try {
      const messageAttachments = attachments[message.id] || [];
      const supportedAttachment = messageAttachments.find(att => SUPPORTED_ATTACHMENT_TYPES.includes(att.mimeType));

      if (!supportedAttachment) {
        setProcessingState((prev) => ({
          ...prev,
          [processId]: { isProcessing: false, error: 'No supported attachment (PDF, DOCX, XLSX) found.' },
        }));
        return;
      }

      // Fetch attachment data as base64 string
      const attachmentData = await getAttachmentData(message.id, supportedAttachment.attachmentId);

      const result = await processSingleEmail({
        senderEmail: message.senderEmail,
        attachmentId: supportedAttachment.attachmentId,
        attachmentData: attachmentData,
        mimeType: supportedAttachment.mimeType,
      });

      if (result.success && result.data) {
        setProcessedEmails((prev) => ({ ...prev, [processId]: result.data }));
      } else {
        setProcessingState((prev) => ({
          ...prev,
          [processId]: { isProcessing: false, error: result.error },
        }));
      }
    } catch (err) {
      setProcessingState((prev) => ({
        ...prev,
        [processId]: { isProcessing: false, error: 'Failed to process email attachment.' },
      }));
      console.error(err);
    } finally {
      setProcessingState((prev) => ({
        ...prev,
        [processId]: { ...prev[processId], isProcessing: false },
      }));
    }
  };

  const GmailConnectCard = () => (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Connect to Your Inbox
          </CardTitle>
          <CardDescription>
            Sign in with Google to process your latest emails.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSignIn} className="w-full">
            Connect with Gmail
          </Button>
        </CardContent>
        <CardFooter className="text-xs text-gray-500">
          <p>
            By connecting, you allow this app to read your email messages and
            attachments.
          </p>
        </CardFooter>
      </Card>
    </div>
  );

  if (!isSignedIn) {
    return <GmailConnectCard />;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Email Dashboard</h1>
        <Button onClick={fetchMessages} disabled={status === 'loading'}>
          {status === 'loading' ? (
            <ArrowPathIcon className="mr-2 h-5 w-5 animate-spin" />
          ) : null}
          Refresh Emails
        </Button>
      </header>

      {status === 'loading' && <p>Loading emails...</p>}
      {status === 'error' && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationCircleIcon
                className="h-5 w-5 text-red-400"
                aria-hidden="true"
              />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {status === 'success' && messages.length === 0 && (
        <p>No new emails from registered senders found.</p>
      )}

      {status === 'success' && messages.length > 0 && (
        <div className="space-y-4">
          {messages.map((message) => {
            const processedData = processedEmails[message.id];
            const state = processingState[message.id] || { isProcessing: false };
            const messageAttachments = attachments[message.id] || [];

            return (
              <Card key={message.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-medium">
                        {message.senderName}
                      </CardTitle>
                      <CardDescription>{message.senderEmail}</CardDescription>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(message.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{message.snippet}</p>
                   {messageAttachments.length > 0 && (
                    <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Attachments:</h4>
                        <div className="flex flex-wrap gap-2">
                        {messageAttachments.map(att => (
                            <div key={att.attachmentId} className="flex items-center gap-2 text-sm bg-gray-100 p-2 rounded-md">
                                <PaperclipIcon className="h-4 w-4 text-gray-500" />
                                <span>{att.filename}</span>
                                <span className="text-gray-500">({(att.size / 1024).toFixed(2)} KB)</span>
                            </div>
                        ))}
                        </div>
                    </div>
                   )}
                  <div className="mt-4">
                    <Button
                      onClick={() => onEmailSubmit(message)}
                      disabled={state.isProcessing}
                    >
                      {state.isProcessing ? 'Processing Attachment...' : 'Process Attachment'}
                    </Button>
                  </div>
                </CardContent>
                {processedData && (
                  <CardFooter className="flex-col items-start gap-2">
                    <h4 className="font-semibold">Extracted Information:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 rounded-md bg-gray-100 p-4 text-sm w-full">
                      <p><strong>First Name:</strong> {processedData.firstName || 'N/A'}</p>
                      <p><strong>Last Name:</strong> {processedData.lastName || 'N/A'}</p>
                      <p><strong>Email:</strong> {processedData.email || 'N/A'}</p>
                      <p><strong>Contact:</strong> {processedData.contactNumber || 'N/A'}</p>
                      <p><strong>Experience:</strong> {processedData.experience || 'N/A'}</p>
                      <p><strong>LinkedIn:</strong> {processedData.linkedin || 'N/A'}</p>
                    </div>
                  </CardFooter>
                )}
                 {state.error && (
                  <CardFooter>
                    <p className="text-sm text-red-600">{state.error}</p>
                  </CardFooter>
                 )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
