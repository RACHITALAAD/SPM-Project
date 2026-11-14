import multer from 'multer';

export function errorHandler(error, _req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File must be 15 MB or smaller' });
    }
    return res.status(400).json({ message: 'Could not upload that file' });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ message: 'That record id is not valid' });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: 'Some fields are missing or invalid' });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: 'This record already exists' });
  }

  const status = error.status || 500;
  if (status >= 500) console.error(error);
  const message = status >= 500 ? 'Something went wrong. Please try again.' : error.message;
  return res.status(status).json({ message });
}
