export const EQUALIZER_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const

export type EqualizerPreset =
  | 'Flat'
  | 'Bass Boost'
  | 'Bass Reducer'
  | 'Treble Boost'
  | 'Treble Reducer'
  | 'Vocal'
  | 'Acoustic'
  | 'Rock'
  | 'Pop'
  | 'Jazz'
  | 'Classical'
  | 'Electronic'
  | 'Custom'

export type EqualizerSettings = {
  enabled: boolean
  preset: EqualizerPreset
  gains: number[]
}

export const EQUALIZER_PRESETS: Record<Exclude<EqualizerPreset, 'Custom'>, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [5, 4, 3, 1, 0, 0, 0, 0, 0, 0],
  'Bass Reducer': [-5, -4, -3, -1, 0, 0, 0, 0, 0, 0],
  'Treble Boost': [0, 0, 0, 0, 0, 0, 1, 3, 4, 5],
  'Treble Reducer': [0, 0, 0, 0, 0, 0, -1, -3, -4, -5],
  Vocal: [-2, -1, 0, 1, 3, 4, 3, 1, 0, -1],
  Acoustic: [2, 1, 0, -1, 1, 2, 2, 1, 1, 1],
  Rock: [4, 3, 1, 0, -1, 1, 3, 4, 4, 4],
  Pop: [-1, 1, 2, 3, 2, 0, 1, 2, 2, 1],
  Jazz: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
  Classical: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4],
  Electronic: [4, 3, 1, 0, -2, 1, 0, 2, 3, 4]
}

export const EQUALIZER_PRESET_NAMES = [
  'Flat', 'Bass Boost', 'Bass Reducer', 'Treble Boost', 'Treble Reducer',
  'Vocal', 'Acoustic', 'Rock', 'Pop', 'Jazz', 'Classical', 'Electronic', 'Custom'
] as const satisfies readonly EqualizerPreset[]

const isPreset = (value: unknown): value is EqualizerPreset =>
  typeof value === 'string' && EQUALIZER_PRESET_NAMES.some(preset => preset === value)

export function sanitizeEqualizerSettings(value: unknown): EqualizerSettings {
  const fallback: EqualizerSettings = {
    enabled: false,
    preset: 'Flat',
    gains: [...EQUALIZER_PRESETS.Flat]
  }
  if (!value || typeof value !== 'object') return fallback
  const settings = value as Partial<EqualizerSettings>
  if (!Array.isArray(settings.gains) || settings.gains.length !== EQUALIZER_FREQUENCIES.length) return fallback
  const gains = settings.gains.map(gain =>
    typeof gain === 'number' && Number.isFinite(gain)
      ? Math.max(-12, Math.min(12, Math.round(gain * 10) / 10))
      : 0
  )
  const preset = isPreset(settings.preset) ? settings.preset : 'Custom'
  const selectedPreset = preset !== 'Custom' &&
    EQUALIZER_PRESETS[preset].some((gain, index) => gain !== gains[index])
    ? 'Custom'
    : preset
  return {
    enabled: settings.enabled === true,
    preset: selectedPreset,
    gains
  }
}

export function matchingEqualizerPreset(gains: number[]): EqualizerPreset {
  const match = Object.entries(EQUALIZER_PRESETS).find(([, presetGains]) =>
    presetGains.every((gain, index) => gain === gains[index])
  )
  return (match?.[0] as EqualizerPreset | undefined) ?? 'Custom'
}

export function formatFrequency(frequency: number): string {
  return frequency >= 1000 ? `${frequency / 1000} kHz` : `${frequency} Hz`
}
