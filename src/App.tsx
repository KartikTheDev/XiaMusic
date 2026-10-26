import { ChangeEvent, memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Album, AudioLines, Check, ChevronDown, ChartNoAxesColumn, CircleHelp, Clock3,
  Disc3, FastForward, Flame, FolderPlus, Gauge, Heart, History, Home, Info, ListMusic, MoreHorizontal,
  Rewind, SlidersHorizontal,
  Moon, Music2, Pause, Play, Plus, Search, Settings2, SkipBack, SkipForward, Trash2,
  Sparkles, Sun, Upload, Users, Volume2, VolumeX, X, Shuffle, Library,
  Repeat2, Maximize2
} from 'lucide-react'
import {
  addPlaybackRecord, loadPlaybackHistory, loadStoredTracks, removeStoredTrack,
  saveStoredTracks, updateStoredTrack, type PlaybackRecord, type StoredTrack
} from './libraryStorage'
import EqualizerPanel from './EqualizerPanel'
import PrivacyPolicyPage from './PrivacyPolicyPage'
import { DISPLAY_VERSION } from './version'
import {
  EQUALIZER_FREQUENCIES,
  EQUALIZER_PRESETS,
  sanitizeEqualizerSettings,
  type EqualizerSettings
} from './equalizer'

type AudioGraph = {
  context: AudioContext
  source: MediaElementAudioSourceNode
  analyser: AnalyserNode
  filters: BiquadFilterNode[]
  output: GainNode
  routedThroughEq: boolean
}

const equalizerStorageKey = 'xiamusic-equalizer'
const skipIntervalStorageKey = 'xiamusic-skip-interval'
const playbackSpeedStorageKey = 'xiamusic-playback-speed'

function readSkipInterval(): 5 | 10 {
  try {
    return localStorage.getItem(skipIntervalStorageKey) === '5' ? 5 : 10
  } catch {
    return 10
  }
}

function readPlaybackSpeed(): number {
  try {
    const stored = localStorage.getItem(playbackSpeedStorageKey)
    if (stored === null) return 1
    const saved = Number(stored)
    return Number.isFinite(saved) ? Math.min(2, Math.max(0.5, Math.round(saved * 20) / 20)) : 1
  } catch {
    return 1
  }
}

function PlaybackSpeedControl({
  playbackRate,
  onChange
}: {
  playbackRate: number
  onChange: (value: number) => void
}) {
  const formattedRate = `${playbackRate.toFixed(2).replace(/0$/, '')}x`
  return (
    <div className="playback-speed-control" title={`Playback speed ${formattedRate}`}>
      <div className="playback-speed-compact" aria-hidden="true"><Gauge size={17} /><span>{formattedRate}</span></div>
      <div className="playback-speed-slider-wrap">
        <input
          className="playback-speed-slider"
          type="range"
          min="0.5"
          max="2"
          step="0.05"
          value={playbackRate}
          aria-label="Playback speed"
          aria-valuetext={`${formattedRate} speed`}
          style={{ '--speed-fill': `${((playbackRate - 0.5) / 1.5) * 100}%` } as React.CSSProperties}
          onChange={event => onChange(Number(event.target.value))}
        />
        <div className="speed-range-labels" aria-hidden="true"><span>0.5x</span><span>1.0x</span><span>2.0x</span></div>
      </div>
    </div>
  )
}

function readEqualizerSettings(): EqualizerSettings {
  try {
    const saved = localStorage.getItem(equalizerStorageKey)
    return saved ? sanitizeEqualizerSettings(JSON.parse(saved)) : sanitizeEqualizerSettings(null)
  } catch {
    return sanitizeEqualizerSettings(null)
  }
}

function connectEqualizer(graph: AudioGraph, enabled: boolean) {
  if (graph.routedThroughEq === enabled) return
  graph.analyser.disconnect()
  graph.analyser.connect(enabled ? graph.filters[0] : graph.context.destination)
  graph.routedThroughEq = enabled
}

function updateEqualizerGraph(graph: AudioGraph, settings: EqualizerSettings) {
  const now = graph.context.currentTime
  settings.gains.forEach((gain, index) => {
    graph.filters[index].gain.setTargetAtTime(settings.enabled ? gain : 0, now, 0.035)
  })
  const positiveGain = settings.gains.reduce((total, gain) => total + Math.max(gain, 0), 0)
  const safetyTrim = Math.pow(10, -Math.min(12, positiveGain * 0.22) / 20)
  graph.output.gain.setTargetAtTime(safetyTrim, now, 0.06)
  connectEqualizer(graph, settings.enabled)
}

type Track = {
  id: string
  fingerprint: string
  title: string
  artist: string
  album: string
  duration: number
  url: string
  fileName: string
  relativePath: string
  addedAt: number
  favorite: boolean
  playCount: number
  lastPlayedAt: number | null
}

type SortKey = 'title' | 'artist' | 'album' | 'duration' | 'addedAt' | 'playCount'
type TrackMenuState = { trackId: string; left: number; top: number }

const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: 'addedAt', label: 'Recently Added' },
  { value: 'title', label: 'Title' },
  { value: 'artist', label: 'Artist' },
  { value: 'album', label: 'Album' },
  { value: 'duration', label: 'Duration' },
  { value: 'playCount', label: 'Play Count' }
]

