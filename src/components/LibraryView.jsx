import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Play, Pause, BookOpen, Clock, Download, CheckCircle, Search, Sparkles } from 'lucide-react';

export const LibraryView = () => {
  const { myLibrary, playerState, playTrack, setActiveTab } = useStore();
  const [filterQuery, setFilterQuery] = useState('');

  const filteredBooks = myLibrary.filter((book) =>
    book.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <section className="space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
            <BookOpen className="w-4 h-4" />
            <span>Personal Audio Bookshelf</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            My Audiobook Library
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            You own <span className="text-white font-bold">{myLibrary.length}</span> digital audiobook{myLibrary.length === 1 ? '' : 's'}. Stream full chapters anytime.
          </p>
        </div>

        {/* Search inside library */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search my audiobooks..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs glass-input"
            />
          </div>

          <button
            onClick={() => setActiveTab('store')}
            className="px-4 py-2.5 rounded-xl btn-amber text-xs font-bold whitespace-nowrap shadow-md"
          >
            + Buy More
          </button>
        </div>
      </div>

      {/* Library Grid */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-20 glass-panel rounded-3xl p-8 space-y-4">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-xl font-bold text-white">No audiobooks found in your library</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            {myLibrary.length === 0
              ? 'You haven’t purchased any audiobooks yet.'
              : 'No audiobooks match your search filter.'}
          </p>
          <button
            onClick={() => setActiveTab('store')}
            className="px-6 py-3 rounded-2xl btn-amber font-bold text-xs"
          >
            Explore Store Catalog
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => {
            const isPlayingThisFullTrack =
              playerState.book?.id === book.id &&
              !playerState.isSample &&
              playerState.isPlaying;

            return (
              <div
                key={book.id}
                className="glass-card rounded-2xl p-5 border border-slate-800 flex gap-4 group hover:border-amber-500/40 transition-all"
              >
                {/* Book Cover */}
                <div className="relative w-28 h-36 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 flex-shrink-0 shadow-lg">
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-950/20" />
                </div>

                {/* Info & Actions */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 mb-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Purchased & Unlocked</span>
                    </div>

                    <h3 className="font-extrabold text-base text-white truncate group-hover:text-amber-400 transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-xs text-slate-400 truncate">By {book.author}</p>
                    <p className="text-xs text-slate-400 truncate">Narrator: {book.narrator}</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{book.duration}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => playTrack(book, false)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                          isPlayingThisFullTrack
                            ? 'bg-amber-400 text-slate-950 shadow-lg'
                            : 'btn-amber'
                        }`}
                      >
                        {isPlayingThisFullTrack ? (
                          <>
                            <Pause className="w-4 h-4 fill-slate-950" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
                            <span>Listen Full</span>
                          </>
                        )}
                      </button>

                      <a
                        href={book.fullAudioUrl || book.sampleAudioUrl}
                        download={`${book.title}.mp3`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                        title="Download MP3"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </section>
  );
};
