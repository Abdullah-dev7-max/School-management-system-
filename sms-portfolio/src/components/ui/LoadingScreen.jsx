import { BookOpenCheck } from 'lucide-react'

export default function LoadingScreen({ label = 'Preparing your workspace' }) {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-label={label}
      className="scholara-loader fixed inset-0 z-[100] grid min-h-screen place-items-center overflow-hidden px-6 text-white"
    >
      <div aria-hidden="true" className="scholara-loader-glow scholara-loader-glow-one" />
      <div aria-hidden="true" className="scholara-loader-glow scholara-loader-glow-two" />
      <div className="relative flex flex-col items-center text-center">
        <div className="scholara-loader-mark relative grid h-24 w-24 place-items-center rounded-[2rem]">
          <div aria-hidden="true" className="scholara-loader-orbit" />
          <div className="grid h-16 w-16 place-items-center rounded-[1.4rem] border border-white/15 bg-white/[0.08] shadow-glow">
            <BookOpenCheck aria-hidden="true" className="h-8 w-8 text-lilac-300" strokeWidth={1.7} />
          </div>
        </div>
        <p className="mt-7 text-xl font-semibold tracking-tight">Scholara</p>
        <p className="mt-2 text-sm text-white/60">{label}</p>
        <div aria-hidden="true" className="scholara-loader-progress mt-7 h-1 w-40 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full w-2/5 rounded-full bg-gradient-to-r from-lilac-400 to-sky-300" />
        </div>
      </div>
    </main>
  )
}
