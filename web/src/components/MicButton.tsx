import type { RecorderState } from '../hooks/useRecorder'

interface Props {
  recorderState: RecorderState
  transcribing: boolean
  disabled?: boolean
  onClick: () => void
}

export function MicButton({ recorderState, transcribing, disabled, onClick }: Props) {
  const recording = recorderState === 'recording'
  const unsupported = recorderState === 'unsupported'

  const title = unsupported
    ? 'Microphone not supported in this browser'
    : transcribing
      ? 'Transcribing…'
      : recording
        ? 'Stop recording'
        : 'Record a voice note'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || unsupported || transcribing}
      title={title}
      aria-label={title}
      className={[
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition',
        'disabled:cursor-not-allowed disabled:opacity-50',
        recording
          ? 'animate-pulse bg-red-500 text-white ring-4 ring-red-200'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      ].join(' ')}
    >
      {transcribing ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
      ) : (
        <MicIcon />
      )}
    </button>
  )
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}
