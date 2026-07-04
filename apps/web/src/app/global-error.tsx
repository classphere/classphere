"use client";
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-b-surface1">
          <h2 className="text-xl font-semibold text-t-primary">Critical application error</h2>
          <p className="text-sm text-t-secondary">The application encountered a fatal error.</p>
          <button 
            onClick={reset}
            className="px-6 py-2 bg-t-primary text-b-surface1 rounded-lg font-semibold"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
