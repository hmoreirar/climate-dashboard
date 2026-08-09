export default function Loading() {
  return (
    <main className="min-h-screen bg-canvas text-content p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-8 w-56 rounded-lg bg-card" />
              <div className="h-4 w-40 rounded bg-card" />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <div className="h-8 w-12 rounded-md bg-card" />
                <div className="h-8 w-12 rounded-md bg-card" />
                <div className="h-8 w-12 rounded-md bg-card" />
                <div className="h-8 w-12 rounded-md bg-card" />
              </div>
              <div className="h-4 w-16 rounded bg-card" />
              <div className="h-9 w-9 rounded-lg border border-line bg-card" />
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-card" />
            <div className="h-4 w-56 rounded bg-card" />
            <div className="h-3 w-24 rounded bg-card" />
          </div>

          <div className="rounded-2xl border border-line bg-card/80 p-4 sm:p-5 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-5 w-5 rounded bg-card" />
              <div className="h-4 w-20 rounded bg-card" />
            </div>
            <div className="h-12 w-36 rounded bg-card" />
            <div className="mt-4 flex gap-4">
              <div className="h-4 w-16 rounded bg-card" />
              <div className="h-4 w-16 rounded bg-card" />
              <div className="h-4 w-16 rounded bg-card" />
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-card/80 p-4 sm:p-5 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-5 w-5 rounded bg-card" />
              <div className="h-4 w-16 rounded bg-card" />
            </div>
            <div className="h-12 w-36 rounded bg-card" />
            <div className="mt-4 flex gap-4">
              <div className="h-4 w-16 rounded bg-card" />
              <div className="h-4 w-16 rounded bg-card" />
              <div className="h-4 w-16 rounded bg-card" />
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-line bg-card/80 p-4 sm:p-5">
              <div className="h-4 w-16 rounded bg-card mb-4" />
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-card" />
                <div className="space-y-2">
                  <div className="h-8 w-20 rounded bg-card" />
                  <div className="h-3 w-16 rounded bg-card" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="h-8 rounded bg-card" />
                <div className="h-8 rounded bg-card" />
                <div className="h-8 rounded bg-card" />
              </div>
              <div className="border-t border-line pt-3 grid grid-cols-3 gap-2">
                <div className="h-12 rounded bg-card" />
                <div className="h-12 rounded bg-card" />
                <div className="h-12 rounded bg-card" />
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-card/80 p-4 sm:p-5">
              <div className="h-4 w-16 rounded bg-card mb-4" />
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-card" />
                <div className="space-y-2">
                  <div className="h-6 w-16 rounded bg-card" />
                  <div className="h-3 w-24 rounded bg-card" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-12 rounded-lg border border-line bg-card" />
                <div className="h-12 rounded-lg border border-line bg-card" />
                <div className="h-12 rounded-lg border border-line bg-card" />
                <div className="h-12 rounded-lg border border-line bg-card" />
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 rounded-2xl border border-line bg-card/80 p-4 sm:p-5 md:p-6">
            <div className="h-6 w-48 rounded bg-card mb-6" />
            <div className="h-[320px] rounded-xl bg-card" />
          </div>

          <div className="col-span-1 md:col-span-2 rounded-2xl border border-line bg-card/80 p-4 sm:p-5 md:p-6">
            <div className="h-6 w-44 rounded bg-card mb-6" />
            <div className="h-[320px] rounded-xl bg-card" />
          </div>

          <div className="col-span-1 md:col-span-2 rounded-2xl border border-line bg-card/80">
            <div className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div className="h-6 w-40 rounded bg-card" />
                <div className="h-5 w-5 rounded bg-card" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
