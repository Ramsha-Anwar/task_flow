import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

/**
 * Multer configuration for attachment uploads. Files are written to disk
 * under ./uploads/attachments with a randomly generated filename (original
 * extension preserved) to avoid collisions and path-based guessing.
 */
export const multerConfig = {
  storage: diskStorage({
    destination: './uploads/attachments',
    filename: (req, file, callback) => {
      const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  }),
};