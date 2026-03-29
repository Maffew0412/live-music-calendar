import { ViewToggle } from '../ui/ViewToggle';

function SoundWaves() {
  return (
    <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-[3px] pb-1 opacity-20">
      {[28, 40, 22, 50, 35, 18, 45, 30, 55, 25, 42, 20, 48, 32, 15, 38, 26, 52, 34, 22, 44, 28, 50, 36, 18, 46, 30, 42, 24, 54].map((h, i) => (
        <div
          key={i}
          className="w-[2px] rounded-full bg-purple-300"
          style={{
            height: `${h}%`,
            animation: `pulse ${1.5 + (i % 5) * 0.3}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

function BostonSkyline() {
  return (
    <svg
      className="absolute bottom-0 left-0 right-0 w-full"
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      style={{ height: '60px' }}
    >
      <defs>
        <linearGradient id="skylineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(99,102,241,0.3)" />
          <stop offset="50%" stopColor="rgba(168,85,247,0.4)" />
          <stop offset="100%" stopColor="rgba(99,102,241,0.3)" />
        </linearGradient>
      </defs>
      {/* Simplified Boston skyline: Zakim-inspired bridge, Prudential, Hancock, Custom House */}
      <path
        d="M0,120 L0,90 L60,90 L65,70 L70,90 L120,90 L120,85 L130,85 L130,90
           L200,90 L200,60 L205,58 L210,60 L210,90
           L280,90 L285,85 L290,80 L293,45 L296,40 L299,45 L302,80 L307,85 L312,90
           L380,90 L385,88 L388,30 L390,25 L392,20 L394,25 L396,30 L399,88 L404,90
           L440,90 L442,65 L446,62 L450,65 L450,90
           L500,90 L502,75 L506,72 L510,75 L510,90
           L560,90 L562,50 L564,48 L568,45 L572,48 L574,50 L574,90
           L620,90 L625,55 L628,35 L630,20 L632,15 L634,20 L636,35 L639,55 L644,90
           L700,90 L702,82 L706,80 L710,82 L710,90
           L750,90 L755,70 L758,68 L762,70 L762,90
           L810,90 L812,45 L815,42 L818,40 L821,42 L824,45 L824,90
           L880,90 L882,75 L886,72 L890,75 L890,90
           L940,90 L945,60 L948,55 L952,60 L952,90
           L1000,90 L1002,80 L1006,78 L1010,80 L1010,90
           L1060,90 L1062,70 L1066,68 L1070,70 L1070,90
           L1120,90 L1125,85 L1130,82 L1135,85 L1140,90
           L1200,90 L1200,120 Z"
        fill="url(#skylineGrad)"
      />
      {/* Ground line */}
      <rect x="0" y="90" width="1200" height="30" fill="rgba(15,23,42,0.6)" />
    </svg>
  );
}

export function Header() {
  return (
    <header className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 px-4 py-8 sm:px-6 sm:py-10">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 50%, rgba(168,85,247,0.3) 0%, transparent 50%),
                           radial-gradient(circle at 75% 50%, rgba(99,102,241,0.3) 0%, transparent 50%)`,
        }} />
      </div>

      <SoundWaves />
      <BostonSkyline />

      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Hub <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Live</span>
          </h1>
          <p className="mt-1 text-sm text-indigo-200/70">
            Discover live music across Greater Boston
          </p>
        </div>
        <ViewToggle />
      </div>
    </header>
  );
}
