// Upload handling for Supabase Storage.
// TechSpec.md section 7.
// Rules.md section 5: Put upload logic in lib/uploads.js.

'use strict';

const crypto = require('node:crypto');

let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    const { supabase } = require('../db');
    _supabase = supabase;
  }
  return _supabase;
}

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const BUCKET_NAME = 'part-images';

/**
 * Detect file extension from magic bytes (file content), not extension/MIME.
 * Returns '.jpg', '.png', '.webp', or null.
 */
function detectExtensionFromMagic(buffer) {
  if (!buffer || buffer.length < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return '.jpg';
  }

  // PNG: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return '.png';
  }

  // WebP: 'RIFF' at start, 'WEBP' at offset 8
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return '.webp';
  }

  return null;
}

/**
 * Parse multipart/form-data directly from binary Buffer.
 * Preserves raw bytes without utf-8 corruption for uploaded images.
 */
async function parseMultipart(request) {
  let body;
  if (request.rawBody) {
    body = request.rawBody;
  } else if (Buffer.isBuffer(request.body)) {
    body = request.body;
  } else {
    const chunks = [];
    for await (const chunk of request) {
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks);
  }

  const contentType = (request.headers && (request.headers['content-type'] || request.headers['Content-Type'])) || '';
  const boundaryMatch = contentType.match(/boundary=([^\s;]+)/i);
  if (!boundaryMatch) {
    return { fields: {}, files: {} };
  }
  const boundary = boundaryMatch[1].replace(/^["']|["']$/g, '');

  const fields = {};
  const files = {};

  const boundaryBuf = Buffer.from('--' + boundary);
  const crlfCrlf = Buffer.from('\r\n\r\n');

  let cur = 0;
  while (cur < body.length) {
    const bStart = body.indexOf(boundaryBuf, cur);
    if (bStart === -1) break;

    const afterBoundary = bStart + boundaryBuf.length;
    // Check if end boundary '--'
    if (body[afterBoundary] === 45 && body[afterBoundary + 1] === 45) { // '--'
      break;
    }

    // Skip boundary line's \r\n
    let partStart = afterBoundary;
    if (body[partStart] === 13 && body[partStart + 1] === 10) {
      partStart += 2;
    }

    const nextBoundary = body.indexOf(boundaryBuf, partStart);
    if (nextBoundary === -1) break;

    let partEnd = nextBoundary;
    // Strip trailing \r\n before next boundary
    if (partEnd >= 2 && body[partEnd - 2] === 13 && body[partEnd - 1] === 10) {
      partEnd -= 2;
    }

    const headerEnd = body.indexOf(crlfCrlf, partStart);
    if (headerEnd !== -1 && headerEnd < partEnd) {
      const headerStr = body.slice(partStart, headerEnd).toString('utf8');
      const valBuf = body.slice(headerEnd + 4, partEnd);

      const dispMatch = headerStr.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"/i);
      if (dispMatch) {
        const fieldName = dispMatch[1];
        const fnMatch = headerStr.match(/filename="([^"]+)"/i);
        if (fnMatch) {
          const typeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
          files[fieldName] = {
            data: valBuf,
            name: fnMatch[1],
            type: typeMatch ? typeMatch[1].trim() : 'application/octet-stream',
            size: valBuf.length,
          };
        } else {
          fields[fieldName] = valBuf.toString('utf8').trim();
        }
      }
    }

    cur = nextBoundary;
  }

  return { fields, files };
}

/**
 * Validate an uploaded buffer by magic bytes. Returns extension or null.
 */
function validateImageBuffer(buffer) {
  return detectExtensionFromMagic(buffer);
}

/**
 * Upload a validated buffer to Supabase Storage. Returns the object key.
 */
async function saveImageFile(buffer, ext) {
  const key = 'part-images/' + crypto.randomBytes(16).toString('hex') + ext;
  const contentType = ext === '.jpg' ? 'image/jpeg' : ext === '.png' ? 'image/png' : 'image/webp';

  const client = getSupabase();
  const { error } = await client.storage.from(BUCKET_NAME).upload(key, buffer, {
    contentType,
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  return key;
}

/**
 * Get the public URL for a stored image key.
 */
function getImageUrl(key) {
  if (!key) return null;
  const client = getSupabase();
  const { data } = client.storage.from(BUCKET_NAME).getPublicUrl(key);
  return data ? data.publicUrl : null;
}

/**
 * Delete an image object from Supabase Storage by key.
 */
async function deleteImageFile(key) {
  if (!key) return;
  const client = getSupabase();
  await client.storage.from(BUCKET_NAME).remove([key]).catch(() => {
    // Ignore if already deleted
  });
}

/**
 * Check if request body exceeds max size before reading.
 */
function checkBodySize(request) {
  const contentLength = request.headers['content-length'];
  if (contentLength && Number(contentLength) > MAX_SIZE) {
    return false;
  }
  return true;
}

module.exports = {
  BUCKET_NAME,
  parseMultipart,
  validateImageBuffer,
  saveImageFile,
  getImageUrl,
  deleteImageFile,
  checkBodySize,
};
