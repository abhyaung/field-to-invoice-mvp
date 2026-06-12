import { useCallback, useRef, useState } from 'react'

export type RecorderState = 'idle' | 'recording' | 'unsupported'

/**
 * Thin wrapper around MediaRecorder. start() begins capturing mic audio;
 * stop() resolves with the recorded Blob (or null if nothing was captured).
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>(
    typeof navigator !== 'undefined' && navigator.mediaDevices ? 'idle' : 'unsupported',
  )
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const start = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.start()
      recorderRef.current = recorder
      setState('recording')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microphone access denied')
      setState('idle')
    }
  }, [])

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current
      if (!recorder) {
        resolve(null)
        return
      }
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        recorderRef.current = null
        setState('idle')
        const chunks = chunksRef.current
        resolve(chunks.length ? new Blob(chunks, { type: recorder.mimeType }) : null)
      }
      recorder.stop()
    })
  }, [])

  return { state, error, start, stop }
}
