import { create } from 'zustand';
import axios from 'axios';
import { io } from 'socket.io-client';

const getBackendUrl = () => {
  // Use environment variable for production (set on Vercel)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Fallback for local development
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return `http://${hostname}:5000`;
  }
  return 'http://localhost:5000';
};

const BACKEND_URL = getBackendUrl();
const API_URL = `${BACKEND_URL}/api`;

// Setup Request interceptor to attach JWT Token if present
axios.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (err) => {
  return Promise.reject(err);
});

// Setup Response interceptor to handle auto logout on token expiration
axios.interceptors.response.use((res) => res, (err) => {
  if (err.response?.status === 401 && typeof window !== 'undefined') {
    console.warn('[Session Monitor] Token expired or invalid. Logging out.');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // We can refresh the window to dump states
    window.location.reload();
  }
  return Promise.reject(err);
});

let activeSocket = null;
let etaInterval = null;

const startEtaTimer = (set, get) => {
  if (etaInterval) clearInterval(etaInterval);
  etaInterval = setInterval(() => {
    const { renderEta, currentProject } = get();
    if (currentProject && (currentProject.status === 'rendering' || currentProject.status === 'queued') && renderEta > 1) {
      set({ renderEta: renderEta - 1 });
    } else {
      clearInterval(etaInterval);
      etaInterval = null;
    }
  }, 1000);
};

const stopEtaTimer = () => {
  if (etaInterval) {
    clearInterval(etaInterval);
    etaInterval = null;
  }
};

// Safe helper to get initial store value from localStorage
const getStoredItem = (key) => {
  if (typeof window !== 'undefined') {
    try {
      const val = localStorage.getItem(key);
      if (!val) return null;
      return key === 'user' ? JSON.parse(val) : val;
    } catch {
      return null;
    }
  }
  return null;
};

