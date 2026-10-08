import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <meta name="description" content="Multiplayer AI Orchestration - Real-time collaboration for teams working with AI agents" />
        <meta name="theme-color" content="#0f172a" />
      </Head>
      <body className="bg-secondary-950 text-secondary-50 antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
