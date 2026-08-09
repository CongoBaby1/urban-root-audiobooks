import React from 'react';
import { useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { AudiobookCard } from './components/AudiobookCard';
import { CartDrawer } from './components/CartDrawer';
import { StripeCheckoutModal } from './components/StripeCheckoutModal';
import { LibraryView } from './components/LibraryView';
import { SellerDashboard } from './components/SellerDashboard';
import { NotificationToast } from './components/NotificationToast';
import { CATEGORIES } from './data/initialAudiobooks';
import { Sparkles, SlidersHorizontal, Search, Headphones, BookOpen } from 'lucide-react';

export const AppContent = () => {
  const {
    audiobooks,
    activeTab,
    searchQuery,
    selectedCategory,
    setSelectedCategory,
  } = useStore();

  // Filter Catalog by Genre Category & Search Query
  const filteredCatalog = audiobooks.filter((book) => {
    const matchesCategory =
      selectedCategory === 'All Genres' || book.category === selectedCategory;
    const matchesQuery =
      !searchQuery ||
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.narrator.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesQuery;
  });

  return (
    <div className="min-h-screen flex flex-col pb-32">
      <Navbar />
      <NotificationToast />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* VIEW 1: STOREFRONT */}
        {activeTab === 'store' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Featured Hero Banner */}
            {!searchQuery && selectedCategory === 'All Genres' && <HeroSection />}

            {/* Genre Filter Pills */}
            <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2 scrollbar-none">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
                  Filter by Category:
                </span>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none ${
                      selectedCategory === cat
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Storefront Audiobook Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
                  <Headphones className="w-5 h-5 text-amber-400" />
                  <span>
                    {searchQuery
                      ? `Search results for "${searchQuery}"`
                      : selectedCategory === 'All Genres'
                      ? 'Trending & Popular Audiobooks'
                      : selectedCategory}
                  </span>
                </h2>
                <span className="text-xs text-slate-400 font-medium">
                  Showing {filteredCatalog.length} title{filteredCatalog.length === 1 ? '' : 's'}
                </span>
              </div>

              {filteredCatalog.length === 0 ? (
                <div className="text-center py-20 glass-panel rounded-3xl space-y-3">
                  <Search className="w-10 h-10 text-slate-600 mx-auto" />
                  <h3 className="text-lg font-bold text-white">No audiobooks found</h3>
                  <p className="text-xs text-slate-400">
                    Try adjusting your search query or category filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCatalog.map((book) => (
                    <AudiobookCard key={book.id} book={book} />
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW 2: MY LIBRARY */}
        {activeTab === 'library' && <LibraryView />}

        {/* VIEW 3: SELLER STUDIO */}
        {activeTab === 'seller' && <SellerDashboard />}

      </main>

      {/* Slide-out Cart & Checkout Modals */}
      <CartDrawer />
      <StripeCheckoutModal />
    </div>
  );
};
