import Project from '../models/Project.js';

export const verifyProjectOwnership = async (req, res, next) => {
  const projectId = req.params.id;
  const userId = req.user._id;

  try {
    const project = await Project.findOne({ id: projectId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify ownership
    if (project.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Access denied. You do not own this project.' });
    }

    req.project = project; // Pass verified project object along to speed up controllers
    next();
  } catch (error) {
    console.error('[Ownership Middleware] Verification error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default verifyProjectOwnership;
