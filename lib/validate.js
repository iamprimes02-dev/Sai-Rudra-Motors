// Validation helpers for the parts catalogue.
// Rules.md section 5: Put validation in lib/validate.js.
// Schema.md section 3: field rules.

'use strict';

/**
 * Trim and collapse internal whitespace to single spaces.
 */
function collapseWhitespace(value) {
  return String(value).trim().replace(/\s+/g, ' ');
}

/**
 * Validate a supplier name.
 * Schema.md 3.1: required, trimmed, 2 to 60 characters.
 */
function validateSupplierName(value) {
  const name = collapseWhitespace(value);
  if (!name) return { ok: false, error: 'Supplier name is required.' };
  if (name.length < 2 || name.length > 60) {
    return { ok: false, error: 'Supplier name must be 2 to 60 characters.' };
  }
  return { ok: true, value: name };
}

/**
 * Validate an optional part name.
 * Schema.md 3.2: optional, trimmed, 1 to 120 characters. NULL when empty.
 */
function validatePartName(value) {
  if (value === undefined || value === null) return { ok: true, value: null };
  const name = collapseWhitespace(value);
  if (!name) return { ok: true, value: null };
  if (name.length > 120) {
    return { ok: false, error: 'Part name must be at most 120 characters.' };
  }
  return { ok: true, value: name };
}

/**
 * Validate a vehicles array.
 * Schema.md 3.2: 1 to 20 items, each 2 to 80 chars, trimmed, whitespace
 * collapsed, case-insensitive duplicates removed (first spelling kept).
 */
function validateVehicles(value) {
  let arr;
  if (Array.isArray(value)) {
    arr = value;
  } else if (typeof value === 'string') {
    try {
      arr = JSON.parse(value);
    } catch {
      return { ok: false, error: 'Vehicles must be a JSON array.' };
    }
  } else {
    return { ok: false, error: 'Vehicles are required.' };
  }

  if (!Array.isArray(arr) || arr.length === 0 || arr.length > 20) {
    return { ok: false, error: 'Provide between 1 and 20 vehicles.' };
  }

  const seen = new Set();
  const cleaned = [];
  for (const item of arr) {
    const v = collapseWhitespace(String(item));
    if (!v || v.length < 2 || v.length > 80) {
      return { ok: false, error: 'Each vehicle must be 2 to 80 characters.' };
    }
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(v);
  }

  if (cleaned.length === 0) {
    return { ok: false, error: 'Provide at least one valid vehicle.' };
  }
  return { ok: true, value: cleaned };
}

/**
 * Validate a WhatsApp number.
 * Schema.md 2: digits only, 8 to 15 digits. Empty string means not set.
 */
function validateWhatsappNumber(value) {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: '' };
  }
  const digits = String(value).replace(/\s+/g, '');
  if (!/^\d{8,15}$/.test(digits)) {
    return {
      ok: false,
      error: 'Enter digits only, with country code (8 to 15 digits).',
    };
  }
  return { ok: true, value: digits };
}

module.exports = {
  collapseWhitespace,
  validateSupplierName,
  validatePartName,
  validateVehicles,
  validateWhatsappNumber,
};
