let currentProjectId = null;
const activeProcesses = new Set();

export const processRegistry = {
  setCurrentProject(projectId) {
    currentProjectId = projectId;
  },

  getCurrentProject() {
    return currentProjectId;
  },

  register(proc) {
    if (!proc) return;
    const item = { proc, projectId: currentProjectId };
    activeProcesses.add(item);
    
    const cleanup = () => activeProcesses.delete(item);
    proc.on('exit', cleanup);
    proc.on('close', cleanup);
    proc.on('error', cleanup);
  },

  kill(projectId) {
    console.log(`[Process Registry] Killing active child processes for project: ${projectId}...`);
    for (const item of activeProcesses) {
      if (item.projectId === projectId) {
        try {
          item.proc.kill('SIGKILL');
        } catch (e) {
          console.warn(`[Process Registry] Error killing child process for project ${projectId}:`, e.message);
        }
        activeProcesses.delete(item);
      }
    }
  },
  
  killAll() {
    console.log(`[Process Registry] Killing all ${activeProcesses.size} active child processes...`);
    for (const item of activeProcesses) {
      try {
        item.proc.kill('SIGKILL');
      } catch (e) {
        console.warn('[Process Registry] Error killing child process:', e.message);
      }
    }
    activeProcesses.clear();
  }
};

export default processRegistry;

