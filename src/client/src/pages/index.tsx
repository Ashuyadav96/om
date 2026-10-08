import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';

// Temporary placeholder components
const AgentAvatar = ({ agent }: { agent: string }) => {
  const colors = {
    claude: 'bg-gradient-to-br from-orange-500 to-amber-600',
    codex: 'bg-gradient-to-br from-green-500 to-emerald-600',
    hermes: 'bg-gradient-to-br from-purple-500 to-pink-600',
  };
  
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colors[agent as keyof typeof colors] || 'bg-secondary-700'}`}>
      <span className="text-white font-bold text-sm">{agent.charAt(0).toUpperCase()}</span>
    </div>
  );
};

const FeatureCard = ({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) => (
  <div className="card p-6 hover:border-secondary-600 transition-colors duration-200 group">
    <div className="text-primary-500 mb-4 text-2xl">{icon}</div>
    <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-primary-400 transition-colors">
      {title}
    </h3>
    <p className="text-secondary-400">{description}</p>
  </div>
);

const HeroSection = () => (
  <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
    <div className="absolute inset-0 bg-gradient-to-b from-secondary-950 via-secondary-900 to-secondary-950 opacity-80" />
    <div className="relative z-10 max-w-6xl mx-auto text-center">
      <div className="inline-flex items-center bg-secondary-800/50 border border-secondary-700 rounded-full px-4 py-2 mb-8">
        <span className="text-primary-400 text-sm font-medium">
          ⚡ Multiplayer AI is here
        </span>
      </div>
      
      <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
        Google Docs for
        <span className="text-gradient ml-2">AI Agents</span>
      </h1>
      
      <p className="text-xl md:text-2xl text-secondary-300 mb-10 max-w-3xl mx-auto">
        Real-time collaboration for teams working with AI. 
        Hand off tasks, track progress, and work together with Claude, Codex, and more.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
        <Link href="/app" className="btn btn-primary px-8 py-3 text-lg">
          Start Collaborating
        </Link>
        <a 
          href="https://github.com/Ashuyadav96/om"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost border border-secondary-700 px-8 py-3 text-lg"
        >
          View on GitHub
        </a>
      </div>

      {/* Agent avatars */}
      <div className="flex justify-center items-center space-x-4 mb-16">
        <div className="flex -space-x-2">
          <AgentAvatar agent="claude" />
          <AgentAvatar agent="codex" />
          <AgentAvatar agent="hermes" />
        </div>
        <span className="text-secondary-400 ml-4">+ More</span>
      </div>

      {/* Demo screenshot placeholder */}
      <div className="relative max-w-4xl mx-auto">
        <div className="card p-8 border border-secondary-700 bg-secondary-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
            <span className="text-secondary-400 text-sm">Session: Team Debugging</span>
          </div>
          <div className="space-y-4 text-left">
            <div className="flex items-start space-x-3">
              <AgentAvatar agent="claude" />
              <div className="chat-bubble chat-bubble-agent">
                <p>I've analyzed the code. The issue appears to be in the authentication middleware. Here are three potential fixes:</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 justify-end">
              <div className="chat-bubble chat-bubble-user">
                <p>Claude, can you explain the first option in more detail?</p>
              </div>
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold">A</div>
            </div>
            <div className="flex items-start space-x-3">
              <AgentAvatar agent="claude" />
              <div className="chat-bubble chat-bubble-agent">
                <p>Certainly! Option 1 involves modifying the JWT validation logic to...</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 justify-end">
              <div className="chat-bubble chat-bubble-user">
                <p className="code-block-inline">const validateToken = async (token) => { ... }</p>
              </div>
              <div className="w-8 h-8 bg-secondary-600 rounded-full flex items-center justify-center text-white text-sm font-bold">B</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-secondary-700 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-secondary-400 text-sm">2 users online</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-secondary-400 text-sm">Active: Claude</span>
              <AgentAvatar agent="claude" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const FeaturesSection = () => (
  <section className="py-20 px-4">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-white mb-4">
          Built for Team Collaboration
        </h2>
        <p className="text-xl text-secondary-400">
          Everything you need to work together with AI agents in real time.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard
          title="Shared AI Sessions"
          description="Multiple users can interact with the same AI agent simultaneously, just like a shared Google Doc."
          icon="🤖"
        />
        <FeatureCard
          title="Live Cursors"
          description="See where your teammates are typing and editing in real time, with color-coded cursors."
          icon="✏️"
        />
        <FeatureCard
          title="Agent Handoffs"
          description="Seamlessly pass control of the AI to another team member mid-task without losing context."
          icon="🔄"
        />
        <FeatureCard
          title="Multi-Agent Support"
          description="Switch between Claude, Codex, Hermes, and other AI agents based on your needs."
          icon="⭐"
        />
        <FeatureCard
          title="Session History"
          description="Full version history with the ability to restore previous states and track changes."
          icon="📜"
        />
        <FeatureCard
          title="Real-Time Sync"
          description="Conflict-free synchronization using CRDTs, ensuring everyone sees the same state."
          icon="⚡"
        />
      </div>
    </div>
  </section>
);

const UseCasesSection = () => (
  <section className="py-20 px-4 bg-secondary-900/30">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-white mb-4">
          Perfect for Any Team
        </h2>
        <p className="text-xl text-secondary-400">
          From engineering to legal, every team can benefit from multiplayer AI.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="card p-8 hover:border-primary-500 transition-colors group">
          <div className="text-4xl mb-4">💻</div>
          <h3 className="text-2xl font-semibold text-white mb-3">Engineering Teams</h3>
          <p className="text-secondary-400 mb-4">
            Live pair programming with AI + multiple engineers. Debug together, review code collaboratively, and hand off tasks seamlessly.
          </p>
          <Link href="/app" className="text-primary-400 hover:text-primary-300 font-medium">
            Try for Engineering →
          </Link>
        </div>

        <div className="card p-8 hover:border-accent-500 transition-colors group">
          <div className="text-4xl mb-4">📈</div>
          <h3 className="text-2xl font-semibold text-white mb-3">Sales Teams</h3>
          <p className="text-secondary-400 mb-4">
            Collaborate on proposals, draft pitches together, and use AI to generate personalized content for clients.
          </p>
          <Link href="/app" className="text-accent-400 hover:text-accent-300 font-medium">
            Try for Sales →
          </Link>
        </div>

        <div className="card p-8 hover:border-secondary-500 transition-colors group">
          <div className="text-4xl mb-4">⚖️</div>
          <h3 className="text-2xl font-semibold text-white mb-3">Legal Teams</h3>
          <p className="text-secondary-400 mb-4">
            Review contracts together, flag risky clauses with AI, and maintain a complete audit trail of all changes.
          </p>
          <Link href="/app" className="text-secondary-400 hover:text-secondary-300 font-medium">
            Try for Legal →
          </Link>
        </div>

        <div className="card p-8 hover:border-purple-500 transition-colors group">
          <div className="text-4xl mb-4">🎧</div>
          <h3 className="text-2xl font-semibold text-white mb-3">Support Teams</h3>
          <p className="text-secondary-400 mb-4">
            Resolve complex tickets together, use AI to suggest responses, and hand off conversations between agents.
          </p>
          <Link href="/app" className="text-purple-400 hover:text-purple-300 font-medium">
            Try for Support →
          </Link>
        </div>
      </div>
    </div>
  </section>
);

const CTASection = () => (
  <section className="py-20 px-4">
    <div className="max-w-4xl mx-auto text-center">
      <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
        Ready to Make AI a Team Sport?
      </h2>
      <p className="text-xl text-secondary-400 mb-10">
        Join the future of AI collaboration. Start your first multiplayer AI session today.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/app" className="btn btn-primary px-8 py-4 text-lg">
          Get Started Free
        </Link>
        <a 
          href="https://github.com/Ashuyadav96/om"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary px-8 py-4 text-lg"
        >
          Star on GitHub
        </a>
      </div>
      <p className="text-secondary-500 mt-6 text-sm">
        Free for up to 2 users and 5 sessions per month. No credit card required.
      </p>
    </div>
  </section>
);

const Footer = () => (
  <footer className="py-12 px-4 border-t border-secondary-800">
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div className="flex items-center space-x-2 mb-4 md:mb-0">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">OM</span>
          </div>
          <span className="text-xl font-semibold text-white">Multiplayer AI</span>
        </div>
        <div className="flex space-x-6">
          <Link href="/docs" className="text-secondary-400 hover:text-white transition-colors">
            Documentation
          </Link>
          <Link href="/pricing" className="text-secondary-400 hover:text-white transition-colors">
            Pricing
          </Link>
          <Link href="/blog" className="text-secondary-400 hover:text-white transition-colors">
            Blog
          </Link>
          <a href="https://github.com/Ashuyadav96/om" className="text-secondary-400 hover:text-white transition-colors">
            GitHub
          </a>
        </div>
      </div>
      <div className="text-center text-secondary-500 text-sm">
        <p>© {new Date().getFullYear()} Multiplayer AI Orchestration. All rights reserved.</p>
        <p className="mt-2">
          Built with ❤️ for teams that collaborate. 
          <span className="inline-flex items-center ml-2">
            <span className="text-primary-400">●</span>
            <span className="ml-1">YC RFS Fall 2026</span>
          </span>
        </p>
      </div>
    </div>
  </footer>
);

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  // Redirect signed-in users to the app
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/app');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Multiplayer AI Orchestration - Google Docs for AI Agents</title>
        <meta name="description" content="Real-time collaboration for teams working with AI agents" />
      </Head>
      
      <SignedOut>
        <main>
          <HeroSection />
          <FeaturesSection />
          <UseCasesSection />
          <CTASection />
          <Footer />
        </main>
      </SignedOut>
      
      <SignedIn>
        <RedirectToSignIn />
      </SignedIn>
    </>
  );
}
