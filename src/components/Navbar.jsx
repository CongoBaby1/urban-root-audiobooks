import React from 'react';
import { useStore } from '../context/StoreContext';
import { Headphones, ShoppingBag, BookOpen, LayoutDashboard, Search, Sparkles } from 'lucide-react';

export const Navbar = () => {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    cart,
    setIsCartOpen,
    myLibrary,
    isAdminUnlocked,
  } = useStore();

  const totalCartCount = cart.length;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveTab('store')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Headphones className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-amber-400 transition-colors">
                Urban Root <span className="text-amber-400">Audiobooks</span>
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded badge-amber">
                OFFICIAL
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Stories From the Root. Voices Built to Last.</p>
          </div>
        </div>

        {/* Search Bar (When in Store view) */}
        {activeTab === 'store' && (
          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, author, or narrator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm glass-input focus:ring-2 focus:ring-amber-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Navigation Tabs & Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">

            <button
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all relative ${
                activeTab === 'library'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Library</span>
              {myLibrary.length > 0 && (
                <span className={`px-1.5 py-0.2 text-[11px] font-bold rounded-full ${
                  activeTab === 'library' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {myLibrary.length}
                </span>
              )}
            </button>

            {isAdminUnlocked && (
              <button
                onClick={() => setActiveTab('seller')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'seller'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Admin Portal</span>
              </button>
            )}
          </nav>

          {/* Cart Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-amber-400 font-semibold transition-all shadow-lg"
          >
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <span className="hidden sm:inline text-sm">Cart</span>
            {totalCartCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center shadow-md animate-pulse">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
