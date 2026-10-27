export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3 font-semibold">
            <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-sm text-white">
              TF
            </span>
            <span className="text-lg tracking-tight">TeamFlow</span>
          </div>
          <span className="text-sm text-slate-500">
            Project management for focused teams
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <p className="mb-5 text-sm font-semibold tracking-[0.18em] text-indigo-700 uppercase">
          A clearer way to work together
        </p>
        <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-slate-950 sm:text-6xl">
          Turn team plans into progress.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          TeamFlow brings your workspaces, projects, and tasks together, so
          everyone knows what matters and what comes next.
        </p>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-indigo-700">01</p>
            <h2 className="mt-4 text-lg font-semibold">Organize projects</h2>
            <p className="mt-2 leading-7 text-slate-600">
              Keep your team&apos;s work together in one shared workspace.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-indigo-700">02</p>
            <h2 className="mt-4 text-lg font-semibold">Clarify ownership</h2>
            <p className="mt-2 leading-7 text-slate-600">
              Give tasks a clear owner, priority, and next step.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-indigo-700">03</p>
            <h2 className="mt-4 text-lg font-semibold">See what changed</h2>
            <p className="mt-2 leading-7 text-slate-600">
              Follow progress with a reliable history of important updates.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
