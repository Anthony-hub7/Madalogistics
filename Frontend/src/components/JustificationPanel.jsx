import { useState } from 'react'

export default function JustificationPanel({ justification, runId }) {
  const [expanded, setExpanded] = useState(false)

  if (!justification) return null

  const lines = justification.split('\n').filter(Boolean)

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-gray-500 text-lg">description</span>
          <span className="text-sm font-medium text-gray-700">Justification du groupage</span>
        </div>
        <span className="material-symbols-outlined text-gray-400 text-lg transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}>
          expand_more
        </span>
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-200">
          <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono mt-3 leading-relaxed">
            {justification}
          </pre>
          {runId && (
            <div className="mt-2 text-xs text-gray-400">
              Run ID: {runId}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
