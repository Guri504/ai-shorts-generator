import { create } from 'zustand';
import axios from 'axios';
import { io } from 'socket.io-client';

const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return `http://${hostname}:5000`;
  }
  return 'http://localhost:5000';
};

const BACKEND_URL = getBackendUrl();
const API_URL = `${BACKEND_URL}/api`;

// Keep track of active WebSocket connection globally or in store
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

export const useAppStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  voices: [], // List of Edge TTS voices
  settings: {
    hasGeminiKey: false,
    hasPexelsKey: false,
    hasPixabayKey: false,
    env: { GEMINI_API_KEY: '', PEXELS_API_KEY: '', PIXABAY_API_KEY: '' }
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
  
  // UI routing/navigation tab
  activeTab: 'dashboard', // dashboard, generator, editor, settings
  
  // Navigation action
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Set selected project
  setCurrentProject: (project) => {
    set({ currentProject: project });
    // Reset logs and states when changing selected project
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

      // Auto connect WebSocket if project is currently active
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

  // Fetch all projects from backend
  fetchProjects: async () => {
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
          
          // Connect WebSocket if project status changed to rendering/queued externally
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

  // Save/update settings
  saveSettings: async (keys) => {
    try {
      await axios.post(`${API_URL}/settings`, keys);
      await get().fetchSettings();
      return { success: true };
    } catch (err) {
      console.error('Error saving settings:', err);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  },

  // Create project & generate script (Phase 1)
  createProject: async (formData) => {
    set({ isGeneratingScript: true });
    try {
      const res = await axios.post(`${API_URL}/projects`, formData);
      const newProject = res.data;
      
      set((state) => ({
        projects: [newProject, ...state.projects],
        currentProject: newProject,
        activeTab: 'editor' // Redirect directly to scene editor
      }));
      
      return { success: true, project: newProject };
    } catch (err) {
      console.error('Error generating script:', err);
      return { success: false, error: err.response?.data?.error || err.message };
    } finally {
      set({ isGeneratingScript: false });
    }
  },

  // Save edits to script/scenes before rendering
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

  // Trigger video render (Phase 2 - supports full and voice_only modes)
  renderProject: async (projectId, options = {}) => {
    try {
      set({ renderLogs: [] });
      await axios.post(`${API_URL}/projects/${projectId}/render`, options);
      
      const isVoiceOnly = options.renderType === 'voice_only';
      const statusMsg = isVoiceOnly ? 'Added to voice-only render queue...' : 'Added to render queue...';

      // Update local states
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

      // Connect real-time WS connection
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
      
      // Update local states: revert to draft
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
        get().fetchProjects(); // Refresh final assets (like output path, duration, thumbnails)
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
