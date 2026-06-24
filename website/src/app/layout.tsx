import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CommitLock - Payment Setup',
  description: 'Securely link your payment method to use CommitLock.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main className="page-wrapper">
          {children}
        </main>
      </body>
    </html>
  );
}
