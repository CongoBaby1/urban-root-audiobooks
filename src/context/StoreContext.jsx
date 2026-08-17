import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { INITIAL_AUDIOBOOKS } from '../data/initialAudiobooks';
import { getAudioFile } from '../utils/audioStorage';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

const StoreContext = createContext();

// Compress a cover image to a small JPEG for Firestore storage (~20KB).
// Mobile devices load this compressed version from Firestore directly.
// Desktop keeps the full-quality version from localStorage/IndexedDB.
const compressCoverForFirestore = (dataUrl) =>
  new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) { resolve(null); return; }
    const img = new Image();
    img.onload = () => {
      const MAX = 350;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });

// IDs of the old placeholder demo books — purge them everywhere on load
const PLACEHOLDER_IDS = new Set(['ab-1', 'ab-2', 'ab-3', 'ab-4', 'ab-5', 'ab-6']);

const sanitizeBook = (book) => {
  if (!book || typeof book !== 'object') return null;
  if (!book.title || String(book.title).trim() === '') return null;
  return {
    ...book,
    title: String(book.title).trim(),
    author: (book.author && String(book.author).trim()) || 'Unknown Author',
    narrator: (book.narrator && String(book.narrator).trim()) || (book.author && String(book.author).trim()) || 'Unknown Narrator',
    coverUrl: (book.coverUrl && String(book.coverUrl).trim()) || '',
    description: (book.description && String(book.description).trim()) || '',
    price: Number(book.price) || 19.99,
    category: (book.category && String(book.category).trim()) || 'General',
    rating: Number(book.rating) || 4.8,
    duration: (book.duration && String(book.duration).trim()) || '8 hrs 30 mins',
  };
};

