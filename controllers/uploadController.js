exports.uploadPhoto = (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  const url = req.file.path || `/uploads/${req.file.filename}`;
  res.json({ url });
};
