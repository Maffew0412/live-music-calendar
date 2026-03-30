import { ViewToggle } from '../ui/ViewToggle';
import { useFilters } from '../../hooks/useFilters';
import { CITY_PROFILES, type CityKey } from '../../config/constants';

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
      {/* Simplified Boston skyline */}
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
      <rect x="0" y="90" width="1200" height="30" fill="rgba(15,23,42,0.6)" />
    </svg>
  );
}

function SpringfieldSkyline() {
  return (
    <svg
      className="absolute bottom-0 left-0 right-0 w-full"
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      style={{ height: '60px' }}
    >
      <defs>
        <linearGradient id="skylineGradSPR" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(99,102,241,0.3)" />
          <stop offset="50%" stopColor="rgba(168,85,247,0.4)" />
          <stop offset="100%" stopColor="rgba(99,102,241,0.3)" />
        </linearGradient>
      </defs>
      {/* Illinois Capitol dome centerpiece + prairie cityscape */}
      <path
        d="M0,120 L0,92 L80,92 L82,88 L86,88 L88,92
           L140,92 L142,85 L146,82 L150,85 L152,92
           L200,92 L202,86 L206,84 L210,86 L212,92
           L260,92 L265,80 L268,78 L272,78 L275,80 L280,92
           L330,92 L332,84 L336,82 L340,84 L342,92
           L390,92 L392,86 L396,84 L400,86 L402,92
           L440,92
           L445,92 L447,82 L450,78 L453,72 L456,78 L458,82 L460,92
           L490,92
           L495,92 L497,80 L500,74 L502,68
           L506,58 L508,50 L510,42 L512,36 L514,32 L516,28 L518,32 L520,36 L522,42 L524,50 L526,58
           L530,68 L532,74 L534,80 L536,92
           L560,92
           L562,92 L564,82 L568,78 L572,82 L574,92
           L610,92
           L612,86 L616,84 L620,86 L622,92
           L670,92 L672,80 L676,78 L680,80 L682,92
           L730,92 L732,85 L736,83 L740,85 L742,92
           L790,92 L792,88 L796,86 L800,88 L802,92
           L850,92 L852,82 L856,80 L860,82 L862,92
           L910,92 L912,86 L916,84 L920,86 L922,92
           L970,92 L972,88 L976,86 L980,88 L982,92
           L1040,92 L1042,84 L1046,82 L1050,84 L1052,92
           L1110,92 L1112,88 L1116,86 L1120,88 L1122,92
           L1200,92 L1200,120 Z"
        fill="url(#skylineGradSPR)"
      />
      <rect x="0" y="92" width="1200" height="28" fill="rgba(15,23,42,0.6)" />
    </svg>
  );
}

function CityToggle() {
  const { filters, dispatch } = useFilters();

  const cities: { key: CityKey; label: string }[] = [
    { key: 'boston', label: 'Boston' },
    { key: 'springfield', label: 'Springfield' },
  ];

  return (
    <div className="inline-flex rounded-lg border border-white/20 bg-white/10 p-0.5 backdrop-blur-sm">
      {cities.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => dispatch({ type: 'SET_CITY', payload: key })}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            filters.activeCity === key
              ? 'bg-white text-indigo-900 shadow-sm'
              : 'text-indigo-200 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const { filters } = useFilters();
  const profile = CITY_PROFILES[filters.activeCity];

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
      {filters.activeCity === 'boston' ? <BostonSkyline /> : <SpringfieldSkyline />}

      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Hub <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Live</span>
          </h1>
          <p className="mt-1 text-sm text-indigo-200/70">
            {profile.subtitle}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <CityToggle />
          <ViewToggle />
        </div>
      </div>
    </header>
  );
}
