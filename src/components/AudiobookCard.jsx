import React from 'react';
import { useStore } from '../context/StoreContext';
import { Play, Pause, Star, Clock, ShoppingCart, Check, Headphones } from 'lucide-react';

export const AudiobookCard = ({ book }) => {
  const { playerState, playTrack, addToCart, myLibrary } = useStore();

  const isOwned = myLibrary.some((item) => item.id === book.id);
  const isPlayingThisSample =
    playerState.book?.id === book.id && playerState.isPlaying;

  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col justify-between group relative">
      
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-slate-950 flex items-center justify-center p-1">
        <img
          src={book.coverUrl}
          alt={book.title}
          className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

        {/* Category Badge & Bestseller Ribbon */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          <span className="px-2.5 py-1 text-[11px] font-bold text-slate-200 bg-slate-950/80 backdrop-blur rounded-lg border border-slate-700">
            {book.category}
          </span>
          {book.bestseller && (
            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider badge-amber rounded-md">
              Bestseller
            </span>
          )}
        </div>

        {/* Hover Listen Sample Button Overlay */}
        <button
          onClick={() => playTrack(book, true)}
          className={`absolute bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all select-none ${
            isPlayingThisSample
              ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/40 scale-110'
              : 'bg-slate-900/90 text-amber-400 border border-amber-500/40 hover:bg-amber-500 hover:text-slate-950 hover:scale-110'
          }`}
          title="Play Free Sample"
        >
          {isPlayingThisSample ? (
            <div className="flex items-center gap-0.5 h-4">
              <div className="equalizer-bar"></div>
              <div className="equalizer-bar"></div>
              <div className="equalizer-bar"></div>
            </div>
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="font-bold text-base text-white group-hover:text-amber-400 transition-colors line-clamp-1">
            {book.title}
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            By <span className="text-slate-300">{book.author}</span>
          </p>

          <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
            {book.description}
          </p>
        </div>

        {/* Details Row: Duration & Narrator */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{book.duration}</span>
          </div>

          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>{book.rating}</span>
          </div>
        </div>

        {/* Price & Action Row */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-lg font-extrabold text-white">
              ${(Number(book.price) || 0).toFixed(2)}
            </div>
            {book.originalPrice && (
              <div className="text-[11px] text-slate-500 line-through">
                ${(Number(book.originalPrice) || 0).toFixed(2)}
              </div>
            )}
          </div>

          {isOwned ? (
            <button
              onClick={() => playTrack(book, false)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl badge-emerald font-bold text-xs shadow"
            >
              <Check className="w-4 h-4" />
              <span>In Library</span>
            </button>
          ) : (
            <button
              onClick={() => addToCart(book)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl btn-amber font-bold text-xs"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Add to Cart</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
