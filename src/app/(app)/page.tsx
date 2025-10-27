
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Welcome!</CardTitle>
            <CardDescription>
              Your application has been reset to a clean starting point.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>You can now ask me to build new features from this stable foundation.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
