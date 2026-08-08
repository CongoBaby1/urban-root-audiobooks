import React, { useState, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { parseAudioFileMetadata, extract30SecAudioSampleWav } from '../utils/audioMetadataParser';
import { saveAudioFile } from '../utils/audioStorage';
import { CATEGORIES } from '../data/initialAudiobooks';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  PlusCircle,
  Key,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Layers,
  ArrowUpRight,
  UploadCloud,
  FileAudio,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Eye,
  Trash2,
  Edit,
  X,
  Play,
  HelpCircle,
  Star,
  Award
} from 'lucide-react';

export const SellerDashboard = () => {
  const {
    sellerStats,
    addAudiobookToCatalog,
    updateAudiobookInCatalog,
    deleteAudiobookFromCatalog,
    stripeConfig,
    updateStripeKeys,
    audiobooks,
    showToast,
    playTrack,
  } = useStore();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'catalog' | 'publish' | 'stripe'

  // Publish Form State
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [narrator, setNarrator] = useState('');
  const [category, setCategory] = useState('Action Thriller');
  const [price, setPrice] = useState('19.99');
  const [duration, setDuration] = useState('8 hrs 30 mins');
  const [coverUrl, setCoverUrl] = useState('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80');
  const [sampleAudioUrl, setSampleAudioUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestseller, setIsBestseller] = useState(true);

  // Audio Upload & Drag Drop State
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [coverSource, setCoverSource] = useState('default');
  const fileInputRef = useRef(null);
  const sampleAudioInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Edit Modal State
  const [editingBook, setEditingBook] = useState(null);

  // Stripe Key Setup Form State
  const [pubKeyInput, setPubKeyInput] = useState(stripeConfig.publishableKey);
  const [secretKeyInput, setSecretKeyInput] = useState(stripeConfig.secretKey);

  const [uploadedAudioFile, setUploadedAudioFile] = useState(null);

  // Handle Audio File Extraction (MP3/M4B)
  const processAudioFile = async (file) => {
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['mp3', 'm4b', 'wav', 'm4a', 'aac'].includes(ext)) {
      showToast('Please upload an MP3 or M4B audio file', 'error');
      return;
    }

    setIsParsing(true);
    setUploadedFileName(file.name);
    setUploadedAudioFile(file);

    try {
      const meta = await parseAudioFileMetadata(file);

      if (meta.title) setTitle(meta.title);
      if (meta.author) setAuthor(meta.author);
      if (meta.narrator) setNarrator(meta.narrator);
      if (meta.durationFormatted) setDuration(meta.durationFormatted);

      if (meta.coverUrl) {
        setCoverUrl(meta.coverUrl);
        setCoverSource('extracted');
      }

      // Set direct live audio stream URL from intact uploaded file
      const liveAudioUrl = meta.audioObjectUrl || URL.createObjectURL(file);
      setSampleAudioUrl(liveAudioUrl);

      // Extract high-fidelity uncorrupted 30-second WAV Audio Sample Data URL
      try {
        const persistentWavDataUrl = await extract30SecAudioSampleWav(file);
        if (persistentWavDataUrl) {
          setSampleAudioUrl(persistentWavDataUrl);
        }
      } catch (e) {
        console.warn('Persistent sample extraction notice:', e);
      }

      showToast(`✨ Audio parsed! Title: "${meta.title || file.name}", Duration: ${meta.durationFormatted || 'Set'}`, 'success');
    } catch (err) {
      console.error('Audio extraction error:', err);
      showToast('Audio file loaded.', 'info');
    } finally {
      setIsParsing(false);
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const ext = droppedFile.name.split('.').pop().toLowerCase();
      
      if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setCoverUrl(event.target.result);
          setCoverSource('uploaded');
          showToast('🖼️ Custom cover image updated!', 'success');
        };
        reader.readAsDataURL(droppedFile);
      } else {
        processAudioFile(droppedFile);
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      processAudioFile(e.target.files[0]);
    }
  };

  // Custom Sample Audio File Upload Handler
  const handleSampleAudioFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const audioFile = e.target.files[0];
      const audioUrl = URL.createObjectURL(audioFile);
      setSampleAudioUrl(audioUrl);
      showToast(`🎵 Custom sample audio file attached: ${audioFile.name}`, 'success');
    }
  };

  // Custom Image Upload Handler
  const handleImageFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const imageFile = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setCoverUrl(event.target.result);
        setCoverSource('uploaded');
        showToast('🖼️ Custom cover artwork uploaded & updated!', 'success');
      };
      reader.readAsDataURL(imageFile);
    }
  };

  // Set single book as Featured Hero Banner
  const handleMakeFeaturedHero = (bookId) => {
    audiobooks.forEach((b) => {
      updateAudiobookInCatalog(b.id, { featured: b.id === bookId });
    });
    const target = audiobooks.find((b) => b.id === bookId);
    showToast(`🌟 "${target?.title || 'Book'}" is now the Featured Bestseller Hero Banner!`, 'success');
  };

  // Toggle Bestseller status
  const handleToggleBestseller = (book) => {
    updateAudiobookInCatalog(book.id, { bestseller: !book.bestseller });
    showToast(`Bestseller ribbon ${!book.bestseller ? 'added to' : 'removed from'} "${book.title}"`, 'info');
  };

  const handlePublishSubmit = async (e) => {
    e.preventDefault();
    if (!title || !author || !price) {
      showToast('Please fill out Title, Author, and Price', 'error');
      return;
    }

    // If set as featured, clear existing featured flags
    if (isFeatured) {
      audiobooks.forEach((b) => updateAudiobookInCatalog(b.id, { featured: false }));
    }

    const newBookId = 'ab-' + Date.now();

    // Save full intact binary audio file to IndexedDB & memory cache
    if (uploadedAudioFile) {
      await saveAudioFile(newBookId, uploadedAudioFile);
    }

    const liveAudioLink = sampleAudioUrl || (uploadedAudioFile ? URL.createObjectURL(uploadedAudioFile) : '');

    addAudiobookToCatalog({
      id: newBookId,
      title,
      author,
      narrator: narrator || author,
      category,
      price: parseFloat(price),
      duration: duration || '6 hrs 00 mins',
      bestseller: isBestseller,
      featured: isFeatured,
      coverUrl: coverUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      sampleAudioUrl: liveAudioLink,
      description: description || 'New digital audiobook released on Urban Root Audiobooks marketplace.',
    });

    showToast(`🎉 "${title}" published to marketplace!`, 'success');

    // Reset Form
    setTitle('');
    setAuthor('');
    setNarrator('');
    setDescription('');
    setUploadedFileName('');
    setUploadedAudioFile(null);
    setCoverSource('default');
    setIsFeatured(false);
    setIsBestseller(true);
    setActiveTab('catalog');
  };

  const handleSaveEditSubmit = (e) => {
    e.preventDefault();
    if (!editingBook) return;

    if (editingBook.featured) {
      audiobooks.forEach((b) => {
        if (b.id !== editingBook.id) updateAudiobookInCatalog(b.id, { featured: false });
      });
    }

    updateAudiobookInCatalog(editingBook.id, editingBook);
    setEditingBook(null);
  };

  const handleSaveStripeKeys = (e) => {
    e.preventDefault();
    updateStripeKeys(pubKeyInput.trim(), secretKeyInput.trim());
  };

  // Filter Categories dropdown options (excluding 'All Genres')
  const formCategories = CATEGORIES.filter((c) => c !== 'All Genres');

  return (
    <section className="space-y-8 animate-fadeIn">
      
      {/* Header Studio Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Author & Creator Studio</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            Urban Root Admin Portal
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Set the Featured Bestseller of the Week hero banner, manage catalog titles, edit prices, or delete books.
          </p>
        </div>

        {/* Studio Sub-Tabs */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
              activeTab === 'catalog'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Manage Catalog ({audiobooks.length})
          </button>

          <button
            onClick={() => setActiveTab('publish')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'publish'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            + Publish Title
          </button>

          <button
            onClick={() => setActiveTab('stripe')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'stripe'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Stripe API
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <DollarSign className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Revenue</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  ${(Number(sellerStats.totalRevenue) || 0).toFixed(2)}
                </h3>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed Purchases</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {sellerStats.totalSalesCount} Orders
                </h3>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <BookOpen className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Published Titles</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {audiobooks.length} Books
                </h3>
              </div>
            </div>
          </div>

          {/* Recent Sales Ledger Table */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              Recent Stripe Sales Transactions
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Audiobook Title</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sellerStats.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-mono text-amber-400">{tx.id}</td>
                      <td className="py-3.5 px-4">{tx.date}</td>
                      <td className="py-3.5 px-4 font-bold text-white">{tx.itemTitle}</td>
                      <td className="py-3.5 px-4 font-extrabold text-emerald-400">${(Number(tx.amount) || 0).toFixed(2)}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full badge-emerald text-[11px] font-bold">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* MANAGE CATALOG TAB (EDIT, HERO BANNER, BESTSELLER & DELETE AUDIOBOOKS) */}
      {activeTab === 'catalog' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                Manage Store Catalog & Featured Items ({audiobooks.length})
              </h3>
              <p className="text-xs text-slate-400">Set the top Featured Bestseller Hero Banner, toggle Bestseller badges, edit info, or delete titles.</p>
            </div>
            <button
              onClick={() => setActiveTab('publish')}
              className="btn-amber px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" /> Publish New Audiobook
            </button>
          </div>

          <div className="grid grid-cols-1 divide-y divide-slate-800/80">
            {audiobooks.map((book) => (
              <div key={book.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 p-3 rounded-2xl transition-colors">
                
                {/* Book Info */}
                <div className="flex items-center gap-4">
                  {/* Cover Image preview without cutoff */}
                  <div className="w-16 h-20 bg-slate-950 rounded-xl overflow-hidden border border-amber-500/40 flex-shrink-0 flex items-center justify-center">
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-contain p-0.5"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-extrabold text-white">{book.title}</h4>
                      {book.featured && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded badge-amber flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" /> Hero Banner
                        </span>
                      )}
                      {book.bestseller && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded badge-emerald flex items-center gap-1">
                          <Award className="w-3 h-3" /> Bestseller
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-0.5">
                      Author: <span className="text-slate-200 font-semibold">{book.author}</span> • Narrator: <span className="text-slate-200 font-semibold">{book.narrator}</span>
                    </p>

                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-amber-400 border border-slate-700">
                        {book.category}
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        ${(Number(book.price) || 0).toFixed(2)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        • {book.duration}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                  
                  {/* Toggle Hero Banner */}
                  <button
                    onClick={() => handleMakeFeaturedHero(book.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all ${
                      book.featured
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                    title="Set as top Hero Banner on homepage"
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {book.featured ? 'Hero Banner Active' : 'Set Hero Banner'}
                  </button>

                  {/* Toggle Bestseller Badge */}
                  <button
                    onClick={() => handleToggleBestseller(book)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all ${
                      book.bestseller
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    {book.bestseller ? 'Bestseller' : '+ Bestseller'}
                  </button>

                  <button
                    onClick={() => playTrack(book, true)}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
                    title="Test Sample Play"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>

                  <label
                    className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-pointer flex items-center gap-1.5 text-xs font-bold transition-colors"
                    title="Attach MP3 Audio File"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload MP3</span>
                    <input
                      type="file"
                      accept="audio/*,.mp3,.m4b"
                      className="hidden"
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          showToast(`⏳ Extracting 30-sec audio sample from "${file.name}"...`, 'info');
                          const meta = await parseAudioFileMetadata(file);
                          const persistentWavDataUrl = await extract30SecAudioSampleWav(file);
                          if (persistentWavDataUrl) {
                            // Save the full MP3 for library playback
                            await saveAudioFile(book.id, file);
                            // Save the 30-sec WAV preview separately so it survives page reloads
                            await saveAudioFile(book.id + '_sample', persistentWavDataUrl);
                            updateAudiobookInCatalog(book.id, {
                              sampleAudioUrl: persistentWavDataUrl,
                              duration: meta.durationFormatted || book.duration,
                            });
                            showToast(`✨ Attached 30-sec preview sample to "${book.title}"!`, 'success');
                          } else {
                            showToast(`Unable to parse 30-sec sample from "${file.name}"`, 'error');
                          }
                        }
                      }}
                    />
                  </label>

                  <button
                    onClick={() => setEditingBook({ ...book })}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete "${book.title}" from the marketplace?`)) {
                        deleteAudiobookFromCatalog(book.id);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT AUDIOBOOK MODAL */}
      {editingBook && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-400" />
                Edit Audiobook Details
              </h3>
              <button
                onClick={() => setEditingBook(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmit} className="space-y-4">
              
              {/* Featured & Bestseller Checkboxes */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-200">
                  <input
                    type="checkbox"
                    checked={editingBook.featured || false}
                    onChange={(e) => setEditingBook({ ...editingBook, featured: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span>🌟 Set as Featured Bestseller of the Week (Hero Banner)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-200">
                  <input
                    type="checkbox"
                    checked={editingBook.bestseller || false}
                    onChange={(e) => setEditingBook({ ...editingBook, bestseller: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                  <span>🏆 Mark as Trending Bestseller Badge</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Book Title</label>
                  <input
                    type="text"
                    required
                    value={editingBook.title}
                    onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-sm glass-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Author Name</label>
                  <input
                    type="text"
                    required
                    value={editingBook.author}
                    onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-sm glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Narrator</label>
                  <input
                    type="text"
                    value={editingBook.narrator}
                    onChange={(e) => setEditingBook({ ...editingBook, narrator: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-sm glass-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={editingBook.category}
                    onChange={(e) => setEditingBook({ ...editingBook, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-sm glass-input bg-slate-900"
                  >
                    {formCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Price ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingBook.price}
                    onChange={(e) => setEditingBook({ ...editingBook, price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl text-sm glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Duration</label>
                  <input
                    type="text"
                    value={editingBook.duration}
                    onChange={(e) => setEditingBook({ ...editingBook, duration: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-sm glass-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cover Image URL</label>
                  <input
                    type="text"
                    value={editingBook.coverUrl}
                    onChange={(e) => setEditingBook({ ...editingBook, coverUrl: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-sm glass-input font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">Sample Audio Stream Source</label>
                  <label className="text-[11px] text-amber-400 hover:underline font-bold cursor-pointer flex items-center gap-1">
                    <UploadCloud className="w-3.5 h-3.5" /> Attach Audio File (.MP3/.M4B)
                    <input
                      type="file"
                      accept="audio/*,.mp3,.m4b"
                      className="hidden"
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          showToast(`⏳ Extracting 30-sec audio sample...`, 'info');
                          const meta = await parseAudioFileMetadata(file);
                          const persistentWavDataUrl = await extract30SecAudioSampleWav(file);
                          if (persistentWavDataUrl) {
                            await saveAudioFile(editingBook.id, file);
                            setEditingBook({
                              ...editingBook,
                              sampleAudioUrl: persistentWavDataUrl,
                              duration: meta.durationFormatted || editingBook.duration,
                            });
                            showToast(`🎵 Attached 30-sec audio sample: ${file.name}`, 'success');
                          }
                        }
                      }}
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={editingBook.sampleAudioUrl || ''}
                  onChange={(e) => setEditingBook({ ...editingBook, sampleAudioUrl: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl text-xs glass-input font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Book Description</label>
                <textarea
                  rows="3"
                  value={editingBook.description}
                  onChange={(e) => setEditingBook({ ...editingBook, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl text-sm glass-input"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl btn-amber font-bold text-sm shadow-md"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="px-5 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PUBLISH AUDIOBOOK TAB */}
      {activeTab === 'publish' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <PlusCircle className="w-6 h-6 text-amber-400" />
            <div>
              <h3 className="text-xl font-extrabold text-white">Publish New Audiobook</h3>
              <p className="text-xs text-slate-400">Drag & drop your MP3/M4B file to auto-extract title, author, duration & cover artwork.</p>
            </div>
          </div>

          <form onSubmit={handlePublishSubmit} className="space-y-6">
            
            {/* 1. DUAL AUDIO UPLOAD ZONE (Drag & Drop + File Picker) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                Upload Audiobook File (.MP3 / .M4B) *
              </label>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  isDragging
                    ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                    : 'border-slate-700 hover:border-amber-500/50 bg-slate-900/60 hover:bg-slate-900'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".mp3,.m4b,audio/*"
                  className="hidden"
                />

                {isParsing ? (
                  <div className="flex flex-col items-center justify-center space-y-3 py-4">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                    <p className="text-sm font-bold text-amber-400">
                      Parsing ID3 Tags, Audio Duration & Cover Art...
                    </p>
                    <p className="text-xs text-slate-400">Extracting embedded title, author, narrator, and picture.</p>
                  </div>
                ) : uploadedFileName ? (
                  <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                        <FileAudio className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{uploadedFileName}</p>
                        <p className="text-xs text-amber-400 font-semibold">
                          Duration Extracted: {duration || 'Calculating...'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Change File
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 py-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-white">
                        Drag & Drop your MP3 or M4B file here
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        or click to browse your computer (Auto-fills title, author, duration & cover art)
                      </p>
                    </div>
                    <span className="inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md badge-amber">
                      Supports MP3 & M4B Chapters
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. VISUAL COVER IMAGE VERIFICATION BOX (No Cutoff) */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-400" />
                  Cover Image Verification Preview
                </label>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  coverSource === 'extracted' ? 'badge-gold' : coverSource === 'uploaded' ? 'badge-emerald' : 'badge-neutral'
                }`}>
                  {coverSource === 'extracted' ? '✓ Extracted from Audio' : coverSource === 'uploaded' ? '✓ Custom Upload' : 'Default Preset'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {/* Visual Cover Thumbnail - Uses object-contain so cover image is NEVER cut off */}
                <div className="w-36 h-48 bg-slate-900 rounded-2xl border-2 border-amber-500/40 shadow-xl overflow-hidden flex items-center justify-center flex-shrink-0 p-1">
                  <img
                    src={coverUrl}
                    alt="Audiobook Cover Preview"
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>

                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Verify that your full cover artwork renders cleanly without any parts being cut off.
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="px-3 py-2 text-xs font-bold rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 flex items-center gap-1.5 shadow-md"
                    >
                      <ImageIcon className="w-3.5 h-3.5" /> Upload Custom Cover Image
                    </button>
                    <input
                      type="file"
                      ref={imageInputRef}
                      onChange={handleImageFileSelect}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Cover Image URL (Direct Link)</label>
                    <input
                      type="url"
                      value={coverUrl}
                      onChange={(e) => {
                        setCoverUrl(e.target.value);
                        setCoverSource('uploaded');
                      }}
                      className="w-full px-3 py-1.5 rounded-lg text-xs glass-input font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. FEATURED HERO & BESTSELLER SELECTION */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                Featured Placement & Store Ribbons
              </label>
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-400">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span>🌟 Set as Featured Bestseller of the Week (Top Hero Banner)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-400">
                  <input
                    type="checkbox"
                    checked={isBestseller}
                    onChange={(e) => setIsBestseller(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                  <span>🏆 Mark as Trending Bestseller Badge</span>
                </label>
              </div>
            </div>

            {/* 4. AUTO-FILLED METADATA FORM FIELDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Beyond the Cosmos"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Author Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arthur Pendelton"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm glass-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Narrator</label>
                <input
                  type="text"
                  placeholder="e.g. Morgan Freeman"
                  value={narrator}
                  onChange={(e) => setNarrator(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category Dropdown *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm glass-input bg-slate-900 text-amber-400 font-semibold"
                >
                  {formCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Price ($ USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm glass-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Duration (Auto-calculated)</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm glass-input"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">Sample Audio Player Source</label>
                  <button
                    type="button"
                    onClick={() => sampleAudioInputRef.current?.click()}
                    className="text-[11px] text-amber-400 hover:underline font-bold flex items-center gap-1"
                  >
                    <UploadCloud className="w-3 h-3" /> Select Audio File
                  </button>
                  <input
                    type="file"
                    ref={sampleAudioInputRef}
                    onChange={handleSampleAudioFileSelect}
                    accept="audio/*,.mp3,.m4b"
                    className="hidden"
                  />
                </div>
                <input
                  type="text"
                  value={sampleAudioUrl}
                  onChange={(e) => setSampleAudioUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-xs glass-input font-mono"
                />
              </div>
            </div>

            {/* Explanation box on sample audio source */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p>
                <strong className="text-slate-200">Where Sample Audio Comes From:</strong> When you drop or select your audio file above, your exact uploaded audio file becomes the sample player stream! Customers on your store can click "Listen Free Sample" on the storefront to listen to your audio directly in the audio player.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Book Description</label>
              <textarea
                rows="3"
                placeholder="Brief summary of the audiobook..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm glass-input"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl btn-amber font-extrabold text-sm shadow-lg"
            >
              🚀 Publish Audiobook to Marketplace Catalog
            </button>
          </form>
        </div>
      )}

      {/* STRIPE SETTINGS TAB */}
      {activeTab === 'stripe' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <Key className="w-6 h-6 text-amber-400" />
            <div>
              <h3 className="text-xl font-extrabold text-white">Stripe Account API Setup</h3>
              <p className="text-xs text-slate-400">Configure your Stripe keys for live payment processing.</p>
            </div>
          </div>

          <form onSubmit={handleSaveStripeKeys} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Stripe Publishable Key (`VITE_STRIPE_PUBLISHABLE_KEY`)
              </label>
              <input
                type="text"
                placeholder="pk_test_..."
                value={pubKeyInput}
                onChange={(e) => setPubKeyInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm glass-input font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Stripe Secret Key (`STRIPE_SECRET_KEY`)
              </label>
              <input
                type="password"
                placeholder="sk_test_..."
                value={secretKeyInput}
                onChange={(e) => setSecretKeyInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm glass-input font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl btn-amber font-bold text-sm shadow-md"
            >
              Save Stripe Credentials
            </button>
          </form>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Built-in Stripe Simulation Active</span>
            </div>
            <p>
              If no live API key is set, Urban Root Audiobooks operates in test mode so you and your customers can test full purchases, library fulfillment, and author sales analytics.
            </p>
          </div>
        </div>
      )}

    </section>
  );
};