export const StoreProvider = ({ children }) => {
  // Catalog State (Firestore Sync + LocalStorage Fallback)
  const [audiobooks, setAudiobooks] = useState(() => {
    try {
      const saved = localStorage.getItem('audioverse_catalog');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out old placeholder demo books and sanitize
        return parsed
          .filter((b) => b && b.id && !PLACEHOLDER_IDS.has(b.id))
          .map(sanitizeBook)
          .filter(Boolean);
      }
      return [];
    } catch (e) {
      console.warn('LocalStorage parse error - resetting catalog:', e);
      try { localStorage.removeItem('audioverse_catalog'); } catch (_) {}
      return [];
    }
  });

  // Permanently deleted book IDs — persisted across refreshes so a Firestore
  // snapshot can never resurrect a book the admin intentionally deleted.
  const deletedBookIdsRef = useRef(null);
  if (deletedBookIdsRef.current === null) {
    try {
      const saved = localStorage.getItem('audioverse_deleted_ids');
      deletedBookIdsRef.current = new Set(JSON.parse(saved || '[]'));
    } catch { deletedBookIdsRef.current = new Set(); }
  }
  const deletedBookIds = deletedBookIdsRef.current;

  // One-time migration: delete old placeholder demo books from Firestore
  useEffect(() => {
    const migrationKey = 'audioverse_placeholder_purge_v1';
    if (localStorage.getItem(migrationKey)) return; // Already done
    PLACEHOLDER_IDS.forEach(async (pid) => {
      try { await deleteDoc(doc(db, 'audiobooks', pid)); } catch (_) {}
    });
    localStorage.setItem(migrationKey, '1');
  }, []);

  // Real-Time Cloud Firestore Sync for Catalog Audiobooks
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(collection(db, 'audiobooks'), (snapshot) => {
        if (!snapshot.empty) {
          const firestoreBooks = snapshot.docs
            .map((d) => sanitizeBook({ id: d.id, ...d.data() }))
            .filter((b) => {
              if (!b || !b.title || b.title.trim() === '' || PLACEHOLDER_IDS.has(b.id)) return false;
              if (deletedBookIds.has(b.id)) {
                // Retry delete in case the first attempt failed (permissions, etc.)
                deleteDoc(doc(db, 'audiobooks', b.id)).catch(() => {});
                return false;
              }
              return true;
            });

          if (firestoreBooks.length > 0) {
            setAudiobooks((prevLocal) => {
              // If no local books exist yet (fresh load / cleared storage),
              // use Firestore as the source of truth.
              if (prevLocal.length === 0) {
                return firestoreBooks;
              }

              // Otherwise: Firestore may only UPDATE books that already exist
              // in local state. It cannot ADD books back that were deleted locally.
              const firestoreMap = new Map(firestoreBooks.map((b) => [b.id, b]));

              return prevLocal
                .filter((b) => !PLACEHOLDER_IDS.has(b.id) && !deletedBookIds.has(b.id))
                .map((localBook) => {
                  const fb = firestoreMap.get(localBook.id);
                  if (!fb) return sanitizeBook(localBook); // local-only book, keep as-is
                   return sanitizeBook({
                    ...fb,
                    coverUrl:
                      (fb.coverUrl && fb.coverUrl.startsWith('https://')) ? fb.coverUrl :
                      (localBook.coverUrl && localBook.coverUrl.startsWith('data:')) ? localBook.coverUrl :
                      fb.coverUrl || localBook.coverUrl || '',
                    sampleAudioUrl: fb.sampleAudioUrl || localBook.sampleAudioUrl || '',
                  });
                })
                .filter(Boolean);
            });
          }
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
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      // Filter out old placeholder books from library too
      return Array.isArray(parsed) ? parsed.filter((b) => b && !PLACEHOLDER_IDS.has(b.id)) : [];
    } catch { return []; }
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

  // Persistent Storage Sync with Quota Safety & Silent Catch
  useEffect(() => {
    try {
      const safeCatalog = audiobooks.map((b) => {
        if (b.sampleAudioUrl && b.sampleAudioUrl.length > 500000) {
          return { ...b, sampleAudioUrl: '' };
        }
        return b;
      });
      localStorage.setItem('audioverse_catalog', JSON.stringify(safeCatalog));
    } catch (err) {
      console.warn('localStorage catalog save notice:', err);
    }
  }, [audiobooks]);

  useEffect(() => {
    try {
      localStorage.setItem('audioverse_library', JSON.stringify(myLibrary));
    } catch (_) {}
  }, [myLibrary]);

  useEffect(() => {
    try {
      localStorage.setItem('audioverse_cart', JSON.stringify(cart));
    } catch (_) {}
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('audioverse_seller_stats', JSON.stringify(sellerStats));
    } catch (_) {}
  }, [sellerStats]);

  // Cover Image Restoration from IndexedDB after refresh
  // Firestore and localStorage both strip base64 cover data — IndexedDB is the only
  // persistent store for locally-extracted covers. Run once per book ID.
  useEffect(() => {
    const restoreCovers = async () => {
      const booksNeedingCover = audiobooks.filter(
        (b) => (!b.coverUrl || b.coverUrl.trim() === '') && !coverRestorationAttemptedRef.current.has(b.id)
      );
      if (booksNeedingCover.length === 0) return;

      // Mark as attempted BEFORE async work so the next render skips these IDs
      booksNeedingCover.forEach((b) => coverRestorationAttemptedRef.current.add(b.id));

      const updates = await Promise.all(
        booksNeedingCover.map(async (b) => {
          try {
            const cover = await getAudioFile(b.id + '_cover');
            if (cover && typeof cover === 'string' && cover.startsWith('data:')) {
              return { id: b.id, coverUrl: cover };
            }
          } catch (_) {}
          return null;
        })
      );

      const validUpdates = updates.filter(Boolean);
      if (validUpdates.length === 0) return;

      setAudiobooks((prev) =>
        prev.map((b) => {
          const update = validUpdates.find((u) => u.id === b.id);
          return update ? { ...b, coverUrl: update.coverUrl } : b;
        })
      );

      // Write recovered covers back to Firestore (compressed) so mobile devices see them.
      for (const { id, coverUrl } of validUpdates) {
        compressCoverForFirestore(coverUrl)
          .then((compressed) => {
            if (compressed) setDoc(doc(db, 'audiobooks', id), { coverUrl: compressed }, { merge: true }).catch(() => {});
          })
          .catch(() => {});
      }
    };

    restoreCovers();
  }, [audiobooks]);

  // Firestore Cover Sync: compress and push local covers to Firestore so any
  // device (mobile, other browsers) can load them without needing this device's IndexedDB.
  useEffect(() => {
    const syncCovers = async () => {
      const toSync = audiobooks.filter(
        (b) =>
          b.coverUrl &&
          b.coverUrl.startsWith('data:image/') &&
          !coverSyncedToFirestoreRef.current.has(b.id)
      );
      if (toSync.length === 0) return;

      // Mark immediately so repeated renders don't re-queue the same books
      toSync.forEach((b) => coverSyncedToFirestoreRef.current.add(b.id));

      for (const b of toSync) {
        try {
          const compressed = await compressCoverForFirestore(b.coverUrl);
          if (compressed) {
            await setDoc(doc(db, 'audiobooks', b.id), { coverUrl: compressed }, { merge: true });
          }
        } catch (_) {}
      }
    };
    syncCovers();
  }, [audiobooks]);

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

  // Ref to track which book IDs have already had a cover restoration attempted
  // (prevents infinite loop: setAudiobooks → useEffect → setAudiobooks → ...)
  const coverRestorationAttemptedRef = useRef(new Set());

  // Ref to track which book IDs have already had their cover pushed to Firestore
  const coverSyncedToFirestoreRef = useRef(new Set());

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
    
    // Check IndexedDB for stored audio — use '_sample' key for previews, 'bookId' for full library playback
    try {
      if (isSample) {
        // Try the dedicated 30-sec WAV preview first
        const storedSample = await getAudioFile(book.id + '_sample');
        if (storedSample && typeof storedSample === 'string' && storedSample.length > 0) {
          audioUrl = storedSample;
        } else if (storedSample instanceof Blob || storedSample instanceof File) {
          audioUrl = URL.createObjectURL(storedSample);
        }
      }

      // If still no sample URL, try the full file as fallback
      if (!audioUrl || audioUrl.trim() === '') {
        const stored = await getAudioFile(book.id);
        if (stored) {
          if (typeof stored === 'string' && stored.length > 0) {
            audioUrl = stored;
          } else if (stored instanceof Blob || stored instanceof File) {
            audioUrl = URL.createObjectURL(stored);
          }
        }
      } else if (audioUrl && audioUrl.startsWith('blob:')) {
        // Stale blob URL from another session - reset
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

  /**
   * Strip large data that would exceed Firestore's 1MB document limit.
   * MP3 cover art (ID3 embedded JPEG) can be 500KB–1.5MB as base64 —
   * if included it silently kills the ENTIRE Firestore write, including sampleAudioUrl.
   * Covers are stored in localStorage for the current session and uploaded to
   * Firebase Storage separately to get a permanent https:// URL.
   */
  const sanitizeForFirestore = (data) => {
    const safe = { ...data };

    // Always strip audio — WAV/MP3 base64 is always several MB
    if (safe.sampleAudioUrl && safe.sampleAudioUrl.startsWith('data:')) delete safe.sampleAudioUrl;
    if (safe.audioObjectUrl) delete safe.audioObjectUrl;
    if (safe.coverUrl && safe.coverUrl.startsWith('blob:')) delete safe.coverUrl;

    // For cover images: keep in Firestore if small enough (<= 500 KB as base64 string).
    // This lets mobile devices load covers directly from Firestore without needing
    // desktop IndexedDB. Strip only if too large to avoid hitting the 1MB doc limit.
    const COVER_FIRESTORE_LIMIT = 500 * 1024; // 500 KB
    if (
      safe.coverUrl &&
      safe.coverUrl.startsWith('data:') &&
      safe.coverUrl.length > COVER_FIRESTORE_LIMIT
    ) {
      delete safe.coverUrl;
    }

    return safe;
  };


  // Seller Dashboard Catalog Addition (Local State + Cloud Firestore Sync)
  const addAudiobookToCatalog = async (newBookData) => {
    // Defaults come FIRST so that newBookData values (id, bestseller, featured, etc.) override them
    const newBook = {
      id: `ab-custom-${Date.now()}`,
      rating: 5.0,
      ratingCount: 1,
      bestseller: true,
      featured: false,
      chapters: [
        { id: 1, title: 'Chapter 1: Introduction', duration: '30:00' },
        { id: 2, title: 'Chapter 2: Main Story', duration: '45:00' },
      ],
      ...newBookData,
    };

    setAudiobooks((prev) => [newBook, ...prev]);

    try {
      await setDoc(doc(db, 'audiobooks', newBook.id), sanitizeForFirestore(newBook));
      console.log('Synced new audiobook to Firestore:', newBook.id);
    } catch (err) {
      console.warn('Firestore write notice:', err);
    }
  };

  const updateAudiobookInCatalog = async (id, updatedFields) => {
    // Capture the full merged book synchronously inside the state updater
    // so we can write a complete document to Firestore (not just partial fields)
    let fullMergedBook = null;
    setAudiobooks((prev) => {
      const next = prev.map((book) => {
        if (book.id === id) {
          fullMergedBook = { ...book, ...updatedFields };
          return fullMergedBook;
        }
        return book;
      });
      return next;
    });
    showToast('Audiobook updated successfully!', 'success');

    try {
      // Write the full book so Firestore always has a complete document
      const docData = fullMergedBook
        ? sanitizeForFirestore(fullMergedBook)
        : sanitizeForFirestore(updatedFields);
      if (Object.keys(docData).length > 0) {
        await setDoc(doc(db, 'audiobooks', id), docData, { merge: true });
      }
    } catch (err) {
      console.warn('Firestore update notice:', err);
    }
  };

  const deleteAudiobookFromCatalog = async (id) => {
    setAudiobooks((prev) => prev.filter((book) => book.id !== id));

    // Record deletion permanently so the Firestore snapshot can't resurrect the book
    deletedBookIds.add(id);
    try { localStorage.setItem('audioverse_deleted_ids', JSON.stringify([...deletedBookIds])); } catch (_) {}

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
