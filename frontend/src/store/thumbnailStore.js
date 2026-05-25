import { create } from 'zustand';
import axios from 'axios';
import { BACKEND_URL } from './appStore';

const API_URL = `${BACKEND_URL}/api`;

export const useThumbnailStore = create((set, get) => ({
  thumbnails: [],
  activeThumbnail: null,
  
  // Loading states
  isLoadingHistory: false,
  isGenerating: false,
  isEditing: false,
  errorMsg: '',
  successMsg: '',

  // Reset notifications
  clearStatus: () => set({ errorMsg: '', successMsg: '' }),

  // Set current selected thumbnail for editing workspace
  setActiveThumbnail: (thumbnail) => {
    set({ activeThumbnail: thumbnail, errorMsg: '', successMsg: '' });
  },

  // Fetch full history of user thumbnails
  fetchThumbnails: async () => {
    set({ isLoadingHistory: true, errorMsg: '' });
    try {
      const res = await axios.get(`${API_URL}/thumbnails/history`);
      set({ thumbnails: res.data });
      
      // If we don't have an active thumbnail, set the most recent one as active
      if (res.data.length > 0 && !get().activeThumbnail) {
        set({ activeThumbnail: res.data[0] });
      }
    } catch (err) {
      console.error('Error fetching thumbnail history:', err);
      set({ errorMsg: err.response?.data?.error || 'Failed to load thumbnail history.' });
    } finally {
      set({ isLoadingHistory: false });
    }
  },

  // Generate baseline thumbnail
  generateThumbnail: async (prompt, style, aspectRatio, resolution = '1080p') => {
    set({ isGenerating: true, errorMsg: '', successMsg: '' });
    try {
      const res = await axios.post(`${API_URL}/thumbnails/generate`, { prompt, style, aspectRatio, resolution });
      const newThumbnail = res.data;
      
      set((state) => ({
        thumbnails: [newThumbnail, ...state.thumbnails],
        activeThumbnail: newThumbnail,
        successMsg: 'Baseline thumbnail generated successfully!'
      }));
      return { success: true, thumbnail: newThumbnail };
    } catch (err) {
      console.error('Error generating thumbnail:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to generate thumbnail.';
      set({ errorMsg: msg });
      return { success: false, error: msg };
    } finally {
      set({ isGenerating: false });
    }
  },

  // Save changes/edits made to the thumbnail (texts, blur, glow, filters)
  saveThumbnailEdits: async (edits) => {
    const active = get().activeThumbnail;
    if (!active) {
      set({ errorMsg: 'No active thumbnail selected for editing.' });
      return { success: false };
    }

    set({ isEditing: true, errorMsg: '', successMsg: '' });
    try {
      const res = await axios.post(`${API_URL}/thumbnails/edit`, {
        thumbnailId: active._id,
        textOverlays: edits.textOverlays,
        glow: edits.glow,
        blur: edits.blur,
        overlay: edits.overlay,
        adjustments: edits.adjustments
      });

      const updatedThumbnail = res.data;

      set((state) => ({
        thumbnails: state.thumbnails.map(t => t._id === updatedThumbnail._id ? updatedThumbnail : t),
        activeThumbnail: updatedThumbnail,
        successMsg: 'Thumbnail customized and rendered successfully!'
      }));

      return { success: true, thumbnail: updatedThumbnail };
    } catch (err) {
      console.error('Error rendering thumbnail edits:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to render thumbnail modifications.';
      set({ errorMsg: msg });
      return { success: false, error: msg };
    } finally {
      set({ isEditing: false });
    }
  }
}));

export default useThumbnailStore;
