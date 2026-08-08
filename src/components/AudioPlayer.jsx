import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  ListMusic,
  Maximize2,
  Minimize2,
  Headphones,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const AudioPlayer = () => {
  const {
    playerState,
    togglePlayPause,
    seekTo,
    changeVolume,
    changePlaybackSpeed,
    skipSeconds,
  } = useStore();

  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.8);
  const [showChapters, setShowChapters] = useState(false);

  if (!playerState.book) return null;

  const { book, isSample, isPlaying, currentTime, duration, playbackSpeed, volume } = playerState;

  const handleMuteToggle = () => {
    if (isMuted) {
      changeVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      changeVolume(0);
      setIsMuted(true);
    }
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <aside className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-slate-800 shadow-2xl p-3 sm:p-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left Section: Book Details & Thumbnail */}
        <div className="flex items-center gap-3 w-full md:w-1/4 select-none">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700 shadow-md">
            <img
              src={book.coverUrl}
              alt={book.title}
              className="w-full h-full object-cover"
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center">
                <div className="flex items-center gap-0.5 h-4">
                  <div className="equalizer-bar"></div>
                  <div className="equalizer-bar"></div>
                  <div className="equalizer-bar"></div>
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                {book.title}
              </h4>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                isSample ? 'badge-amber' : 'badge-emerald'
              }`}>
                {isSample ? 'Sample' : 'Full Audiobook'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {book.author} • Narrated by {book.narrator}
            </p>
          </div>
        </div>

        {/* Center Section: Playback Controls & Progress Bar */}
        <div className="flex flex-col items-center gap-2 w-full md:w-2/4">
          
          {/* Action Buttons: Skip, Play/Pause, Speed */}
          <div className="flex items-center gap-4">
            
            {/* Skip -15s */}
            <button
              onClick={() => skipSeconds(-15)}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Rewind 15 seconds"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Main Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              className="w-11 h-11 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 transition-transform active:scale-95"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-slate-950" />
              ) : (
                <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
              )}
            </button>

            {/* Skip +15s */}
            <button
              onClick={() => skipSeconds(15)}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Forward 15 seconds"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Playback Speed Switcher */}
            <select
              value={playbackSpeed}
              onChange={(e) => changePlaybackSpeed(parseFloat(e.target.value))}
              className="bg-slate-900 text-amber-400 font-bold text-xs px-2 py-1 rounded-lg border border-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="0.75">0.75x</option>
              <option value="1.0">1.0x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2.0">2.0x</option>
            </select>

          </div>

          {/* Seek Bar Timeline */}
          <div className="w-full flex items-center gap-3 text-xs font-mono text-slate-400">
            <span className="w-10 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-amber-400"
            />
            <span className="w-10">{formatTime(duration)}</span>
          </div>

        </div>

        {/* Right Section: Volume & Chapters Dropdown */}
        <div className="hidden md:flex items-center justify-end gap-4 w-1/4">
          
          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button onClick={handleMuteToggle} className="text-slate-400 hover:text-white">
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-slate-300" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setIsMuted(false);
                changeVolume(parseFloat(e.target.value));
              }}
              className="w-20 h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-amber-400"
            />
          </div>

          {/* Chapter Selector Dropdown */}
          {book.chapters && book.chapters.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowChapters(!showChapters)}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
                title="Chapter Selector"
              >
                <ListMusic className="w-4 h-4" />
              </button>

              {showChapters && (
                <div className="absolute bottom-12 right-0 w-64 glass-panel rounded-2xl p-3 border border-slate-800 shadow-2xl space-y-1 z-50">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                    Chapters
                  </h5>
                  {book.chapters.map((ch, idx) => (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setShowChapters(false);
                        // Jump to proportional chapter timestamp demo
                        seekTo(idx * 30);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-between"
                    >
                      <span className="truncate">{ch.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{ch.duration}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </aside>
  );
};
