// import React from 'react'; removed
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export function GlobalErrorFallback({ error, resetErrorBoundary }: { error: any; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen bg-deck-dark text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-deck-card/50 p-8 rounded-2xl border border-deck-border max-w-lg w-full backdrop-blur-sm shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-500/10 rounded-full">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-4 font-outfit">Something went wrong</h1>
        <p className="text-gray-400 mb-6 font-inter text-sm">
          We encountered an unexpected error. Our engineering team has been notified.
        </p>
        
        {import.meta.env.DEV && (
          <div className="bg-black/50 p-4 rounded-lg text-left overflow-auto max-h-40 mb-6 border border-deck-border/50">
            <code className="text-red-400 text-xs">{error.message}</code>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={resetErrorBoundary}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-deck-accent text-white rounded-lg hover:bg-deck-accent/90 transition-all font-medium"
          >
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </button>
          
          <Link 
            to="/" 
            onClick={resetErrorBoundary}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-deck-card border border-deck-border text-white rounded-lg hover:bg-deck-card/80 transition-all font-medium"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
