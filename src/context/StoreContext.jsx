import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { INITIAL_AUDIOBOOKS } from '../data/initialAudiobooks';
import { getAudioFile } from '../utils/audioStorage';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  // Catalog State (Firestore Sync + LocalStorage Fallback)
  const [audiobooks, setAudiobooks] = useState(() => {
    try {
      const saved = localStorage.getItem('audioverse_catalog');
      if (!saved) return INITIAL_AUDIOBOOKS;
      return parsed;
    } catch (e) {
      console.warn('LocalStorage parse error - safely restoring catalog:', e);
      try { localStorage.removeItem('audioverse_catalog'); } catch (_) {}
      return INITIAL_AUDIOBOOKS;
    }
  });

  // Real-Time Cloud Firestore Sync for Catalog Audiobooks
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(collection(db, 'audiobooks'), (snapshot) => {
        if (!snapshot.empty) {
          const firestoreBooks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          setAudiobooks((prevLocal) => {
            // Merge Firestore books with local catalog, preferring Firestore data
            const firestoreIds = new Set(firestoreBooks.map((b) => b.id));
            const remainingLocal = prevLocal.filter((b) => !firestoreIds.has(b.id));
            return [...firestoreBooks, ...remainingLocal];
          });
        }
      }, (error) => {
        console.warn('Firestore snapshot listener notice:', error);
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn('Firestore initialization notice:', err);
    }
  }, []);

  // User Library State
  const [myLibrary, setMyLibrary] = useState(() => {
    const saved = localStorage.getItem('audioverse_library');
    return saved ? JSON.parse(saved) : [INITIAL_AUDIOBOOKS[0]]; // Pre-owned starter book
  });

  // Shopping Cart State
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('audioverse_cart');
    return saved ? JSON.parse(saved) : [];
  });

  // Seller Dashboard Sales Ledger
  const [sellerStats, setSellerStats] = useState(() => {
    const saved = localStorage.getItem('audioverse_seller_stats');
    return saved ? JSON.parse(saved) : {
      totalRevenue: 149.85,
      totalSalesCount: 7,
      transactions: [
        { id: 'tx-101', date: '2026-08-01', itemTitle: 'The Cybernetic Frontier', amount: 19.99, status: 'Completed (Stripe)' },
        { id: 'tx-102', date: '2026-08-03', itemTitle: 'Atomic Productivity', amount: 14.99, status: 'Completed (Stripe)' },
      ]
    };
  });

  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState('store'); // 'store' | 'library' | 'seller'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Genres');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // Secret Admin Lock State (Unlocked strictly via search bar password 'URBAN ROOT AUDIOBOOKS')
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  const handleSearchChange = (query) => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.includes('urban root audiobooks') || trimmed === 'urban root audiobooks') {
      setIsAdminUnlocked(true);
      setActiveTab('seller');
      setSearchQuery('');
      showToast('🔓 Admin Portal Unlocked! Welcome Back.', 'success');
      return;
    }
    setSearchQuery(query);
  };

  // Stripe Mode Toggle State
  const [stripeConfig, setStripeConfig] = useState({
    publishableKey: localStorage.getItem('audioverse_stripe_pk') || '',
    secretKey: localStorage.getItem('audioverse_stripe_sk') || '',
    useSimulatedStripe: true,
  });

  // Toast Notification System
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 4000);
  };

  // Persistent Storage Sync with Quota Safety
  useEffect(() => {
    try {
      localStorage.setItem('audioverse_catalog', JSON.stringify(audiobooks));
    } catch (err) {
      console.warn('localStorage quota notice:', err);
      try {
        const lightCatalog = audiobooks.map((b) => {
          if (b.sampleAudioUrl && b.sampleAudioUrl.length > 1000) {
            return { ...b, sampleAudioUrl: '' };
          }
          return b;
        });
        localStorage.setItem('audioverse_catalog', JSON.stringify(lightCatalog));
      } catch (_) {}
    }
  }, [audiobooks]);

  useEffect(() => {
    localStorage.setItem('audioverse_library', JSON.stringify(myLibrary));
  }, [myLibrary]);

  useEffect(() => {
    localStorage.setItem('audioverse_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('audioverse_seller_stats', JSON.stringify(sellerStats));
  }, [sellerStats]);

  // Audio Player State
  const [playerState, setPlayerState] = useState({
    book: null,
    isSample: true,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    sampleStartTime: 0,
    sampleEndTime: 0,
    playbackSpeed: 1.0,
    volume: 0.8,
    activeChapterIndex: 0,
  });

  // Ref to track latest preview boundaries without causing useEffect re-attaches
  const sampleBoundariesRef = useRef({ isSample: true, startTime: 0, endTime: 0 });

  // Global Audio HTML Element ref handler
  const [audioElement] = useState(new Audio());

  useEffect(() => {
    audioElement.volume = playerState.volume;
    audioElement.playbackRate = playerState.playbackSpeed;

    const handleTimeUpdate = () => {
      const current = audioElement.currentTime;
      const { isSample, startTime, endTime } = sampleBoundariesRef.current;

      // 30-Second Sample Limit Check
      if (isSample && endTime > 0 && current >= endTime) {
        audioElement.pause();
        try {
          audioElement.currentTime = startTime || 0;
        } catch (_) {}
        setPlayerState((prev) => ({
          ...prev,
          isPlaying: false,
          currentTime: startTime || 0,
        }));
        showToast('⏱️ 30-second sample preview complete! Buy full audiobook for uninterrupted listening.', 'info');
        return;
      }

      setPlayerState((prev) => ({
        ...prev,
        currentTime: current,
        duration: audioElement.duration || 0,
      }));
    };

    const handleEnded = () => {
      setPlayerState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
    };

    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('ended', handleEnded);

    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [audioElement]);

  // Player Controls
  const playTrack = async (book, isSample = true) => {
    let audioUrl = isSample ? book.sampleAudioUrl : (book.fullAudioUrl || book.sampleAudioUrl);
    
    // Check if book has a custom audio stored in memory cache or IndexedDB
    try {
      const stored = await getAudioFile(book.id);
      if (stored) {
        if (typeof stored === 'string' && stored.length > 0) {
          audioUrl = stored;
        } else if (stored instanceof Blob || stored instanceof File) {
          audioUrl = URL.createObjectURL(stored);
        }
      } else if (audioUrl && audioUrl.startsWith('blob:')) {
        // Stale or cross-domain blob URL from another session - reset
        audioUrl = '';
      }
    } catch (e) {
      console.warn('Audio retrieve notice:', e);
      if (audioUrl && audioUrl.startsWith('blob:')) audioUrl = '';
    }

    if (!audioUrl || audioUrl.trim() === '') {
      showToast(`ℹ️ No audio file attached for "${book.title}". Please unlock Admin Portal & upload an MP3 file!`, 'info');
      return;
    }

    if (playerState.book?.id === book.id && playerState.isSample === isSample) {
      // Toggle play/pause or replay sample if finished
      if (playerState.isPlaying) {
        audioElement.pause();
        setPlayerState((prev) => ({ ...prev, isPlaying: false }));
      } else {
        const { startTime, endTime } = sampleBoundariesRef.current;
        if (isSample && endTime > 0 && audioElement.currentTime >= endTime - 0.5) {
          try {
            audioElement.currentTime = startTime || 0;
          } catch (_) {}
        }
        audioElement.play().catch(console.error);
        setPlayerState((prev) => ({ ...prev, isPlaying: true }));
      }
      return;
    }

    // Load and play audio track immediately
    audioElement.src = audioUrl;
    audioElement.load();

    const computeAndStart = () => {
      let startTime = 0;
      let endTime = 30;

      const dur = audioElement.duration;
      if (isSample) {
        if (dur && !isNaN(dur) && dur > 5) {
          if (dur > 35) {
            const maxStart = Math.max(0, Math.floor(dur) - 32);
            startTime = maxStart > 5 ? Math.floor(Math.random() * maxStart) : 0;
            endTime = startTime + 30;
          } else {
            startTime = 0;
            endTime = Math.min(30, Math.floor(dur));
          }
        } else {
          startTime = 0;
          endTime = 30;
        }
      } else {
        startTime = 0;
        endTime = 0;
      }

      sampleBoundariesRef.current = { isSample, startTime, endTime };

      try {
        if (startTime > 0) {
          audioElement.currentTime = startTime;
        }
      } catch (_) {}

      audioElement.play().then(() => {
        setPlayerState({
          book,
          isSample,
          isPlaying: true,
          currentTime: startTime,
          sampleStartTime: startTime,
          sampleEndTime: isSample ? endTime : 0,
          duration: audioElement.duration || 0,
          playbackSpeed: playerState.playbackSpeed,
          volume: playerState.volume,
          activeChapterIndex: 0,
        });

        showToast(
          isSample
            ? `🎵 Playing 30-second sample for "${book.title}"`
            : `▶ Playing full audiobook: "${book.title}"`,
          'music'
        );
      }).catch((err) => {
        console.warn('Audio playback notice:', err);
        showToast(`ℹ️ Unable to play audio for "${book.title}". Please re-upload MP3 file in Admin Portal.`, 'info');
      });
    };

    if (audioElement.readyState >= 1) {
      computeAndStart();
    } else {
      audioElement.onloadedmetadata = computeAndStart;
      audioElement.play().then(computeAndStart).catch(computeAndStart);
    }
  };

  const togglePlayPause = () => {
    if (!playerState.book) return;

    if (playerState.isPlaying) {
      audioElement.pause();
      setPlayerState((prev) => ({ ...prev, isPlaying: false }));
    } else {
      audioElement.play().catch(console.error);
      setPlayerState((prev) => ({ ...prev, isPlaying: true }));
    }
  };

  const seekTo = (seconds) => {
    audioElement.currentTime = seconds;
    setPlayerState((prev) => ({ ...prev, currentTime: seconds }));
  };

  const changeVolume = (newVolume) => {
    audioElement.volume = newVolume;
    setPlayerState((prev) => ({ ...prev, volume: newVolume }));
  };

  const changePlaybackSpeed = (newSpeed) => {
    audioElement.playbackRate = newSpeed;
    setPlayerState((prev) => ({ ...prev, playbackSpeed: newSpeed }));
  };

  const skipSeconds = (amount) => {
    const newTime = Math.max(0, Math.min(audioElement.duration || 0, audioElement.currentTime + amount));
    seekTo(newTime);
  };

  // Cart Functions
  const addToCart = (book) => {
    const isAlreadyOwned = myLibrary.some((item) => item.id === book.id);
    if (isAlreadyOwned) {
      showToast(`"${book.title}" is already in your Library!`, 'info');
      setActiveTab('library');
      return;
    }

    if (cart.some((item) => item.id === book.id)) {
      showToast(`"${book.title}" is already in your Cart!`, 'info');
      setIsCartOpen(true);
      return;
    }

    setCart((prev) => [...prev, book]);
    showToast(`Added "${book.title}" to Cart`, 'success');
    setIsCartOpen(true);
  };

  const removeFromCart = (bookId) => {
    setCart((prev) => prev.filter((item) => item.id !== bookId));
    showToast('Removed item from cart', 'info');
  };

  const clearCart = () => setCart([]);

  // Fulfillment on Successful Stripe Checkout
  const fulfillOrder = (purchasedItems) => {
    // Add to user library
    setMyLibrary((prev) => {
      const existingIds = new Set(prev.map((b) => b.id));
      const newItems = purchasedItems.filter((b) => !existingIds.has(b.id));
      return [...prev, ...newItems];
    });

    // Calculate revenue & add transaction log for seller
    const orderTotal = purchasedItems.reduce((acc, b) => acc + b.price, 0);
    const newTransactions = purchasedItems.map((item) => ({
      id: `tx-stripe-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString().split('T')[0],
      itemTitle: item.title,
      amount: item.price,
      status: 'Paid via Stripe Checkout',
    }));

    setSellerStats((prev) => ({
      totalRevenue: Math.round((prev.totalRevenue + orderTotal) * 100) / 100,
      totalSalesCount: prev.totalSalesCount + purchasedItems.length,
      transactions: [...newTransactions, ...prev.transactions],
    }));

    clearCart();
    setIsCartOpen(false);
    setIsCheckoutModalOpen(false);
    showToast('🎉 Payment Successful! Audiobooks added to your Library.', 'success');
    setActiveTab('library');
  };

  // Seller Dashboard Catalog Addition (Local State + Cloud Firestore Sync)
  const addAudiobookToCatalog = async (newBookData) => {
    const newBook = {
      ...newBookData,
      id: `ab-custom-${Date.now()}`,
      rating: 5.0,
      ratingCount: 1,
      bestseller: false,
      featured: false,
      chapters: [
        { id: 1, title: 'Chapter 1: Introduction', duration: '30:00' },
        { id: 2, title: 'Chapter 2: Main Story', duration: '45:00' },
      ],
    };

    setAudiobooks((prev) => [newBook, ...prev]);
    showToast(`Published "${newBook.title}" to store catalog!`, 'success');

    try {
      await setDoc(doc(db, 'audiobooks', newBook.id), newBook);
      console.log('Synced new audiobook to Firestore:', newBook.id);
    } catch (err) {
      console.warn('Firestore write notice:', err);
    }
  };

  const updateAudiobookInCatalog = async (id, updatedFields) => {
    setAudiobooks((prev) =>
      prev.map((book) => (book.id === id ? { ...book, ...updatedFields } : book))
    );
    showToast('Audiobook updated successfully!', 'success');

    try {
      await setDoc(doc(db, 'audiobooks', id), updatedFields, { merge: true });
    } catch (err) {
      console.warn('Firestore update notice:', err);
    }
  };

  const deleteAudiobookFromCatalog = async (id) => {
    setAudiobooks((prev) => prev.filter((book) => book.id !== id));
    showToast('Audiobook removed from catalog.', 'info');

    try {
      await deleteDoc(doc(db, 'audiobooks', id));
    } catch (err) {
      console.warn('Firestore delete notice:', err);
    }
  };

  const updateStripeKeys = (pk, sk) => {
    localStorage.setItem('audioverse_stripe_pk', pk);
    localStorage.setItem('audioverse_stripe_sk', sk);
    setStripeConfig({
      publishableKey: pk,
      secretKey: sk,
      useSimulatedStripe: !pk || !sk,
    });
    showToast('Stripe API Key configuration updated.', 'success');
  };

  return (
    <StoreContext.Provider
      value={{
        audiobooks,
        myLibrary,
        cart,
        sellerStats,
        activeTab,
        setActiveTab,
        searchQuery,
        setSearchQuery: handleSearchChange,
        isAdminUnlocked,
        setIsAdminUnlocked,
        selectedCategory,
        setSelectedCategory,
        isCartOpen,
        setIsCartOpen,
        isCheckoutModalOpen,
        setIsCheckoutModalOpen,
        playerState,
        playTrack,
        togglePlayPause,
        seekTo,
        changeVolume,
        changePlaybackSpeed,
        skipSeconds,
        addToCart,
        removeFromCart,
        clearCart,
        fulfillOrder,
        addAudiobookToCatalog,
        updateAudiobookInCatalog,
        deleteAudiobookFromCatalog,
        stripeConfig,
        updateStripeKeys,
        toast,
        showToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
