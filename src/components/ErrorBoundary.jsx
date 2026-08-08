import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
    } catch (_) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
          <div className="glass-panel max-w-md p-8 rounded-3xl border border-slate-800 space-y-4">
            <div className="w-16 h-16 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400 text-2xl font-bold">
              🎧
            </div>
            <h2 className="text-2xl font-extrabold">Urban Root Audiobooks</h2>
            <p className="text-xs text-slate-400">
              The application encountered a temporary display issue while loading your store catalog.
            </p>
            <div className="pt-2">
              <button
                onClick={this.handleReset}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all"
              >
                🔄 Restore & Load Storefront
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
