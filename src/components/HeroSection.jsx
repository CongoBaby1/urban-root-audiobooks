import React from 'react';
import { useStore } from '../context/StoreContext';
import { Play, Pause, Star, Clock, ShoppingCart, ShieldCheck, Sparkles, Radio } from 'lucide-react';

export const HeroSection = () => {
  const { audiobooks, playerState, playTrack, addToCart } = useStore();

  const featuredBook = audiobooks.find((b) => b.featured) || audiobooks[0];

  if (!featuredBook) return null;

  const isCurrentlyPlaying =
    playerState.book?.id === featuredBook.id && playerState.isPlaying;

  return (
    <section className="relative overflow-hidden rounded-3xl mb-12 border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-10 shadow-2xl">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Book Details */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full badge-amber text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Featured Bestseller of the Week</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {featuredBook.title}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-medium line-clamp-3 leading-relaxed">
            {featuredBook.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-300">
            <div className="flex items-center gap-1 text-amber-400 font-bold">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>{featuredBook.rating}</span>
              <span className="text-slate-400 font-normal">({featuredBook.ratingCount} reviews)</span>
            </div>

            <span className="text-slate-600">•</span>

            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{featuredBook.duration}</span>
            </div>

            <span className="text-slate-600">•</span>

            <div className="badge-emerald px-2.5 py-0.5 rounded-full text-xs font-semibold">
              Narrated by {featuredBook.narrator}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-wrap items-center gap-4">
            
            {/* Play Sample Button */}
            <button
              onClick={() => playTrack(featuredBook, true)}
              className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl text-slate-950 font-bold text-sm transition-all shadow-lg select-none ${
                isCurrentlyPlaying
                  ? 'bg-amber-400 shadow-amber-500/40 ring-2 ring-amber-300'
                  : 'btn-amber'
              }`}
            >
              {isCurrentlyPlaying ? (
                <>
                  <Pause className="w-5 h-5 fill-slate-950" />
                  <span>Pause Sample</span>
                  <div className="flex items-center gap-1 h-4 ml-1">
                    <div className="equalizer-bar"></div>
                    <div className="equalizer-bar"></div>
                    <div className="equalizer-bar"></div>
                  </div>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-slate-950" />
                  <span>Listen Free Sample</span>
                  <Radio className="w-4 h-4 text-slate-950 animate-pulse" />
                </>
              )}
            </button>

            {/* Buy / Add to Cart */}
            <button
              onClick={() => addToCart(featuredBook)}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 hover:border-amber-500/50 transition-all shadow-md"
            >
              <ShoppingCart className="w-4 h-4 text-amber-400" />
              <span>Buy Audiobook — ${(Number(featuredBook.price) || 0).toFixed(2)}</span>
              {featuredBook.originalPrice && (
                <span className="text-xs text-slate-400 line-through ml-1">
                  ${(Number(featuredBook.originalPrice) || 0).toFixed(2)}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-4 pt-2 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Instant Stripe Checkout & High Quality MP3 Access
            </span>
          </div>

        </div>

        {/* Right Column: Book Cover Display */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="relative group">
            {/* Glow backdrop behind cover */}
            <div className="absolute -inset-2 bg-gradient-to-r from-amber-500 to-amber-300 rounded-3xl opacity-30 blur-xl group-hover:opacity-50 transition duration-500"></div>

            <div className="relative w-64 sm:w-72 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80 bg-slate-950 flex items-center justify-center p-1">
              <img
                src={featuredBook.coverUrl}
                alt={featuredBook.title}
                className="w-full h-full object-contain transform group-hover:scale-105 transition duration-500 rounded-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80" />
              
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <span className="text-xs font-semibold text-amber-300 uppercase tracking-widest bg-slate-950/80 px-3 py-1 rounded-full backdrop-blur">
                  Author: {featuredBook.author}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