export const useAppStore = create((set, get) => ({
  // Authentication State
  user: getStoredItem('user'),
  token: getStoredItem('token'),
  isAuthenticated: !!getStoredItem('token'),
  authError: null,
  isAuthLoading: false,

  // App State
  projects: [],
  currentProject: null,
  voices: [], 
  youtubeAccounts: [],
  linkedinAccounts: [],
  settings: {
    hasGeminiKey: false,
    hasPexelsKey: false,
    hasPixabayKey: false
  },
  
  // Real-time rendering state
  renderLogs: [],
  renderEta: 0,
  renderSpeed: 0,
  currentStage: '',
  currentScene: 0,
  
  // Loading states
  isLoadingVoices: false,
  isLoadingSettings: false,
  isLoadingProjects: false,
  isGeneratingScript: false,
  isRenderingVideo: false,
  isUploadingYouTube: false,
  
  // UI routing/navigation tab
  activeTab: 'dashboard', // auth, dashboard, generator, editor, social-media, merge-clips, replace-audio, trim-audio
  
  // Navigation action
  setActiveTab: (tab) => set({ activeTab: tab }),

  // User Authentication Actions
  signup: async (email, password, name) => {
    set({ isAuthLoading: true, authError: null });
    try {
      const res = await axios.post(`${API_URL}/auth/signup`, { email, password, name });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true, activeTab: 'dashboard' });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      set({ authError: msg });
      return { success: false, error: msg };
    } finally {
      set({ isAuthLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isAuthLoading: true, authError: null });
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true, activeTab: 'dashboard' });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      set({ authError: msg });
      return { success: false, error: msg };
    } finally {
      set({ isAuthLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    get().disconnectLogsWebSocket();
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      projects: [],
      currentProject: null,
      youtubeAccounts: [],
      linkedinAccounts: [],
      activeTab: 'dashboard'
    });
  },

  // Set selected project
  setCurrentProject: (project) => {
    set({ currentProject: project });
    if (project) {
      set({
        renderLogs: [],
        renderEta: project.eta || 0,
        renderSpeed: project.renderSpeed || 0,
        currentStage: project.status,
        currentScene: 0
      });

      if ((project.status === 'rendering' || project.status === 'queued') && (project.eta || 0) > 0) {
        startEtaTimer(set, get);
      } else {
        stopEtaTimer();
      }

      if (project.status === 'rendering' || project.status === 'queued') {
        get().connectLogsWebSocket(project.id);
      } else {
        get().disconnectLogsWebSocket();
      }
    } else {
      get().disconnectLogsWebSocket();
      stopEtaTimer();
    }
  },

  // Fetch all projects for logged-in user
  fetchProjects: async () => {
    if (!get().isAuthenticated) return;
    set({ isLoadingProjects: true });
    try {
      const res = await axios.get(`${API_URL}/projects`);
      set({ projects: res.data });
      
      const current = get().currentProject;
      if (current) {
        const updatedCurrent = res.data.find(p => p.id === current.id);
        if (updatedCurrent) {
          set({ 
            currentProject: updatedCurrent,
            renderEta: updatedCurrent.eta || 0
          });

          if ((updatedCurrent.status === 'rendering' || updatedCurrent.status === 'queued') && (updatedCurrent.eta || 0) > 0) {
            startEtaTimer(set, get);
          }
          
          if ((updatedCurrent.status === 'rendering' || updatedCurrent.status === 'queued') && !activeSocket) {
            get().connectLogsWebSocket(updatedCurrent.id);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      set({ isLoadingProjects: false });
    }
  },

  // Fetch settings status
  fetchSettings: async () => {
    if (!get().isAuthenticated) return;
    set({ isLoadingSettings: true });
    try {
      const res = await axios.get(`${API_URL}/settings`);
      set({ settings: res.data });
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      set({ isLoadingSettings: false });
    }
  },


  // Create project & generate script
  createProject: async (formData) => {
    set({ isGeneratingScript: true });
    try {
      const res = await axios.post(`${API_URL}/projects`, formData);
      const newProject = res.data;
      
      // Update credit balance if not in unlimited mode
      if (get().user && get().user.credits <= 9999) {
        const updatedUser = { ...get().user, credits: Math.max(0, get().user.credits - 1) };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        set({ user: updatedUser });
      }

      set((state) => ({
        projects: [newProject, ...state.projects],
        currentProject: newProject,
        activeTab: 'editor' 
      }));
      
      return { success: true, project: newProject };
    } catch (err) {
      console.error('Error generating script:', err);
      return { success: false, error: err.response?.data?.error || err.message };
    } finally {
      set({ isGeneratingScript: false });
    }
  },

  // Save edits to script/scenes
  saveProjectEdits: async (projectId, updatedData) => {
    try {
      const res = await axios.put(`${API_URL}/projects/${projectId}`, updatedData);
      set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? res.data : p),
        currentProject: res.data
      }));
      return { success: true };
    } catch (err) {
      console.error('Error updating project:', err);
      return { success: false, error: err.message };
    }
  },

  // Drag and drop timeline reorder scenes
  reorderScenes: async (projectId, newScenesList) => {
    try {
      const res = await axios.put(`${API_URL}/projects/${projectId}/scenes/reorder`, { scenes: newScenesList });
      set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? res.data : p),
        currentProject: res.data
      }));
      return { success: true };
    } catch (err) {
      console.error('Error reordering scenes:', err);
      return { success: false, error: err.message };
    }
  },

  // Fetch all available neural voices
  fetchVoices: async () => {
    set({ isLoadingVoices: true });
    try {
      const res = await axios.get(`${API_URL}/voices`);
      set({ voices: res.data });
    } catch (err) {
      console.error('Error fetching voices:', err);
    } finally {
      set({ isLoadingVoices: false });
    }
  },

  // Generate and return instant voice preview URL
  previewVoice: async (voiceName, text, speed) => {
    try {
      const res = await axios.post(`${API_URL}/voices/preview`, {
        voiceName,
        text,
        speed
      });
      return { success: true, previewUrl: `${BACKEND_URL}${res.data.previewUrl}` };
    } catch (err) {
      console.error('Error previewing voice:', err);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  },

  // Trigger video render
  renderProject: async (projectId, options = {}) => {
    try {
      set({ renderLogs: [] });
      const res = await axios.post(`${API_URL}/projects/${projectId}/render`, options);
      
      // Update credits from response
      if (get().user && res.data.remainingCredits !== undefined) {
        const updatedUser = { ...get().user, credits: res.data.remainingCredits };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        set({ user: updatedUser });
      }

      const isVoiceOnly = options.renderType === 'voice_only';
      const statusMsg = isVoiceOnly ? 'Added to voice-only render queue...' : 'Added to render queue...';

      set((state) => {
        const updatedProjects = state.projects.map(p => {
          if (p.id === projectId) {
            return { ...p, status: 'queued', progress: 0, stepStatus: statusMsg };
          }
          return p;
        });
        const current = state.currentProject;
        const updatedCurrent = current?.id === projectId 
          ? { ...current, status: 'queued', progress: 0, stepStatus: statusMsg }
          : current;
          
        return { projects: updatedProjects, currentProject: updatedCurrent };
      });

      get().connectLogsWebSocket(projectId);
      return { success: true };
    } catch (err) {
      console.error('Error triggering video render:', err);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  },

  // Trigger single-scene targeted regeneration
  regenerateScene: async (projectId, sceneNumber, regenerateType) => {
    try {
      set({ renderLogs: [] });
      await axios.post(`${API_URL}/projects/${projectId}/scenes/${sceneNumber}/regenerate`, { regenerateType });
      
      set((state) => {
        const updatedProjects = state.projects.map(p => {
          if (p.id === projectId) {
            return { ...p, status: 'queued', progress: 0, stepStatus: `Scene ${sceneNumber} regeneration queued...` };
          }
          return p;
        });
        const current = state.currentProject;
        const updatedCurrent = current?.id === projectId 
          ? { ...current, status: 'queued', progress: 0, stepStatus: `Scene ${sceneNumber} regeneration queued...` }
          : current;
          
        return { projects: updatedProjects, currentProject: updatedCurrent };
      });

      get().connectLogsWebSocket(projectId);
      return { success: true };
    } catch (err) {
      console.error('Error regenerating scene:', err);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  },

  // Delete project
  deleteProject: async (projectId) => {
    try {
      if (get().currentProject?.id === projectId) {
        get().disconnectLogsWebSocket();
      }
      await axios.delete(`${API_URL}/projects/${projectId}`);
      set((state) => ({
        projects: state.projects.filter(p => p.id !== projectId),
        currentProject: state.currentProject?.id === projectId ? null : state.currentProject
      }));
      return { success: true };
    } catch (err) {
      console.error('Error deleting project:', err);
      return { success: false, error: err.message };
    }
  },

  // Cancel rendering
  cancelRender: async (projectId) => {
    try {
      await axios.post(`${API_URL}/projects/${projectId}/cancel`);
      stopEtaTimer();
      
      set((state) => {
        const updatedProjects = state.projects.map(p => {
          if (p.id === projectId) {
            return { ...p, status: 'draft', progress: 0, stepStatus: 'Render cancelled' };
          }
          return p;
        });
        const current = state.currentProject;
        const updatedCurrent = current?.id === projectId
          ? { ...current, status: 'draft', progress: 0, stepStatus: 'Render cancelled' }
          : current;
          
        return { projects: updatedProjects, currentProject: updatedCurrent };
      });

      get().disconnectLogsWebSocket();
      return { success: true };
    } catch (err) {
      console.error('Error cancelling render:', err);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  },

  // Delete scene from draft
  deleteScene: async (projectId, sceneNumber) => {
    try {
      const res = await axios.delete(`${API_URL}/projects/${projectId}/scenes/${sceneNumber}`);
      const updatedProject = res.data;
      
      set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? updatedProject : p),
        currentProject: state.currentProject?.id === projectId ? updatedProject : state.currentProject
      }));
      return { success: true };
    } catch (err) {
      console.error('Error deleting scene:', err);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  },

  // YouTube Channel Connection Operations
  fetchYouTubeAccounts: async () => {
    if (!get().isAuthenticated) return;
    try {
      const res = await axios.get(`${API_URL}/youtube/accounts`);
      set({ youtubeAccounts: res.data });
    } catch (err) {
      console.error('Error fetching YouTube accounts:', err);
    }
  },

  connectYouTube: async () => {
    try {
      const res = await axios.get(`${API_URL}/youtube/auth`);
      const authUrl = res.data.url;
      if (authUrl) {
        // Open authorization window
        const width = 600, height = 700;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;
        const win = window.open(
          authUrl,
          'Connect YouTube Channel',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Monitor if authentication window is closed
        const timer = setInterval(() => {
          if (win.closed) {
            clearInterval(timer);
            // Refresh list
            get().fetchYouTubeAccounts();
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Error initiating YouTube OAuth:', err);
    }
  },

  // LinkedIn Account Connection Operations
  fetchLinkedInAccounts: async () => {
    if (!get().isAuthenticated) return;
    try {
      const res = await axios.get(`${API_URL}/linkedin/accounts`);
      set({ linkedinAccounts: res.data });
    } catch (err) {
      console.error('Error fetching LinkedIn accounts:', err);
    }
  },

  connectLinkedIn: async () => {
    try {
      const res = await axios.get(`${API_URL}/linkedin/auth`);
      const authUrl = res.data.url;
      if (authUrl) {
        // Open authorization window
        const width = 600, height = 700;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;
        const win = window.open(
          authUrl,
          'Connect LinkedIn Account',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Monitor if authentication window is closed
        const timer = setInterval(() => {
          if (win && win.closed) {
            clearInterval(timer);
            // Refresh list
            get().fetchLinkedInAccounts();
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Error initiating LinkedIn OAuth:', err);
    }
  },

  uploadToYouTube: async (projectId, youtubeAccountId, privacyStatus = 'public', uploadType = 'short') => {
    set({ isUploadingYouTube: true });
    
    // Connect to WebSocket to receive real-time progress events
    get().connectLogsWebSocket(projectId);
    
    try {
      const res = await axios.post(`${API_URL}/projects/${projectId}/youtube-upload`, { 
        youtubeAccountId,
        privacyStatus,
        uploadType
      });
      
      // Fetch updated project schema to populate youtubeUpload success state
      const resProj = await axios.get(`${API_URL}/projects/${projectId}`);
      set((state) => {
        const updatedProjects = state.projects.map(p => p.id === projectId ? resProj.data : p);
        return { 
          projects: updatedProjects, 
          currentProject: state.currentProject?.id === projectId ? resProj.data : state.currentProject,
          isUploadingYouTube: false 
        };
      });

      // Keep WebSocket open a bit then disconnect
      setTimeout(() => {
        get().disconnectLogsWebSocket();
      }, 2000);

      return { success: true, message: res.data.message };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      
      // Fetch project state again to capture upload failure details
      try {
        const resProj = await axios.get(`${API_URL}/projects/${projectId}`);
        set((state) => {
          const updatedProjects = state.projects.map(p => p.id === projectId ? resProj.data : p);
          return { 
            projects: updatedProjects, 
            currentProject: state.currentProject?.id === projectId ? resProj.data : state.currentProject
          };
        });
      } catch (fetchErr) {
        console.error('Error fetching project after upload failure:', fetchErr);
      }

      set({ isUploadingYouTube: false });
      setTimeout(() => {
        get().disconnectLogsWebSocket();
      }, 1000);

      return { success: false, error: errorMsg };
    }
  },

  // Real-time WebSocket connection to backend logs channel
  connectLogsWebSocket: (projectId) => {
    get().disconnectLogsWebSocket();

    console.log(`[Socket.io client] Connecting to ${BACKEND_URL}...`);
    
    const socket = io(BACKEND_URL);
    activeSocket = socket;

    socket.on('connect', () => {
      console.log(`[Socket.io client] Connected. Joining project room: ${projectId}`);
      socket.emit('join-project', projectId);
    });

    socket.on('connected', (data) => {
      console.log(`[Socket.io client] Server confirmed connection:`, data.message);
    });

    socket.on('log', (data) => {
      // Intercept upload stage logs to update youtubeUpload state in the store directly!
      if (data.currentStage === 'uploading') {
        set((state) => {
          const current = state.currentProject;
          const updatedCurrent = current?.id === projectId
            ? {
                ...current,
                youtubeUpload: {
                  ...current.youtubeUpload,
                  status: 'uploading',
                  progress: data.progress,
                  message: data.message
                }
              }
            : current;
          const updatedProjects = state.projects.map(p => {
            if (p.id === projectId) {
              return {
                ...p,
                youtubeUpload: {
                  ...p.youtubeUpload,
                  status: 'uploading',
                  progress: data.progress,
                  message: data.message
                }
              };
            }
            return p;
          });
          return { projects: updatedProjects, currentProject: updatedCurrent };
        });
        return;
      }

      // Append log to list
      set((state) => ({
        renderLogs: [...state.renderLogs, { text: data.message, time: data.timestamp, stage: data.currentStage }],
        renderEta: data.eta || 0,
        renderSpeed: data.renderSpeed || 0,
        currentStage: data.currentStage || '',
        currentScene: data.currentScene || 0
      }));

      // Start countdown timer if eta is positive
      if (data.eta > 0) {
        startEtaTimer(set, get);
      }

      // Sync progress updates to project model
      set((state) => {
        const updatedProjects = state.projects.map(p => {
          if (p.id === projectId) {
            return { 
              ...p, 
              status: data.currentStage === 'complete' ? 'completed' : (data.currentStage === 'failed' ? 'failed' : 'rendering'),
              progress: data.progress, 
              stepStatus: data.message 
            };
          }
          return p;
        });
        const current = state.currentProject;
        let updatedCurrent = current;
        if (current?.id === projectId) {
          updatedCurrent = { 
            ...current, 
            status: data.currentStage === 'complete' ? 'completed' : (data.currentStage === 'failed' ? 'failed' : 'rendering'),
            progress: data.progress, 
            stepStatus: data.message 
          };
        }
        return { projects: updatedProjects, currentProject: updatedCurrent };
      });

      // Disconnect on completion or error
      if (data.currentStage === 'complete' || data.currentStage === 'failed') {
        stopEtaTimer();
        get().fetchProjects(); 
        setTimeout(() => get().disconnectLogsWebSocket(), 1000);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io client] Connection closed for ${projectId}`);
      if (activeSocket === socket) {
        activeSocket = null;
      }
      stopEtaTimer();
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket.io client] Connection error:', err);
    });
  },

  disconnectLogsWebSocket: () => {
    if (activeSocket) {
      activeSocket.disconnect();
      activeSocket = null;
    }
    stopEtaTimer();
  }
}));

export default useAppStore;
export { BACKEND_URL };
