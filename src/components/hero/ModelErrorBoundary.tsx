"use client";

import React from "react";

export class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { err: Error | null }
> {
  state = { err: null as Error | null };

  static getDerivedStateFromError(err: Error) {
    return { err };
  }

  render() {
    if (this.state.err) {
      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="max-w-[90vw] rounded-xl border border-white/15 bg-white/5 p-4 font-mono text-sm text-white">
            <div className="text-white/70">GLB load failed</div>
            <div className="mt-2 whitespace-pre-wrap text-white/90">
              {String(this.state.err.message || this.state.err)}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
