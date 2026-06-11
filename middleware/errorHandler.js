const isProd = process.env.NODE_ENV === 'production';

module.exports = (err, req, res, next) => {
  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  // Duplicate key (e.g. unique email)
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field} already exists.`;
  }

  // Invalid ObjectId
  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') { status = 401; message = 'Invalid token.'; }
  if (err.name === 'TokenExpiredError') { status = 401; message = 'Token expired.'; }

  res.status(status).json({
    message,
    ...(isProd ? {} : { stack: err.stack }),
  });
};
