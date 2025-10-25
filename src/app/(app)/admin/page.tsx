import { ErrorReport } from './error-report';

export default function AdminPage() {
  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tighter text-foreground">
            Admin Error Reports
          </h1>
          <p className="text-muted-foreground mt-2">
            Review validation failures and use the AI-powered tool to generate a summary.
          </p>
        </header>
        <ErrorReport />
      </div>
    </div>
  );
}
