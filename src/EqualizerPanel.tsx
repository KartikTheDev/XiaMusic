import { AudioLines, RotateCcw } from 'lucide-react'
import {
  EQUALIZER_FREQUENCIES,
  EQUALIZER_PRESET_NAMES,
  EQUALIZER_PRESETS,
  formatFrequency,
  matchingEqualizerPreset,
  type EqualizerSettings
} from './equalizer'

type Props = {
  settings: EqualizerSettings
  onChange: (settings: EqualizerSettings) => void
}

export default function EqualizerPanel({ settings, onChange }: Props) {
  const setGain = (index: number, value: number) => {
    const gains = settings.gains.map((gain, bandIndex) => bandIndex === index ? value : gain)
    onChange({ ...settings, gains, preset: matchingEqualizerPreset(gains) })
  }

  const selectPreset = (preset: string) => {
    if (preset === 'Custom') return
    const gains = [...EQUALIZER_PRESETS[preset as keyof typeof EQUALIZER_PRESETS]]
    onChange({ ...settings, gains, preset: matchingEqualizerPreset(gains) })
  }

  const reset = () => onChange({ ...settings, gains: [...EQUALIZER_PRESETS.Flat], preset: 'Flat' })

  return (
    <section className="equalizer-page" aria-labelledby="equalizer-title">
      <header className="equalizer-heading">
        <div>
          <span className="settings-eyebrow"><AudioLines size={14} /> AUDIO &amp; PLAYBACK</span>
          <h3 id="equalizer-title">Equalizer</h3>
          <p>Shape your sound, your way.</p>
        </div>
        <span className={`eq-status ${settings.enabled ? 'is-active' : ''}`} role="status">
          <span />{settings.enabled ? 'Equalizer on' : 'Bypassed'}
        </span>
      </header>

      <div className="eq-toolbar">
        <label className="eq-power">
          <span className="eq-switch-wrap">
            <input
              type="checkbox"
              role="switch"
              aria-label="Enable equalizer"
              checked={settings.enabled}
              onChange={event => onChange({ ...settings, enabled: event.target.checked })}
            />
            <span className="eq-switch" />
          </span>
          <span><strong>Equalizer</strong><small>{settings.enabled ? 'Processing audio' : 'Original sound'}</small></span>
        </label>
        <label className="eq-preset-label">
          <span>PRESET</span>
          <select aria-label="Equalizer preset" value={settings.preset} onChange={event => selectPreset(event.target.value)}>
            {EQUALIZER_PRESET_NAMES.map(preset => (
              <option key={preset} value={preset} disabled={preset === 'Custom'}>{preset}</option>
            ))}
          </select>
        </label>
        <button className="eq-reset" type="button" onClick={reset} title="Reset all bands to Flat">
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      <div className={`eq-graph ${settings.enabled ? 'is-enabled' : ''}`} aria-label="Ten-band graphic equalizer">
        <div className="eq-zero-line" aria-hidden="true"><span>0 dB</span></div>
        <div className="eq-bands">
          {EQUALIZER_FREQUENCIES.map((frequency, index) => (
            <div className={`eq-band ${settings.gains[index] !== 0 ? 'is-adjusted' : ''}`} key={frequency}>
              <span className="eq-gain">{settings.gains[index] > 0 ? '+' : ''}{settings.gains[index].toFixed(1)}<small> dB</small></span>
              <div className="eq-slider-shell">
                <input
                  id={`eq-band-${frequency}`}
                  className="eq-slider"
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={settings.gains[index]}
                  aria-label={`${formatFrequency(frequency)} gain`}
                  aria-valuetext={`${settings.gains[index].toFixed(1)} decibels`}
                  onChange={event => setGain(index, Number(event.target.value))}
                />
              </div>
              <label htmlFor={`eq-band-${frequency}`} className="eq-frequency">{formatFrequency(frequency)}</label>
            </div>
          ))}
        </div>
        <div className="eq-range-labels" aria-hidden="true"><span>+12 dB</span><span>−12 dB</span></div>
      </div>
      <p className="eq-footnote">Adjustments apply to the current and next tracks. Your settings are saved on this device.</p>
    </section>
  )
}
