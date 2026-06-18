module.exports = (req, res, next) => {
  if (!['admin', 'supervisor'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};