function SortDropdown({ value, onChange }: { value: SortKey; onChange: (value: SortKey) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const close = (restoreFocus = false) => {
    if (!isOpen || isClosing) return
    setIsClosing(true)
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false)
      setIsClosing(false)
      closeTimerRef.current = null
      if (restoreFocus) triggerRef.current?.focus()
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 190)
  }

  const open = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setIsClosing(false)
    const bounds = triggerRef.current?.getBoundingClientRect()
    if (!bounds) return
    const menuWidth = Math.min(210, window.innerWidth - 16)
    setPosition({
      left: Math.max(8, Math.min(bounds.right - menuWidth, window.innerWidth - menuWidth - 8)),
      top: Math.min(bounds.bottom + 8, window.innerHeight - 8 - 6 * 39 - 16)
    })
    setIsOpen(true)
  }

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
  }, [])

  useEffect(() => {
    if (!isOpen || isClosing) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node &&
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)) close()
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close(true)
      }
    }
    const closeOnLayoutChange = () => close()
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('scroll', closeOnLayoutChange, true)
    window.addEventListener('resize', closeOnLayoutChange)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('scroll', closeOnLayoutChange, true)
      window.removeEventListener('resize', closeOnLayoutChange)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen, isClosing])

  useLayoutEffect(() => {
    if (!isOpen || isClosing) return
    menuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
  }, [isOpen, isClosing])

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const options = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'))
    const currentIndex = options.indexOf(document.activeElement as HTMLButtonElement)
    let nextIndex: number | null = null
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % options.length
    if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + options.length) % options.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = options.length - 1
    if (nextIndex !== null) {
      event.preventDefault()
      options[nextIndex]?.focus()
    }
  }

  return (
    <div className="sort-control">
      <span>Sort</span>
      <button
        ref={triggerRef}
        className={`sort-trigger ${isOpen && !isClosing ? 'is-open' : ''}`}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen && !isClosing}
        aria-controls={isOpen ? 'library-sort-menu' : undefined}
        onClick={() => isOpen && !isClosing ? close() : open()}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            if (!isOpen || isClosing) open()
          }
        }}
      >
        <span>{sortOptions.find(option => option.value === value)?.label}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {isOpen && createPortal(
        <div
          ref={menuRef}
          id="library-sort-menu"
          className={`sort-menu ${isClosing ? 'is-closing' : ''}`}
          role="menu"
          aria-label="Sort tracks"
          style={{ left: position.left, top: position.top }}
          onKeyDown={handleMenuKeyDown}
        >
          {sortOptions.map((option, index) => (
            <button
              key={option.value}
              className={`sort-menu-option ${value === option.value ? 'is-selected' : ''}`}
              type="button"
              role="menuitemradio"
              aria-checked={value === option.value}
              style={{ '--sort-option-index': index } as React.CSSProperties}
              onClick={() => {
                onChange(option.value)
                close(true)
              }}
            >
              <span>{option.label}</span>
              {value === option.value && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>,
        document.querySelector('.app-shell') ?? document.body
      )}
    </div>
  )
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

const palettes = [
  'linear-gradient(145deg,#d9c6a5,#9b7658)',
  'linear-gradient(145deg,#d9d6cc,#777f7b)',
  'linear-gradient(145deg,#e5b8a9,#9c615c)',
  'linear-gradient(145deg,#c5d0c1,#687b6d)',
  'linear-gradient(145deg,#c8c1df,#777091)',
  'linear-gradient(145deg,#e8d8a8,#b58e52)'
]

const waveformBarHeights = [4, 7, 11, 8, 5]
const waveformFrequencyBands = [[45, 100], [100, 220], [220, 500], [500, 2200], [2200, 8000]] as const

const TrackWaveform = memo(function TrackWaveform({
  active,
  playing,
  analyser
}: {
  active: boolean
  playing: boolean
  analyser: AnalyserNode | null
}) {
  const barRefs = useRef<Array<HTMLSpanElement | null>>([])

  useEffect(() => {
    const bars = barRefs.current
    const resetBars = () => bars.forEach((bar, index) => {
      if (bar) bar.style.transform = 'scaleY(1)'
    })

    if (!active || !playing || !analyser || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      resetBars()
      return
    }

    const frequencyData = new Uint8Array(analyser.frequencyBinCount)
    const smoothedLevels = waveformBarHeights.map(() => 0)
    const sampleRate = analyser.context.sampleRate
    const binWidth = sampleRate / analyser.fftSize
    let animationFrame = 0
    let lastUpdate = 0

    const animate = (timestamp: number) => {
      animationFrame = window.requestAnimationFrame(animate)
      if (timestamp - lastUpdate < 33) return
      lastUpdate = timestamp
      analyser.getByteFrequencyData(frequencyData)

      const bassStart = Math.max(1, Math.floor(45 / binWidth))
      const bassEnd = Math.min(frequencyData.length, Math.max(bassStart + 1, Math.ceil(180 / binWidth)))
      let bassEnergy = 0
      for (let bin = bassStart; bin < bassEnd; bin += 1) bassEnergy += frequencyData[bin] / 255
      bassEnergy /= Math.max(1, bassEnd - bassStart)

      waveformFrequencyBands.forEach(([lowFrequency, highFrequency], index) => {
        const firstBin = Math.min(frequencyData.length - 1, Math.max(1, Math.floor(lowFrequency / binWidth)))
        const lastBin = Math.min(frequencyData.length, Math.max(firstBin + 1, Math.ceil(highFrequency / binWidth)))
        let energy = 0
        for (let bin = firstBin; bin < lastBin; bin += 1) energy += frequencyData[bin] / 255
        energy /= Math.max(1, lastBin - firstBin)
        const bassContribution = index < 2 ? bassEnergy * (index === 0 ? 0.65 : 0.35) : bassEnergy * 0.12
        const target = Math.min(1.35, 0.18 + energy * 0.9 + bassContribution)
        smoothedLevels[index] += (target - smoothedLevels[index]) * (target > smoothedLevels[index] ? 0.42 : 0.2)
        bars[index]?.style.setProperty('transform', `scaleY(${Math.max(0.18, smoothedLevels[index])})`)
      })
    }

    animationFrame = window.requestAnimationFrame(animate)
    return () => {
      window.cancelAnimationFrame(animationFrame)
      resetBars()
    }
  }, [active, analyser, playing])

  return (
    <span className={`track-waveform ${active ? 'is-active' : ''} ${active && playing ? 'is-playing' : ''} ${active && playing && analyser ? 'is-analysing' : ''}`} aria-hidden="true">
      {waveformBarHeights.map((height, index) => (
        <span
          key={index}
          ref={element => { barRefs.current[index] = element }}
          style={{ height, transform: 'scaleY(1)' }}
        />
      ))}
    </span>
  )
})

function Cover({ index, large = false }: { index: number; large?: boolean }) {
  return (
    <div className={`cover ${large ? 'cover-large' : ''}`} style={{ background: palettes[index % palettes.length] }}>
      <div className="cover-orb" />
      <div className="cover-line" />
      <AudioLines size={large ? 34 : 21} strokeWidth={1.25} />
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    localStorage.getItem('sonora-theme') === 'dark' ? 'dark' : 'light'
  )
  const [tracks, setTracks] = useState<Track[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [detachedCurrent, setDetachedCurrent] = useState<Track | null>(null)
  const [audioIsPlaying, setAudioIsPlaying] = useState(false)
  const [waveformAnalyser, setWaveformAnalyser] = useState<AnalyserNode | null>(null)
  const [playing, setPlaying] = useState(false)
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sonora-favorites')
      return saved ? JSON.parse(saved) as string[] : []
    } catch {
      return []
    }
  })
  const [query, setQuery] = useState('')
  const [view, setView] = useState('Home')
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null)
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('addedAt')
  const [playbackHistory, setPlaybackHistory] = useState<PlaybackRecord[]>([])
  const [queue, setQueue] = useState<string[]>([])
  const [volume, setVolume] = useState(0.8)
  const [skipInterval, setSkipInterval] = useState<5 | 10>(readSkipInterval)
  const [playbackRate, setPlaybackRate] = useState(readPlaybackSpeed)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [queueEntered, setQueueEntered] = useState(false)
  const [queueClosing, setQueueClosing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsClosing, setSettingsClosing] = useState(false)
  const [settingsSection, setSettingsSection] = useState('General')
  const [privacyPolicyOpen, setPrivacyPolicyOpen] = useState(false)
  const privacyPolicyButtonRef = useRef<HTMLButtonElement>(null)
  const [equalizer, setEqualizer] = useState<EqualizerSettings>(readEqualizerSettings)
  const [showExpandedPlayer, setShowExpandedPlayer] = useState(false)
  const [expandedPlayerClosing, setExpandedPlayerClosing] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [moreMenuClosing, setMoreMenuClosing] = useState(false)
  const [trackMenu, setTrackMenu] = useState<TrackMenuState | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<Track | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingTrackId, setDeletingTrackId] = useState<string | null>(null)
  const [removingTrackIds, setRemovingTrackIds] = useState<string[]>([])
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [notice, setNotice] = useState('Import a few audio files to start your library.')
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioGraphRef = useRef<AudioGraph | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const sidebarPointerInsideRef = useRef(false)
  const sidebarCollapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settingsCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const expandedPlayerCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queueCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const moreMenuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settingsCloseButtonRef = useRef<HTMLButtonElement>(null)
  const settingsReturnFocusRef = useRef<HTMLElement | null>(null)
  const queueCloseButtonRef = useRef<HTMLButtonElement>(null)
  const queueBackdropRef = useRef<HTMLDivElement>(null)
  const queueToggleButtonRef = useRef<HTMLButtonElement>(null)
  const queueReturnFocusRef = useRef<HTMLElement | null>(null)
  const expandedPlayerRef = useRef<HTMLElement>(null)
  const playerBarRef = useRef<HTMLElement>(null)
  const playerExpandButtonRef = useRef<HTMLButtonElement>(null)
  const moreMenuButtonRef = useRef<HTMLButtonElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const trackMenuRef = useRef<HTMLDivElement>(null)
  const trackMenuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const deleteCancelButtonRef = useRef<HTMLButtonElement>(null)
  const deleteDialogRef = useRef<HTMLElement>(null)
  const deleteReturnFocusRef = useRef<HTMLElement | null>(null)
  const removalTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const deletingTrackIdsRef = useRef(new Set<string>())
  const playCountedTrackRef = useRef<string | null>(null)
  const playbackListenRef = useRef<{ trackId: string | null; lastTime: number; listened: number }>({
    trackId: null,
    lastTime: 0,
    listened: 0
  })
  const current = tracks.find(t => t.id === currentId) ??
    (detachedCurrent?.id === currentId ? detachedCurrent : null)
  const currentIsInLibrary = Boolean(current && tracks.some(track => track.id === current.id))

  const ensureAudioGraph = () => {
    const audio = audioRef.current
    if (!audio) return null
    if (audioGraphRef.current) return audioGraphRef.current
    const AudioContextConstructor = window.AudioContext
    if (!AudioContextConstructor) throw new Error('Web Audio processing is not supported in this environment.')
    const context = new AudioContextConstructor()
    try {
      const source = context.createMediaElementSource(audio)
      const analyser = context.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.72
      source.connect(analyser)
      analyser.connect(context.destination)
      const filters = EQUALIZER_FREQUENCIES.map((frequency, index) => {
        const filter = context.createBiquadFilter()
        filter.type = index === 0 ? 'lowshelf' : index === EQUALIZER_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking'
        filter.frequency.value = frequency
        if (filter.type === 'peaking') filter.Q.value = 1.15
        return filter
      })
      const output = context.createGain()
      filters.forEach((filter, index) => filter.connect(filters[index + 1] ?? output))
      output.connect(context.destination)
      const graph: AudioGraph = { context, source, analyser, filters, output, routedThroughEq: false }
      audioGraphRef.current = graph
      setWaveformAnalyser(analyser)
      updateEqualizerGraph(graph, equalizer)
      return graph
    } catch (error) {
      void context.close()
      throw error
    }
  }

  const startPlayback = async () => {
    const audio = audioRef.current
    if (!audio) return
    try {
      const graph = ensureAudioGraph()
      if (graph && graph.context.state === 'suspended') await graph.context.resume()
    } catch (error) {
      setNotice(`Equalizer unavailable: ${error instanceof Error ? error.message : String(error)} Playback will continue without EQ.`)
    }
    try {
      await audio.play()
    } catch {
      setPlaying(false)
      setNotice('This audio format could not be played by your browser.')
    }
  }

  const albums = useMemo(() => {
    const groups = new Map<string, Track[]>()
    tracks.forEach(track => {
      const key = `${track.artist}\u0000${track.album}`
      groups.set(key, [...(groups.get(key) ?? []), track])
    })
    return Array.from(groups, ([key, items]) => ({
      key,
      artist: items[0].artist,
      title: items[0].album,
      tracks: items
    })).sort((a, b) => a.title.localeCompare(b.title))
  }, [tracks])
  const artists = useMemo(() => {
    const groups = new Map<string, Track[]>()
    tracks.forEach(track => groups.set(track.artist, [...(groups.get(track.artist) ?? []), track]))
    return Array.from(groups, ([name, items]) => ({ name, tracks: items }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [tracks])
  const recentTracks = useMemo(() => {
    const seen = new Set<string>()
    return playbackHistory.flatMap(record => {
      if (seen.has(record.trackId)) return []
      seen.add(record.trackId)
      const track = tracks.find(item => item.id === record.trackId)
      return track ? [track] : []
    })
  }, [playbackHistory, tracks])
  const viewTitle = view === 'Album detail' ? selectedAlbum?.split('\u0000').at(-1) ?? 'Album' :
    view === 'Artist detail' ? selectedArtist ?? 'Artist' :
    view === 'Favorites' ? 'Favorites' :
    view === 'Recently Added' || view === 'Most Played' || view === 'Recently Played' ? view :
    view
  const visibleTracks = useMemo(() => {
    let result = tracks
    if (view === 'Favorites') result = result.filter(t => favorites.includes(t.id))
    if (view === 'Recently Added') result = [...tracks].sort((a, b) => b.addedAt - a.addedAt)
    if (view === 'Most Played') result = [...tracks].sort((a, b) => b.playCount - a.playCount || b.addedAt - a.addedAt)
    if (view === 'Recently Played') result = recentTracks
    if (view === 'Queue') result = queue.flatMap(id => {
      const track = tracks.find(item => item.id === id)
      return track ? [track] : []
    })
    if (view === 'Album detail' && selectedAlbum) {
      const [artist, album] = selectedAlbum.split('\u0000')
      result = tracks.filter(t => t.artist === artist && t.album === album)
    }
    if (view === 'Artist detail' && selectedArtist) result = tracks.filter(t => t.artist === selectedArtist)
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(t => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(q))
    }
    if (view !== 'Recently Added' && view !== 'Most Played' && view !== 'Recently Played' && view !== 'Queue') {
      result = [...result].sort((a, b) => {
        const left = a[sortKey]
        const right = b[sortKey]
        if (typeof left === 'number' && typeof right === 'number') return right - left || a.title.localeCompare(b.title)
        return String(left).localeCompare(String(right)) || a.title.localeCompare(b.title)
      })
    }
    return result
  }, [tracks, favorites, playbackHistory, recentTracks, queue, query, view, selectedAlbum, selectedArtist, sortKey])

  const closeExpandedPlayer = (restoreFocus = true) => {
    if (!showExpandedPlayer || expandedPlayerClosing) return
    const panel = expandedPlayerRef.current
    const compactPlayer = playerBarRef.current
    if (panel && compactPlayer && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const from = panel.getBoundingClientRect()
      const to = compactPlayer.getBoundingClientRect()
      panel.style.setProperty('--player-collapse-x', `${to.left - from.left}px`)
      panel.style.setProperty('--player-collapse-y', `${to.top - from.top}px`)
      panel.style.setProperty('--player-collapse-scale-x', `${to.width / from.width}`)
      panel.style.setProperty('--player-collapse-scale-y', `${to.height / from.height}`)
    }
    setExpandedPlayerClosing(true)
    expandedPlayerCloseTimerRef.current = setTimeout(() => {
      setShowExpandedPlayer(false)
      setExpandedPlayerClosing(false)
      expandedPlayerCloseTimerRef.current = null
      if (restoreFocus) playerExpandButtonRef.current?.focus()
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 440)
  }

  const openQueue = (trigger?: HTMLElement) => {
    if (queueCloseTimerRef.current) {
      clearTimeout(queueCloseTimerRef.current)
      queueCloseTimerRef.current = null
    }
    if (trigger?.isConnected) queueReturnFocusRef.current = trigger
    if (!showQueue) setQueueEntered(false)
    setQueueClosing(false)
    setShowQueue(true)
  }

  const closeQueue = () => {
    if (!showQueue || queueClosing) return
    setQueueClosing(true)
    queueCloseTimerRef.current = setTimeout(() => {
      setShowQueue(false)
      setQueueEntered(false)
      setQueueClosing(false)
      queueCloseTimerRef.current = null
      const returnTarget = queueReturnFocusRef.current
      if (returnTarget?.isConnected && !returnTarget.closest('[aria-hidden="true"], [inert]')) returnTarget.focus()
      else queueToggleButtonRef.current?.focus()
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220)
  }

  const closeMoreMenu = (restoreFocus = true) => {
    if (!showMoreMenu || moreMenuClosing) return
    setMoreMenuClosing(true)
    moreMenuCloseTimerRef.current = setTimeout(() => {
      setShowMoreMenu(false)
      setMoreMenuClosing(false)
      moreMenuCloseTimerRef.current = null
      if (restoreFocus) moreMenuButtonRef.current?.focus()
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 190)
  }

  const closeTrackMenu = (restoreFocus = false) => {
    setTrackMenu(null)
    if (restoreFocus) requestAnimationFrame(() => trackMenuTriggerRef.current?.focus())
  }

  const openTrackMenu = (track: Track, trigger: HTMLButtonElement) => {
    const bounds = trigger.getBoundingClientRect()
    const menuWidth = 190
    const menuHeight = 94
    const left = Math.max(8, Math.min(bounds.right - menuWidth, window.innerWidth - menuWidth - 8))
    const below = bounds.bottom + 6
    const top = below + menuHeight <= window.innerHeight - 8
      ? below
      : Math.max(8, bounds.top - menuHeight - 6)
    trackMenuTriggerRef.current = trigger
    setTrackMenu({ trackId: track.id, left, top })
  }

  const openDeleteConfirmation = (track: Track) => {
    deleteReturnFocusRef.current = trackMenuTriggerRef.current
    closeTrackMenu()
    setDeleteError(null)
    setDeleteCandidate(track)
  }

  const dismissDeleteConfirmation = (restoreFocus = true) => {
    if (deletingTrackId) return
    setDeleteCandidate(null)
    const returnFocusTarget = deleteReturnFocusRef.current
    if (restoreFocus) requestAnimationFrame(() => returnFocusTarget?.focus())
    deleteReturnFocusRef.current = null
  }

  const toggleMoreMenu = () => {
    if (showMoreMenu) {
      if (moreMenuClosing && moreMenuCloseTimerRef.current) {
        clearTimeout(moreMenuCloseTimerRef.current)
        moreMenuCloseTimerRef.current = null
        setMoreMenuClosing(false)
        return
      }
      closeMoreMenu()
      return
    }
    if (moreMenuCloseTimerRef.current) clearTimeout(moreMenuCloseTimerRef.current)
    moreMenuCloseTimerRef.current = null
    setMoreMenuClosing(false)
    setShowMoreMenu(true)
  }

  useEffect(() => {
    let active = true
    const hydrateLibrary = async () => {
      try {
        const [storedTracks, history] = await Promise.all([loadStoredTracks(), loadPlaybackHistory()])
        if (!active) return
        setTracks(prev => {
          const merged = new Map(prev.map(track => [track.id, track]))
          storedTracks.forEach(({ file, ...track }) => {
            if (!merged.has(track.id)) merged.set(track.id, { ...track, url: URL.createObjectURL(file) })
          })
          return Array.from(merged.values()).sort((a, b) => a.addedAt - b.addedAt)
        })
        setQueue(prev => Array.from(new Set([...prev, ...storedTracks.map(track => track.id)])))
        setPlaybackHistory(prev => {
          const merged = new Map(prev.map(record => [record.id, record]))
          history.forEach(record => merged.set(record.id, record))
          return Array.from(merged.values()).sort((a, b) => b.playedAt - a.playedAt)
        })
        setFavorites(Array.from(new Set([
          ...favorites,
          ...storedTracks.filter(track => track.favorite).map(track => track.id)
        ])))
      } catch (error) {
        if (active) setNotice(`Could not load your local library: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    void hydrateLibrary()
    return () => { active = false }
  }, [])

  useEffect(() => {
    folderRef.current?.setAttribute('webkitdirectory', '')
  }, [])

  useEffect(() => {
    localStorage.setItem('sonora-favorites', JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    localStorage.setItem('sonora-theme', theme)
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem(equalizerStorageKey, JSON.stringify(equalizer))
    } catch (error) {
      setNotice(`Could not save equalizer settings: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [equalizer])

  useEffect(() => () => {
    if (sidebarCollapseTimerRef.current) clearTimeout(sidebarCollapseTimerRef.current)
    if (settingsCloseTimerRef.current) clearTimeout(settingsCloseTimerRef.current)
    if (expandedPlayerCloseTimerRef.current) clearTimeout(expandedPlayerCloseTimerRef.current)
    if (queueCloseTimerRef.current) clearTimeout(queueCloseTimerRef.current)
    if (moreMenuCloseTimerRef.current) clearTimeout(moreMenuCloseTimerRef.current)
    if (audioGraphRef.current) {
      audioGraphRef.current.source.disconnect()
      audioGraphRef.current.analyser.disconnect()
      audioGraphRef.current.filters.forEach(filter => filter.disconnect())
      audioGraphRef.current.output.disconnect()
      void audioGraphRef.current.context.close()
      audioGraphRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!showSettings) return
    const frame = window.requestAnimationFrame(() => settingsCloseButtonRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [showSettings])

  useEffect(() => {
    if (!showQueue || queueClosing) return
    const frame = window.requestAnimationFrame(() => {
      setQueueEntered(true)
      queueCloseButtonRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [showQueue, queueClosing])

  useEffect(() => {
    if (queueBackdropRef.current) queueBackdropRef.current.inert = queueClosing
  }, [showQueue, queueClosing])

  useEffect(() => {
    if (!showQueue || queueClosing) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeQueue()
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [showQueue, queueClosing])

  useEffect(() => {
    if (!showExpandedPlayer) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeExpandedPlayer()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [showExpandedPlayer, expandedPlayerClosing])

  useEffect(() => {
    if (!showMoreMenu || moreMenuClosing) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !moreMenuRef.current?.contains(event.target)) closeMoreMenu(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeMoreMenu()
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [showMoreMenu, moreMenuClosing])

  useEffect(() => {
    if (!trackMenu) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node &&
        !trackMenuRef.current?.contains(target) &&
        !trackMenuTriggerRef.current?.contains(target)) {
        closeTrackMenu()
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeTrackMenu(true)
      }
    }
    const closeOnScroll = () => closeTrackMenu()
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('scroll', closeOnScroll, true)
    window.addEventListener('keydown', closeOnEscape)
    window.addEventListener('resize', closeOnScroll)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('scroll', closeOnScroll, true)
      window.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', closeOnScroll)
    }
  }, [trackMenu])

  useLayoutEffect(() => {
    if (!trackMenu) return
    trackMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
  }, [trackMenu])

  useEffect(() => {
    if (!deleteCandidate) return
    const frame = window.requestAnimationFrame(() => deleteCancelButtonRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [deleteCandidate])

  useEffect(() => {
    if (!deletingTrackId) return
    const frame = window.requestAnimationFrame(() => deleteDialogRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [deletingTrackId])

  useEffect(() => () => {
    removalTimersRef.current.forEach(timer => clearTimeout(timer))
    removalTimersRef.current.clear()
  }, [])

  useLayoutEffect(() => {
    if (!showMoreMenu || moreMenuClosing) return
    moreMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
  }, [showMoreMenu, moreMenuClosing])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate
    try {
      localStorage.setItem(playbackSpeedStorageKey, String(playbackRate))
    } catch {
      setNotice('Playback speed is active but could not be saved on this device.')
    }
  }, [playbackRate])

  useEffect(() => {
    try {
      localStorage.setItem(skipIntervalStorageKey, String(skipInterval))
    } catch {
      setNotice('Skip interval is active but could not be saved on this device.')
    }
  }, [skipInterval])

  useEffect(() => {
    if (!audioGraphRef.current) return
    updateEqualizerGraph(audioGraphRef.current, equalizer)
  }, [equalizer])

  useEffect(() => {
    if (!current || !audioRef.current) return
    audioRef.current.src = current.url
    audioRef.current.load()
    audioRef.current.playbackRate = playbackRate
  }, [currentId]) // playback changes are handled separately

  useEffect(() => {
    if (!detachedCurrent || detachedCurrent.id === currentId) return
    URL.revokeObjectURL(detachedCurrent.url)
    deletingTrackIdsRef.current.delete(detachedCurrent.id)
    setDetachedCurrent(null)
  }, [currentId, detachedCurrent])

  useEffect(() => {
    playCountedTrackRef.current = null
    playbackListenRef.current = {
      trackId: currentId,
      lastTime: audioRef.current?.currentTime ?? 0,
      listened: 0
    }
  }, [currentId])

  useEffect(() => {
    if (!audioRef.current || !current) return
    if (playing) {
      void startPlayback()
    } else {
      audioRef.current.pause()
    }
  }, [playing, currentId])

  const importFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    const folderFiles = selected.some(file => Boolean(file.webkitRelativePath))
    const accepted = selected.filter(file =>
      file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i.test(file.name)
    )
    const fingerprints = new Set(tracks.map(track => track.fingerprint))
    const added: Array<Track & { file: File }> = accepted.flatMap((file, index) => {
      const relativePath = file.webkitRelativePath || file.name
      const fingerprint = `${relativePath}:${file.size}:${file.lastModified}`
      if (fingerprints.has(fingerprint)) return []
      fingerprints.add(fingerprint)
      const rawName = file.name.replace(/\.[^/.]+$/, '')
      const pieces = rawName.split(' - ')
      const track: Track = {
        id: crypto.randomUUID?.() ?? `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
        fingerprint,
        title: pieces.length > 1 ? pieces.slice(1).join(' - ').trim() : rawName,
        artist: pieces.length > 1 ? pieces[0].trim() : 'Unknown artist',
        album: relativePath.includes('/') ? relativePath.split('/').slice(-2, -1)[0] : 'Local files',
        duration: 0,
        url: URL.createObjectURL(file),
        fileName: file.name,
        relativePath,
        addedAt: Date.now(),
        favorite: false,
        playCount: 0,
        lastPlayedAt: null
      }
      return [{ ...track, file }]
    })
    if (added.length) {
      try {
        const stored: StoredTrack[] = added.map(({ file, ...track }) => ({
          id: track.id,
          fingerprint: track.fingerprint,
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration: track.duration,
          fileName: track.fileName,
          relativePath: track.relativePath,
          addedAt: track.addedAt,
          favorite: track.favorite,
          playCount: track.playCount,
          lastPlayedAt: track.lastPlayedAt,
          file
        }))
        await saveStoredTracks(stored)
        const newTracks = added.map(({ file: _file, ...track }) => track)
        setTracks(prev => [...prev, ...newTracks])
        setQueue(prev => [...prev, ...newTracks.map(track => track.id)])
        setNotice(`${newTracks.length} track${newTracks.length === 1 ? '' : 's'} added${folderFiles ? ' from folder' : ''} to your library.`)
        if (!currentId) {
          setCurrentId(newTracks[0].id)
          setPlaying(false)
        }
      } catch (error) {
        added.forEach(track => URL.revokeObjectURL(track.url))
        setNotice(`Could not save imported music: ${error instanceof Error ? error.message : String(error)}`)
      }
    } else if (accepted.length) {
      setNotice('These audio files are already in your library.')
    } else if (selected.length) {
      setNotice('No supported audio files found. Try MP3, WAV, M4A, FLAC or OGG.')
    }
    event.target.value = ''
  }

  const playTrack = (track: Track) => {
    if (deletingTrackIdsRef.current.has(track.id)) return
    setCurrentId(track.id)
    setPlaying(true)
    setQueue(prev => [track.id, ...prev.filter(id => id !== track.id)])
    setView('Home')
  }

  const nextTrack = () => {
    const availableTracks = tracks.filter(track => !deletingTrackIdsRef.current.has(track.id))
    if (!availableTracks.length) {
      setPlaying(false)
      return
    }
    const queuedIds = queue.filter(id => !deletingTrackIdsRef.current.has(id))
    const ids = queuedIds.length ? queuedIds : availableTracks.map(track => track.id)
    const currentIndex = ids.indexOf(currentId ?? '')
    const index = currentIndex < 0 ? -1 : currentIndex
    const nextId = shuffle
      ? ids[Math.floor(Math.random() * ids.length)]
      : ids[(index + 1) % ids.length]
    playCountedTrackRef.current = null
    playbackListenRef.current = { trackId: nextId, lastTime: 0, listened: 0 }
    setCurrentId(nextId)
    setPlaying(true)
  }

  const skipPlayback = (direction: -1 | 1) => {
    const audio = audioRef.current
    if (!current || !audio || audio.readyState < HTMLMediaElement.HAVE_METADATA) return
    const target = audio.currentTime + direction * skipInterval
    const boundedTarget = direction < 0
      ? Math.max(0, target)
      : Number.isFinite(audio.duration) && audio.duration > 0
        ? Math.min(target, Math.max(0, audio.duration - 0.05))
        : target
    audio.currentTime = boundedTarget
    setCurrentTime(boundedTarget)
  }

  const previousTrack = () => {
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0
      setCurrentTime(0)
      playCountedTrackRef.current = null
      playbackListenRef.current = { trackId: currentId, lastTime: 0, listened: 0 }
      return
    }
    const availableTracks = tracks.filter(track => !deletingTrackIdsRef.current.has(track.id))
    if (!availableTracks.length) return
    const queuedIds = queue.filter(id => !deletingTrackIdsRef.current.has(id))
    const ids = queuedIds.length ? queuedIds : availableTracks.map(track => track.id)
    const index = Math.max(0, ids.indexOf(currentId ?? ''))
    playCountedTrackRef.current = null
    const previousId = ids[(index - 1 + ids.length) % ids.length]
    playbackListenRef.current = { trackId: previousId, lastTime: 0, listened: 0 }
    setCurrentId(previousId)
    setPlaying(true)
  }

  const toggleFavorite = (id: string) => {
    if (deletingTrackIdsRef.current.has(id)) return
    const favorite = !favorites.includes(id)
    setFavorites(prev => favorite ? [...prev, id] : prev.filter(x => x !== id))
    setTracks(prev => prev.map(track => track.id === id ? { ...track, favorite } : track))
    void updateStoredTrack(id, { favorite }).catch(error => {
      setNotice(`Could not save favorite: ${error instanceof Error ? error.message : String(error)}`)
    })
  }

  const addToQueue = (track: Track) => {
    if (deletingTrackIdsRef.current.has(track.id)) return
    setQueue(prev => [...prev.filter(id => id !== track.id), track.id])
    setNotice(`Added “${track.title}” to the queue.`)
  }

  const removeTrack = async (id: string) => {
    const track = tracks.find(t => t.id === id)
    if (!track || deletingTrackIdsRef.current.has(id)) return
    deletingTrackIdsRef.current.add(id)
    setDeletingTrackId(id)
    try {
      await removeStoredTrack(id)
    } catch (error) {
      deletingTrackIdsRef.current.delete(id)
      setDeletingTrackId(null)
      const message = `Could not remove “${track.title}”: ${error instanceof Error ? error.message : String(error)}`
      setDeleteError(message)
      setNotice(message)
      return
    }
    setDeletingTrackId(null)
    setDeleteCandidate(null)
    setDeleteError(null)
    deleteReturnFocusRef.current = null
    requestAnimationFrame(() => document.getElementById('search-input')?.focus())
    setRemovingTrackIds(prev => prev.includes(id) ? prev : [...prev, id])
    const finishRemoval = () => {
      if (currentId === id) setDetachedCurrent(track)
      else {
        URL.revokeObjectURL(track.url)
        deletingTrackIdsRef.current.delete(id)
      }
      setTracks(prev => prev.filter(item => item.id !== id))
      setQueue(prev => prev.filter(itemId => itemId !== id))
      setFavorites(prev => prev.filter(itemId => itemId !== id))
      setPlaybackHistory(prev => prev.filter(record => record.trackId !== id))
      setRemovingTrackIds(prev => prev.filter(itemId => itemId !== id))
      setNotice(`Removed “${track.title}” from your library.`)
    }
    const exitDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 340
    if (exitDuration === 0) {
      finishRemoval()
    } else {
      const timer = setTimeout(() => {
        removalTimersRef.current.delete(id)
        finishRemoval()
      }, exitDuration)
      removalTimersRef.current.set(id, timer)
    }
  }

  const markTrackPlayed = (id: string) => {
    if (playCountedTrackRef.current === id || deletingTrackIdsRef.current.has(id)) return
    playCountedTrackRef.current = id
    const playedAt = Date.now()
    setTracks(prev => prev.map(track => track.id === id
      ? { ...track, playCount: track.playCount + 1, lastPlayedAt: playedAt }
      : track))
    setPlaybackHistory(prev => [{ id: `${id}:${playedAt}`, trackId: id, playedAt }, ...prev])
    void addPlaybackRecord(id, playedAt).catch(error => {
      setNotice(`Could not save playback history: ${error instanceof Error ? error.message : String(error)}`)
    })
  }

  const clearLibrary = async () => {
    try {
      await Promise.all(tracks.map(track => removeStoredTrack(track.id)))
      tracks.forEach(track => URL.revokeObjectURL(track.url))
      setTracks([])
      setQueue([])
      setCurrentId(null)
      setPlaying(false)
      setFavorites([])
      setPlaybackHistory([])
      closeSettings()
      setNotice('Your local library was cleared.')
    } catch (error) {
      setNotice(`Could not clear the local library: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const openSettings = () => {
    if (settingsCloseTimerRef.current) clearTimeout(settingsCloseTimerRef.current)
    settingsCloseTimerRef.current = null
    settingsReturnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    setPrivacyPolicyOpen(false)
    setSettingsClosing(false)
    setShowSettings(true)
  }

  const closeSettings = () => {
    if (!showSettings || settingsClosing) return
    setSettingsClosing(true)
    settingsCloseTimerRef.current = setTimeout(() => {
      setShowSettings(false)
      setSettingsClosing(false)
      settingsCloseTimerRef.current = null
      settingsReturnFocusRef.current?.focus()
      settingsReturnFocusRef.current = null
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260)
  }

  const closePrivacyPolicy = () => {
    setPrivacyPolicyOpen(false)
    requestAnimationFrame(() => privacyPolicyButtonRef.current?.focus())
  }

  const expandSidebar = () => {
    if (sidebarCollapseTimerRef.current) clearTimeout(sidebarCollapseTimerRef.current)
    sidebarCollapseTimerRef.current = null
    setSidebarExpanded(true)
  }

  const handleSidebarPointerEnter = () => {
    sidebarPointerInsideRef.current = true
    expandSidebar()
  }

  const scheduleSidebarCollapse = () => {
    if (sidebarCollapseTimerRef.current) clearTimeout(sidebarCollapseTimerRef.current)
    sidebarCollapseTimerRef.current = setTimeout(() => {
      sidebarCollapseTimerRef.current = null
      if (!sidebarPointerInsideRef.current && !sidebarRef.current?.contains(document.activeElement)) {
        setSidebarExpanded(false)
      }
    }, 200)
  }

  return (
    <div className="app-shell" data-theme={theme} data-sidebar-expanded={sidebarExpanded}>
      <aside
        className={`sidebar ${sidebarExpanded ? 'is-expanded' : 'is-collapsed'}`}
        ref={sidebarRef}
        onPointerEnter={handleSidebarPointerEnter}
        onPointerLeave={() => {
          sidebarPointerInsideRef.current = false
          scheduleSidebarCollapse()
        }}
        onFocusCapture={expandSidebar}
        onBlurCapture={event => {
          if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
            scheduleSidebarCollapse()
          }
        }}
      >
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <AudioLines size={20} strokeWidth={2.1} />
          </div>
          <span className="brand-name">Xia<span className="brand-music">Music</span></span>
        </div>
        <div className="sidebar-navigation">
          <section className="sidebar-section">
            <div className="sidebar-label"><span>MENU</span></div>
            <nav className="nav-list" aria-label="Main menu">
              <button className={`nav-item ${view === 'Home' ? 'active' : ''}`} aria-label="Home" title={sidebarExpanded ? undefined : 'Home'} onClick={() => setView('Home')}><Home size={18} /><span className="nav-label">Home</span></button>
              <button className={`nav-item ${view === 'Search' ? 'active' : ''}`} aria-label="Search" title={sidebarExpanded ? undefined : 'Search'} onClick={() => { setView('Search'); document.getElementById('search-input')?.focus() }}><Search size={18} /><span className="nav-label">Search</span></button>
              <button className={`nav-item ${view === 'Your Library' ? 'active' : ''}`} aria-label="Your Library" title={sidebarExpanded ? undefined : 'Your Library'} onClick={() => setView('Your Library')}><Album size={18} /><span className="nav-label">Your Library</span></button>
              <button className={`nav-item ${view === 'Albums' || view === 'Album detail' ? 'active' : ''}`} aria-label="Albums" title={sidebarExpanded ? undefined : 'Albums'} onClick={() => setView('Albums')}><Disc3 size={18} /><span className="nav-label">Albums</span></button>
              <button className={`nav-item ${view === 'Artists' || view === 'Artist detail' ? 'active' : ''}`} aria-label="Artists" title={sidebarExpanded ? undefined : 'Artists'} onClick={() => setView('Artists')}><Users size={18} /><span className="nav-label">Artists</span></button>
            </nav>
          </section>
          <section className="sidebar-section collection-section">
            <div className="sidebar-label sidebar-label-row"><span className="collection-label">SMART PLAYLISTS</span></div>
            <nav className="nav-list" aria-label="Smart playlists">
              <button className={`nav-item ${view === 'Favorites' ? 'active' : ''}`} aria-label="Favorites" title={sidebarExpanded ? undefined : 'Favorites'} onClick={() => setView('Favorites')}><Heart size={18} /><span className="nav-label">Favorites</span><span className="nav-count">{favorites.length || ''}</span></button>
              <button className={`nav-item ${view === 'Recently Added' ? 'active' : ''}`} aria-label="Recently Added" title={sidebarExpanded ? undefined : 'Recently Added'} onClick={() => setView('Recently Added')}><Sparkles size={18} /><span className="nav-label">Recently Added</span></button>
              <button className={`nav-item ${view === 'Most Played' ? 'active' : ''}`} aria-label="Most Played" title={sidebarExpanded ? undefined : 'Most Played'} onClick={() => setView('Most Played')}><Flame size={18} /><span className="nav-label">Most Played</span></button>
              <button className={`nav-item ${view === 'Recently Played' ? 'active' : ''}`} aria-label="Recently Played" title={sidebarExpanded ? undefined : 'Recently Played'} onClick={() => setView('Recently Played')}><History size={18} /><span className="nav-label">Recently Played</span></button>
            </nav>
          </section>
          <section className="sidebar-section collection-section">
            <div className="sidebar-label sidebar-label-row"><span className="collection-label">YOUR COLLECTION</span><button title="Import music" aria-label="Import music" onClick={() => fileRef.current?.click()}><Plus size={16} /></button></div>
            <nav className="nav-list" aria-label="Your collection">
              <button className={`nav-item ${view === 'Queue' ? 'active' : ''}`} aria-label="Play Queue" title={sidebarExpanded ? undefined : 'Play Queue'} onClick={event => { setView('Queue'); openQueue(event.currentTarget) }}><ListMusic size={18} /><span className="nav-label">Play Queue</span></button>
              <button className="nav-item" aria-label="Add Folder" title={sidebarExpanded ? undefined : 'Add Folder'} onClick={() => folderRef.current?.click()}><FolderPlus size={18} /><span className="nav-label">Add Folder</span></button>
              <button className={`nav-item ${view === 'Audio Tools' ? 'active' : ''}`} aria-label="Audio Tools" title={sidebarExpanded ? undefined : 'Audio Tools'} onClick={() => setView('Audio Tools')}><AudioLines size={18} /><span className="nav-label">Audio Tools</span></button>
              <button className={`nav-item ${view === 'Statistics' ? 'active' : ''}`} aria-label="Statistics" title={sidebarExpanded ? undefined : 'Statistics'} onClick={() => setView('Statistics')}><ChartNoAxesColumn size={18} /><span className="nav-label">Statistics</span></button>
            </nav>
          </section>
        </div>
        <div className="sidebar-bottom">
          <div className="local-card">
            <div className="local-card-icon"><Disc3 size={19} /></div>
            <div className="local-card-copy"><strong>Your music, locally.</strong><p>Files stay on your device.</p></div>
          </div>
          <button className="nav-item settings-link" aria-label="Settings" title={sidebarExpanded ? undefined : 'Settings'} onClick={openSettings}><Settings2 size={18} /><span className="nav-label">Settings</span></button>
          <div className="sidebar-footer"><span className="status-dot" /><span className="sidebar-status-label">Local Library</span><span>{DISPLAY_VERSION}</span></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Library</span><span className="crumb-slash">/</span><strong>{viewTitle}</strong></div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={17} />
              <input id="search-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your music..." />
              {query && <button onClick={() => setQuery('')} title="Clear search"><X size={14} /></button>}
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button theme-icon-button" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} onClick={() => setTheme(value => value === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
            <div className="more-menu-wrap" ref={moreMenuRef}>
              <button
                ref={moreMenuButtonRef}
                className={`icon-button more-menu-button ${showMoreMenu ? 'is-open' : ''}`}
                type="button"
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={showMoreMenu && !moreMenuClosing}
                aria-controls={showMoreMenu ? 'xiamusic-more-menu' : undefined}
                title="More options"
                onClick={toggleMoreMenu}
              >
                <MoreHorizontal size={20} strokeWidth={2.2} />
              </button>
              {showMoreMenu && (
                <div
                  id="xiamusic-more-menu"
                  className={`more-menu ${moreMenuClosing ? 'is-closing' : ''}`}
                  role="menu"
                  aria-label="More options"
                  onKeyDown={event => {
                    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
                    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)
                    let nextIndex: number | null = null
                    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length
                    if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length
                    if (event.key === 'Home') nextIndex = 0
                    if (event.key === 'End') nextIndex = items.length - 1
                    if (nextIndex !== null) {
                      event.preventDefault()
                      items[nextIndex]?.focus()
                    }
                  }}
                >
                  <button className="more-menu-item" type="button" role="menuitem" onClick={() => { closeMoreMenu(false); openSettings() }}><Settings2 size={16} /><span>Settings</span></button>
                  <button className="more-menu-item" type="button" role="menuitem" onClick={() => { setView('Audio Tools'); closeMoreMenu() }}><AudioLines size={16} /><span>Audio tools</span></button>
                  <button className="more-menu-item" type="button" role="menuitem" onClick={() => { setView('Statistics'); closeMoreMenu() }}><ChartNoAxesColumn size={16} /><span>Statistics</span></button>
                  <button className="more-menu-item" type="button" role="menuitem" onClick={event => { setView('Queue'); openQueue(event.currentTarget); closeMoreMenu(false) }}><ListMusic size={16} /><span>Play queue</span></button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-scroll">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> YOUR PERSONAL SOUNDTRACK</div>
              <h1>{view === 'Favorites' ? 'Songs you love.' : view === 'Queue' ? 'Up next.' : view === 'Your Library' ? 'Your collection.' : viewTitle === 'Home' ? 'Music, without the noise.' : viewTitle}</h1>
              <p className="welcome-subtitle">{tracks.length ? `${tracks.length} tracks · ${albums.length} albums · ${artists.length} artists, all on this device.` : 'A little space for all the music that moves you.'}</p>
            </div>
            <div className="welcome-actions">
              <button className="subtle-button" onClick={() => folderRef.current?.click()}><FolderPlus size={16} /> Add folder</button>
              <button className="primary-button" onClick={() => fileRef.current?.click()}><Plus size={17} /> Add music</button>
            </div>
          </section>

          {!tracks.length ? (
            <section className="empty-state">
              <div className="empty-art"><div className="empty-art-ring ring-one" /><div className="empty-art-ring ring-two" /><div className="empty-art-core"><Music2 size={36} strokeWidth={1.1} /></div></div>
              <div className="empty-title">Your next favorite starts here.</div>
              <p>Import audio files from your device to create your personal library.<br />Your files stay on your device and are not uploaded.</p>
              <button className="primary-button" onClick={() => fileRef.current?.click()}><Upload size={17} /> Choose audio files</button>
              <div className="supported-formats">MP3 · WAV · M4A · FLAC · OGG · AAC</div>
            </section>
          ) : (
            <>
              {view === 'Home' && !query && (
                <section className="feature-banner">
                  <div className="feature-copy">
                    <span className="feature-kicker">MADE FOR YOUR MOMENTS</span>
                    <h2>Good music.<br /><em>No distractions.</em></h2>
                    <p>Your personal library, beautifully in one place.</p>
                    <button className="banner-button" onClick={() => tracks[0] && playTrack(tracks[0])}><Play size={15} fill="currentColor" /> Play your library</button>
                  </div>
                  <div className="banner-art"><div className="banner-disc"><div className="disc-groove" /><div className="disc-center"><AudioLines size={26} /></div></div><div className="banner-leaf leaf-a" /><div className="banner-leaf leaf-b" /></div>
                </section>
              )}

              {view === 'Home' && !query && (
                <section className="smart-playlist-grid" aria-label="Your music at a glance">
                  <button className="smart-playlist-card favorites-card" onClick={() => setView('Favorites')}><Heart size={20} /><strong>Favorites</strong><span>{favorites.length} saved</span></button>
                  <button className="smart-playlist-card" onClick={() => setView('Recently Added')}><Sparkles size={20} /><strong>Recently added</strong><span>{tracks.length} tracks</span></button>
                  <button className="smart-playlist-card" onClick={() => setView('Most Played')}><Flame size={20} /><strong>Most played</strong><span>By play count</span></button>
                  <button className="smart-playlist-card" onClick={() => setView('Recently Played')}><History size={20} /><strong>Recently played</strong><span>{recentTracks.length} tracks</span></button>
                </section>
              )}

              {(view === 'Albums' || view === 'Your Library') && (
                <section className="browse-section">
                  <div className="section-heading"><div><h2>Albums</h2><p>{albums.length} albums from imported audio</p></div><button className="subtle-button" onClick={() => setView('Albums')}>See all</button></div>
                  <div className="browse-grid">
                    {albums.slice(0, view === 'Albums' ? undefined : 6).map((album, index) => (
                      <button className="browse-card" key={album.key} onClick={() => { setSelectedAlbum(album.key); setView('Album detail') }}>
                        <Cover index={index} large /><strong>{album.title}</strong><span>{album.artist} · {album.tracks.length} tracks</span>
                      </button>
                    ))}
                    {!albums.length && <p className="browse-empty">Albums appear here as you import music.</p>}
                  </div>
                </section>
              )}

              {(view === 'Artists' || view === 'Your Library') && (
                <section className="browse-section">
                  <div className="section-heading"><div><h2>Artists</h2><p>{artists.length} artists in your library</p></div><button className="subtle-button" onClick={() => setView('Artists')}>See all</button></div>
                  <div className="browse-grid artist-grid">
                    {artists.slice(0, view === 'Artists' ? undefined : 6).map((artist, index) => (
                      <button className="browse-card artist-card" key={artist.name} onClick={() => { setSelectedArtist(artist.name); setView('Artist detail') }}>
                        <div className="artist-art"><Users size={25} /></div><strong>{artist.name}</strong><span>{artist.tracks.length} tracks</span>
                      </button>
                    ))}
                    {!artists.length && <p className="browse-empty">Artists are grouped from the names in your imported filenames.</p>}
                  </div>
                </section>
              )}

              {view === 'Statistics' && (
                <section className="statistics-grid">
                  <div className="stat-card"><span>TRACKS</span><strong>{tracks.length}</strong><small>Stored on this device</small></div>
                  <div className="stat-card"><span>ALBUMS</span><strong>{albums.length}</strong><small>Grouped from track metadata</small></div>
                  <div className="stat-card"><span>ARTISTS</span><strong>{artists.length}</strong><small>Grouped from track metadata</small></div>
                  <div className="stat-card"><span>PLAYBACKS</span><strong>{tracks.reduce((total, track) => total + track.playCount, 0)}</strong><small>30 seconds listened, or most of a shorter track</small></div>
                  <div className="stat-card"><span>FAVORITES</span><strong>{favorites.length}</strong><small>Tracks you have liked</small></div>
                </section>
              )}

              {view === 'Audio Tools' && (
                <section className="audio-tools-panel">
                  <div className="audio-tools-icon"><AudioLines size={24} /></div>
                  <h2>Audio tools</h2>
                  <p>Playback, seeking, volume, shuffle, repeat, and queue controls are available in the player. Editing, conversion, and effects are not available yet, so your original audio stays untouched.</p>
                  <button className="subtle-button" onClick={() => current && setShowExpandedPlayer(true)} disabled={!current}><Maximize2 size={16} /> Open now playing</button>
                </section>
              )}

              {view !== 'Audio Tools' && view !== 'Statistics' && view !== 'Albums' && view !== 'Artists' && (
              <section className="tracks-section">
                <div className="section-heading">
                  <div><h2>{query ? 'Search results' : view === 'Favorites' ? 'Favorites' : view === 'Queue' ? 'Play queue' : view === 'Recently Played' ? 'Recently played' : view === 'Most Played' ? 'Most played' : view === 'Recently Added' ? 'Recently added' : view === 'Album detail' || view === 'Artist detail' ? viewTitle : view === 'Search' ? 'Search your library' : 'Your tracks'}</h2><p><span className="track-count">{visibleTracks.length}</span>{visibleTracks.length === 1 ? ' track' : ' tracks'} in this view</p></div>
                  <div className="track-section-actions">
                    <SortDropdown value={sortKey} onChange={setSortKey} />
                    <button className="subtle-button" onClick={event => { setView('Queue'); openQueue(event.currentTarget) }}><ListMusic size={16} /> View queue</button>
                  </div>
                </div>
                <div className="track-table">
                  <div className="track-table-head"><span>#</span><span>TITLE</span><span>ALBUM</span><span>ADDED</span><span><Clock3 size={15} /></span></div>
                  {visibleTracks.map((track, index) => (
                    <div
                      className={`track-row ${currentId === track.id ? 'track-current' : ''} ${removingTrackIds.includes(track.id) ? 'is-removing' : ''}`}
                      key={track.id}
                      onDoubleClick={() => !removingTrackIds.includes(track.id) && playTrack(track)}
                    >
                      <button className={`track-index ${currentId === track.id ? 'is-current' : ''}`} disabled={removingTrackIds.includes(track.id)} onClick={() => currentId === track.id ? setPlaying(!playing) : playTrack(track)} aria-label={playing && currentId === track.id ? 'Pause track' : 'Play track'}>
                        {! (currentId === track.id && audioIsPlaying) && <span className="track-index-number">{index + 1}</span>}
                        <Play size={15} className="row-play" fill="currentColor" />
                        <TrackWaveform active={currentId === track.id} playing={currentId === track.id && audioIsPlaying && volume > 0} analyser={waveformAnalyser} />
                      </button>
                      <button className="track-title-cell" disabled={removingTrackIds.includes(track.id)} onClick={() => playTrack(track)}>
                        <Cover index={index} />
                        <span className="track-text"><strong>{track.title}</strong><small>{track.artist}</small></span>
                      </button>
                      <span className="track-album">{track.album}</span>
                      <span className="track-added">{new Date(track.addedAt).toLocaleDateString()}</span>
                      <div className="track-actions">
                        <button className={`heart-button ${favorites.includes(track.id) ? 'hearted' : ''}`} title="Like song" aria-label={`Like ${track.title}`} disabled={removingTrackIds.includes(track.id)} onClick={() => toggleFavorite(track.id)}><Heart size={16} fill={favorites.includes(track.id) ? 'currentColor' : 'none'} /></button>
                        <button
                          className="more-button"
                          type="button"
                          title={`Actions for ${track.title}`}
                          aria-label={`Actions for ${track.title}`}
                          aria-haspopup="menu"
                          aria-expanded={trackMenu?.trackId === track.id}
                          aria-controls={trackMenu?.trackId === track.id ? `track-menu-${track.id}` : undefined}
                          disabled={removingTrackIds.includes(track.id)}
                          onClick={event => openTrackMenu(track, event.currentTarget)}
                        ><MoreHorizontal size={18} /></button>
                        <span className="track-duration">{currentId === track.id && duration ? formatTime(duration) : '—:—'}</span>
                      </div>
                    </div>
                  ))}
                  {!visibleTracks.length && <div className="no-results">{view === 'Favorites' ? 'Like a track to add it to Favorites.' : view === 'Recently Played' ? 'Play some music to build your listening history.' : 'No tracks found. Try another search or import more music.'}</div>}
                </div>
                <div className="library-note"><CircleHelp size={15} /> Tip: name files “Artist - Song” to automatically fill in artist and title.</div>
              </section>
              )}
            </>
          )}
          {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice('')}><X size={14} /></button></div>}
          <footer className="page-footer"><span>XIAMUSIC</span><span>YOUR MUSIC. YOUR SPACE.</span></footer>
        </div>
      </main>

      {trackMenu && (() => {
        const track = tracks.find(item => item.id === trackMenu.trackId)
        if (!track) return null
        return (
          <div
            ref={trackMenuRef}
            id={`track-menu-${track.id}`}
            className="track-context-menu"
            role="menu"
            aria-label={`${track.title} actions`}
            style={{ left: trackMenu.left, top: trackMenu.top }}
            onKeyDown={event => {
              const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
              const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)
              let nextIndex: number | null = null
              if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length
              if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length
              if (event.key === 'Home') nextIndex = 0
              if (event.key === 'End') nextIndex = items.length - 1
              if (nextIndex !== null) {
                event.preventDefault()
                items[nextIndex]?.focus()
              }
            }}
          >
            <button className="track-context-menu-item" type="button" role="menuitem" onClick={() => { closeTrackMenu(true); addToQueue(track) }}>
              <ListMusic size={16} /><span>Add to Queue</span>
            </button>
            <button className="track-context-menu-item delete-menu-item" type="button" role="menuitem" onClick={() => openDeleteConfirmation(track)}>
              <Trash2 size={16} /><span>Delete from Library</span>
            </button>
          </div>
        )
      })()}

      <footer className="player-bar" ref={playerBarRef}>
        <div className="now-playing">
          {current ? <Cover index={Math.max(0, tracks.findIndex(t => t.id === current.id))} /> : <div className="mini-placeholder"><Music2 size={19} /></div>}
          <div className="now-playing-text"><strong>{current?.title ?? 'Nothing playing yet'}</strong><span>{current?.artist ?? 'Choose a track to begin'}</span></div>
          {current && currentIsInLibrary && <button className={`heart-button player-heart ${favorites.includes(current.id) ? 'hearted' : ''}`} onClick={() => toggleFavorite(current.id)} title="Like song"><Heart size={17} fill={favorites.includes(current.id) ? 'currentColor' : 'none'} /></button>}
        </div>
        <div className="player-center">
          <div className="player-controls">
            <button className={`control-button ${shuffle ? 'control-active' : ''}`} title="Shuffle" onClick={() => setShuffle(v => !v)}><Shuffle size={16} /></button>
            <button className="control-button skip-control" title={`Skip backward ${skipInterval} seconds`} aria-label={`Skip backward ${skipInterval} seconds`} onClick={() => skipPlayback(-1)} disabled={!current}><Rewind size={16} /></button>
            <button className="control-button" title="Previous" onClick={previousTrack} disabled={!tracks.length}><SkipBack size={19} fill="currentColor" /></button>
            <button className="play-button" title={playing ? 'Pause' : 'Play'} onClick={() => current ? setPlaying(v => !v) : tracks[0] && playTrack(tracks[0])}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
            <button className="control-button" title="Next" onClick={nextTrack} disabled={!tracks.length}><SkipForward size={19} fill="currentColor" /></button>
            <button className="control-button skip-control" title={`Skip forward ${skipInterval} seconds`} aria-label={`Skip forward ${skipInterval} seconds`} onClick={() => skipPlayback(1)} disabled={!current}><FastForward size={16} /></button>
            <button className={`control-button ${repeat ? 'control-active' : ''}`} title="Repeat" onClick={() => setRepeat(v => !v)}><Repeat2 size={16} /></button>
          </div>
          <div className="progress-row">
            <span>{formatTime(currentTime)}</span>
            <input aria-label="Playback position" className="progress-slider" type="range" min="0" max={duration || 100} value={Math.min(currentTime, duration || 100)} onChange={e => { if (audioRef.current) { audioRef.current.currentTime = Number(e.target.value); setCurrentTime(Number(e.target.value)) } }} />
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <div className="player-right">
          <button ref={queueToggleButtonRef} className={`control-button ${showQueue ? 'control-active' : ''}`} title="Queue" aria-label="Queue" aria-expanded={showQueue} aria-controls="play-queue-panel" onClick={event => showQueue ? closeQueue() : openQueue(event.currentTarget)}><ListMusic size={18} /></button>
          <PlaybackSpeedControl playbackRate={playbackRate} onChange={setPlaybackRate} />
          <button ref={playerExpandButtonRef} className="control-button player-expand-button" title="Expand player" aria-label="Expand player" onClick={() => { setExpandedPlayerClosing(false); setShowExpandedPlayer(true) }} disabled={!current}><Maximize2 size={17} /></button>
          <div className="volume-control">
            <button className="control-button volume-toggle" title={volume === 0 ? 'Unmute' : 'Mute'} aria-label={volume === 0 ? 'Unmute' : 'Mute'} aria-pressed={volume === 0} onClick={() => setVolume(v => v > 0 ? 0 : 0.8)}>{volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
            <input aria-label="Volume" className="volume-slider" type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(Number(e.target.value))} />
          </div>
        </div>
      </footer>

      {showExpandedPlayer && current && (
        <div className={`expanded-player-backdrop ${expandedPlayerClosing ? 'is-closing' : ''}`} onClick={() => closeExpandedPlayer()}>
          <section ref={expandedPlayerRef} className={`expanded-player ${expandedPlayerClosing ? 'is-closing' : ''}`} role="dialog" aria-modal="true" aria-hidden={expandedPlayerClosing} aria-label="Now playing" onClick={e => e.stopPropagation()}>
            <header className="expanded-player-header">
              <button className="icon-button expanded-close" title="Minimize player" aria-label="Minimize player" onClick={() => closeExpandedPlayer()}><ChevronDown size={21} /></button>
              <div className="expanded-header-label"><span>NOW PLAYING</span><strong>{current.album}</strong></div>
              <button className="icon-button" title="Queue" aria-label="Open queue" onClick={event => { closeExpandedPlayer(false); openQueue(event.currentTarget) }}><ListMusic size={18} /></button>
            </header>
            <div className="expanded-player-content">
              <div className="expanded-artwork-wrap">
                <Cover index={Math.max(0, tracks.findIndex(t => t.id === current.id))} large />
              </div>
              <div className="expanded-player-details">
                <div className="expanded-track-heading">
                  <div><span className="expanded-eyebrow">{currentIsInLibrary ? 'PLAYING FROM YOUR LIBRARY' : 'REMOVED FROM YOUR LIBRARY'}</span><h2>{current.title}</h2><p>{current.artist}</p></div>
                  {currentIsInLibrary && <button className={`heart-button expanded-heart ${favorites.includes(current.id) ? 'hearted' : ''}`} onClick={() => toggleFavorite(current.id)} title="Like song"><Heart size={23} fill={favorites.includes(current.id) ? 'currentColor' : 'none'} /></button>}
                </div>
                <div className="expanded-progress">
                  <input aria-label="Playback position" className="progress-slider" type="range" min="0" max={duration || 100} value={Math.min(currentTime, duration || 100)} onChange={e => { if (audioRef.current) { audioRef.current.currentTime = Number(e.target.value); setCurrentTime(Number(e.target.value)) } }} />
                  <div><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
                </div>
                <div className="expanded-controls">
                  <div className="expanded-volume">
                    <input aria-label="Volume" className="volume-slider" type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(Number(e.target.value))} />
                    <button className="control-button volume-toggle" title={volume === 0 ? 'Unmute' : 'Mute'} aria-label={volume === 0 ? 'Unmute' : 'Mute'} aria-pressed={volume === 0} onClick={() => setVolume(v => v > 0 ? 0 : 0.8)}>{volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
                  </div>
                  <div className="expanded-main-controls">
                    <button className={`control-button ${shuffle ? 'control-active' : ''}`} title="Shuffle" aria-label="Shuffle" onClick={() => setShuffle(v => !v)}><Shuffle size={20} /></button>
                    <button className="control-button skip-control" title={`Skip backward ${skipInterval} seconds`} aria-label={`Skip backward ${skipInterval} seconds`} onClick={() => skipPlayback(-1)} disabled={!current}><Rewind size={19} /></button>
                    <button className="control-button" title="Previous" aria-label="Previous" onClick={previousTrack} disabled={!tracks.length}><SkipBack size={24} fill="currentColor" /></button>
                    <button className="play-button expanded-play-button" title={playing ? 'Pause' : 'Play'} aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(v => !v)}>{playing ? <Pause size={23} fill="currentColor" /> : <Play size={23} fill="currentColor" />}</button>
                    <button className="control-button" title="Next" aria-label="Next" onClick={nextTrack} disabled={!tracks.length}><SkipForward size={24} fill="currentColor" /></button>
                    <button className="control-button skip-control" title={`Skip forward ${skipInterval} seconds`} aria-label={`Skip forward ${skipInterval} seconds`} onClick={() => skipPlayback(1)} disabled={!current}><FastForward size={19} /></button>
                    <button className={`control-button ${repeat ? 'control-active' : ''}`} title="Repeat" aria-label="Repeat" onClick={() => setRepeat(v => !v)}><Repeat2 size={20} /></button>
                  </div>
                  <div className="expanded-speed-area">
                    <PlaybackSpeedControl playbackRate={playbackRate} onChange={setPlaybackRate} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {showQueue && (
        <div ref={queueBackdropRef} className={`side-panel-backdrop ${queueEntered ? 'is-open' : ''} ${queueClosing ? 'is-closing' : ''}`} aria-hidden={queueClosing} onClick={() => closeQueue()}>
          <aside id="play-queue-panel" className={`side-panel ${queueEntered ? 'is-open' : ''} ${queueClosing ? 'is-closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="play-queue-title" onClick={e => e.stopPropagation()} onKeyDown={event => {
            if (event.key !== 'Tab') return
            const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled])'))
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (!first || !last) {
              event.preventDefault()
            } else if (event.shiftKey && document.activeElement === first) {
              event.preventDefault()
              last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault()
              first.focus()
            }
          }}>
            <div className="panel-heading"><div><h2 id="play-queue-title">Play queue</h2><p>{queue.length} tracks</p></div><button ref={queueCloseButtonRef} className="icon-button" type="button" aria-label="Close queue" onClick={() => closeQueue()}><X size={19} /></button></div>
            <div className="queue-label">NOW PLAYING</div>
            {current && <div className="queue-current"><Cover index={Math.max(0, tracks.findIndex(t => t.id === current.id))} /><div><strong>{current.title}</strong><small>{current.artist}</small></div><AudioLines size={17} className="playing-icon" /></div>}
            <div className="queue-label">NEXT UP</div>
            {queue.filter(id => id !== currentId).map((id, i) => {
              const t = tracks.find(x => x.id === id)
              if (!t) return null
              return <button className="queue-row" key={`${id}-${i}`} onClick={() => playTrack(t)}><Cover index={i} /><span><strong>{t.title}</strong><small>{t.artist}</small></span><Play size={15} /></button>
            })}
            {!queue.filter(id => id !== currentId).length && <p className="panel-empty">Add tracks to your queue to see what's next.</p>}
          </aside>
        </div>
      )}

      {showSettings && (
        <div className={`modal-backdrop settings-backdrop ${settingsClosing ? 'is-closing' : ''}`} onClick={closeSettings}>
          <section
            className={`settings-modal settings-entering ${settingsClosing ? 'is-closing' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onClick={e => e.stopPropagation()}
            onKeyDown={event => {
              if (event.key === 'Escape') {
                event.preventDefault()
                closeSettings()
                return
              }
              if (event.key !== 'Tab') return
              const focusable = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])')
              const first = focusable[0]
              const last = focusable[focusable.length - 1]
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last?.focus()
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first?.focus()
              }
            }}
          >
            <div className="panel-heading"><div><h2 id="settings-title">Settings</h2><p>Make XiaMusic feel like yours.</p></div><button ref={settingsCloseButtonRef} className="icon-button" aria-label="Close settings" onClick={closeSettings}><X size={19} /></button></div>
            <div className={`settings-layout ${privacyPolicyOpen ? 'is-policy-open' : ''}`}>
              {!privacyPolicyOpen && <nav className="settings-navigation" aria-label="Settings sections">
                {([
                  ['General', Settings2],
                  ['Appearance', Sun],
                  ['Audio & Playback', Volume2],
                  ['Equalizer', SlidersHorizontal],
                  ['Library', Library],
                  ['About', Info]
                ] as const).map(([label, Icon]) => (
                  <button
                    key={label}
                    type="button"
                    className={`settings-nav-item ${settingsSection === label ? 'active' : ''}`}
                    aria-current={settingsSection === label ? 'page' : undefined}
                    onClick={() => { setSettingsSection(label); setPrivacyPolicyOpen(false) }}
                  >
                    <Icon size={16} />{label}
                  </button>
                ))}
              </nav>}
              <div className="settings-content">
                {privacyPolicyOpen ? (
                  <PrivacyPolicyPage onBack={closePrivacyPolicy} />
                ) : (
                  <>
                {settingsSection === 'General' && (
                  <section className="settings-section-content">
                    <h3>General</h3>
                    <p className="settings-section-description">Your music stays yours and on this device.</p>
                    <div className="settings-row"><div><strong>Local-first library</strong><p>Your selected audio is played from this device.</p></div><span className="settings-pill">Enabled</span></div>
                    <div className="settings-row"><div><strong>Online streaming</strong><p>Not connected yet. A licensed provider and backend are needed.</p></div><span className="settings-pill muted-pill">Coming later</span></div>
                    <p className="settings-footnote">Playback history and preferences are stored locally in this browser profile. Nothing is uploaded.</p>
                  </section>
                )}
                {settingsSection === 'Appearance' && (
                  <section className="settings-section-content">
                    <h3>Appearance</h3>
                    <p className="settings-section-description">Choose the look that feels right for you.</p>
                    <div className="settings-row"><div><strong>Color theme</strong><p>Apply the coordinated Liquid Glass theme throughout XiaMusic.</p></div><button className="theme-toggle" role="switch" aria-checked={theme === 'dark'} onClick={() => setTheme(value => value === 'light' ? 'dark' : 'light')}><span>{theme === 'light' ? <Sun size={15} /> : <Moon size={15} />}{theme === 'light' ? 'Light' : 'Dark'}</span><span className="theme-toggle-track"><span /></span></button></div>
                  </section>
                )}
                {settingsSection === 'Audio & Playback' && (
                  <section className="settings-section-content">
                    <h3>Audio &amp; Playback</h3>
                    <p className="settings-section-description">Playback controls stay available in the player.</p>
                    <div className="settings-row"><div><strong>Output volume</strong><p>Adjust your listening level.</p></div><label className="settings-volume"><Volume2 size={15} /><input aria-label="Settings volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={event => setVolume(Number(event.target.value))} /></label></div>
                    <div className="settings-row"><div><strong>Skip interval</strong><p>Choose how far skip controls jump in either direction.</p></div><label className="settings-select-label"><span className="visually-hidden">Skip interval</span><select className="settings-select" aria-label="Skip interval" value={skipInterval} onChange={event => setSkipInterval(event.target.value === '5' ? 5 : 10)}><option value={5}>5 seconds</option><option value={10}>10 seconds</option></select></label></div>
                    <div className="settings-row"><div><strong>Equalizer</strong><p>Shape the tone across ten frequency bands.</p></div><button className="subtle-button" type="button" onClick={() => setSettingsSection('Equalizer')}><SlidersHorizontal size={15} /> Open equalizer</button></div>
                  </section>
                )}
                {settingsSection === 'Equalizer' && (
                  <EqualizerPanel settings={equalizer} onChange={setEqualizer} />
                )}
                {settingsSection === 'Library' && (
                  <section className="settings-section-content">
                    <h3>Library</h3>
                    <p className="settings-section-description">Manage imported audio stored on this device.</p>
                    <div className="settings-row"><div><strong>Clear local library</strong><p>Remove imported audio and its saved playback history from this device.</p></div><button className="danger-button" onClick={() => void clearLibrary()}>Clear library</button></div>
                    <p className="settings-footnote">Clearing your library does not remove your theme or equalizer preferences.</p>
                  </section>
                )}
                {settingsSection === 'About' && (
                  <section className="settings-section-content">
                    <h3>About XiaMusic</h3>
                    <p className="settings-section-description">Your music. Your space.</p>
                    <div className="settings-row"><div><strong>Version</strong><p>XiaMusic desktop music player</p></div><span className="settings-pill">{DISPLAY_VERSION}</span></div>
                    <p className="settings-footnote">A local-first player for your personal audio collection.</p>
                    <div className="settings-row privacy-policy-link-row"><div><strong>Privacy Policy</strong><p>Learn how XiaMusic handles your information.</p></div><button ref={privacyPolicyButtonRef} className="subtle-button" type="button" onClick={() => setPrivacyPolicyOpen(true)}><Info size={15} /> Read policy</button></div>
                  </section>
                )}
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {deleteCandidate && (
        <div className="delete-dialog-backdrop" onClick={() => dismissDeleteConfirmation()}>
          <section
            ref={deleteDialogRef}
            className="delete-dialog"
            tabIndex={-1}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description"
            onClick={event => event.stopPropagation()}
            onKeyDown={event => {
              if (event.key === 'Escape') {
                event.preventDefault()
                dismissDeleteConfirmation()
                return
              }
              if (event.key !== 'Tab') return
              const focusable = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled)')
              if (!focusable.length) {
                event.preventDefault()
                event.currentTarget.focus()
                return
              }
              const first = focusable[0]
              const last = focusable[focusable.length - 1]
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last?.focus()
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first?.focus()
              }
            }}
          >
            <div className="delete-dialog-icon"><Trash2 size={19} /></div>
            <h2 id="delete-dialog-title">Remove this song?</h2>
            <p id="delete-dialog-description">Are you sure you want to remove <strong>{deleteCandidate.title}</strong> from your XiaMusic library? The original audio file on your computer will not be deleted.</p>
            {deleteError && <p className="delete-dialog-error" role="alert">{deleteError}</p>}
            <div className="delete-dialog-actions">
              <button ref={deleteCancelButtonRef} className="subtle-button" type="button" disabled={deletingTrackId === deleteCandidate.id} onClick={() => dismissDeleteConfirmation()}>Cancel</button>
              <button className="danger-button delete-confirm-button" type="button" disabled={deletingTrackId === deleteCandidate.id} onClick={() => void removeTrack(deleteCandidate.id)}>
                {deletingTrackId === deleteCandidate.id ? 'Removing…' : 'Remove Song'}
              </button>
            </div>
          </section>
        </div>
      )}

      <audio ref={audioRef} onPlay={() => setAudioIsPlaying(true)} onPause={() => setAudioIsPlaying(false)} onTimeUpdate={e => {
        const time = e.currentTarget.currentTime
        setCurrentTime(time)
        if (current) {
          const progress = playbackListenRef.current
          if (progress.trackId !== current.id) {
            playbackListenRef.current = { trackId: current.id, lastTime: time, listened: 0 }
          } else {
            const elapsed = playing && time >= progress.lastTime && time - progress.lastTime <= 2
              ? time - progress.lastTime
              : 0
            progress.lastTime = time
            progress.listened += elapsed
            if (progress.listened >= 30 && playCountedTrackRef.current !== current.id) {
              markTrackPlayed(current.id)
            }
          }
        }
      }} onLoadedMetadata={e => {
        const loadedDuration = e.currentTarget.duration || 0
        const loadedTrackId = current?.id
        setDuration(loadedDuration)
        if (loadedTrackId) {
          setTracks(prev => prev.map(t => t.id === loadedTrackId ? { ...t, duration: loadedDuration } : t))
          void updateStoredTrack(loadedTrackId, { duration: loadedDuration }).catch(error => {
            setNotice(`Could not save track details: ${error instanceof Error ? error.message : String(error)}`)
          })
        }
      }} onEnded={event => {
        const endedAt = event.currentTarget.currentTime
        const progress = playbackListenRef.current
        const finalInterval = endedAt >= progress.lastTime && endedAt - progress.lastTime <= 2
          ? endedAt - progress.lastTime
          : 0
        progress.listened += finalInterval
        progress.lastTime = endedAt
        if (current && playCountedTrackRef.current !== current.id &&
          (progress.listened >= 30 ||
            (duration > 0 && duration <= 30 && progress.listened >= duration * 0.8))) {
          markTrackPlayed(current.id)
        }
        if (repeat && audioRef.current) {
          playCountedTrackRef.current = null
          playbackListenRef.current = { trackId: current?.id ?? null, lastTime: 0, listened: 0 }
          audioRef.current.currentTime = 0
          setCurrentTime(0)
          void audioRef.current.play()
        } else {
          nextTrack()
        }
      }} onError={() => { if (current) setNotice(`Unable to play ${current.fileName}. Try a supported audio format.`) }} />
      <input ref={fileRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus,.webm" multiple hidden onChange={importFiles} />
      <input ref={folderRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus,.webm" multiple hidden onChange={importFiles} />
    </div>
  )
}
