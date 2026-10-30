import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CommitLock — Commit to Your Goals. Literally.',
  description:
    'The ultimate habit accountability app. Set a fitness goal, stake real money, and let Apple or Google Health verify your results. Succeed or pay.',
  keywords: [
    'habit app',
    'accountability app',
    'fitness goals',
    'habit tracker',
    'commitment app',
    'health goals',
    'apple health',
    'google health',
  ],
  openGraph: {
    title: 'CommitLock — Commit to Your Goals. Literally.',
    description:
      'Set a fitness goal, stake real money, and let your health data verify the result. No excuses. No shortcuts.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CommitLock — Commit to Your Goals. Literally.',
    description:
      'The habit accountability app where failure has real financial consequences.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <main className="page-wrapper">{children}</main>
      </body>
    </html>
  );
}
