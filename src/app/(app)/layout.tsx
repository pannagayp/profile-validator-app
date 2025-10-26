
import { FirebaseClientProvider } from '@/firebase';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseClientProvider>
      <main>{children}</main>
    </FirebaseClientProvider>
  );
}

    