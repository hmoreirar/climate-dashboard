export default function Loading() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-4xl animate-pulse">
        <div className="h-10 sm:h-11 md:h-12 w-72 sm:w-80 md:w-96 rounded-lg bg-zinc-800" />
        <div className="mt-2 h-4 w-56 sm:w-64 md:w-72 rounded bg-zinc-800" />

        <div className="mt-8 mb-10 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-zinc-800" />
          <div className="h-4 w-48 rounded bg-zinc-800" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-32 rounded-2xl bg-zinc-900" />
          <div className="h-32 rounded-2xl bg-zinc-900" />
        </div>

        <div className="mt-6 h-28 rounded-2xl bg-zinc-900" />

        <div className="mt-6 h-[400px] rounded-2xl bg-zinc-900" />
        <div className="mt-6 h-[400px] rounded-2xl bg-zinc-900" />
      </div>
    </main>
  );
}
