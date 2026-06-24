const STEPS = [
  { num: 1, label: 'Dati fattura' },
  { num: 2, label: 'Agenti' },
  { num: 3, label: 'Quote soci' },
]

export default function StepIndicator({ currentStep }) {
  function getState(num) {
    if (num < currentStep) return 'done'
    if (num === currentStep) return 'active'
    return 'pending'
  }

  return (
    <div className="flex items-center mb-8 px-1">
      {STEPS.map((step, i) => {
        const state = getState(step.num)
        return (
          <div key={step.num} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                state === 'active' ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' :
                state === 'done'   ? 'bg-green-500 border-green-500 text-white' :
                                     'border-slate-200 text-slate-300 bg-white'
              }`}>
                {state === 'done' ? '✓' : step.num}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${
                state === 'active' ? 'text-blue-600' :
                state === 'done'   ? 'text-green-600' :
                                     'text-slate-400'
              }`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 mb-5 rounded-full transition-colors ${
                state === 'done' ? 'bg-green-400' : 'bg-slate-200'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
