// Unit tests for validate.js and whatsapp.js
// Runs with node:test

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  validateSupplierName,
  validatePartName,
  validateVehicles,
  validateWhatsappNumber,
  collapseWhitespace,
} = require('../lib/validate');
const {
  buildPartMessage,
  buildHeaderMessage,
  buildContactLink,
} = require('../lib/whatsapp');

test('collapseWhitespace trims and collapses whitespace', () => {
  assert.strictEqual(collapseWhitespace('  hello   world  '), 'hello world');
});

test('validateSupplierName accepts valid names', () => {
  assert.ok(validateSupplierName('Bosch Auto').ok);
  assert.ok(validateSupplierName('  Bosch Auto  ').ok);
  assert.ok(validateSupplierName('AB').ok);
});

test('validateSupplierName rejects empty names', () => {
  assert.ok(!validateSupplierName('').ok);
  assert.ok(!validateSupplierName('   ').ok);
});

test('validateSupplierName rejects names too short or too long', () => {
  assert.ok(!validateSupplierName('A').ok);
  assert.ok(!validateSupplierName('A'.repeat(61)).ok);
});

test('validatePartName accepts valid names and null for empty', () => {
  assert.ok(validatePartName('Front Brake Pad').ok);
  assert.ok(validatePartName('').ok);
  assert.ok(validatePartName(null).ok);
  assert.ok(validatePartName(undefined).ok);
});

test('validatePartName rejects names too long', () => {
  assert.ok(!validatePartName('A'.repeat(121)).ok);
});

test('validateVehicles accepts valid vehicle arrays', () => {
  const r = validateVehicles(['Maruti Swift 2018-2022', 'Maruti Dzire 2019-2023']);
  assert.ok(r.ok);
  assert.deepStrictEqual(r.value, ['Maruti Swift 2018-2022', 'Maruti Dzire 2019-2023']);
});

test('validateVehicles rejects empty arrays', () => {
  assert.ok(!validateVehicles([]).ok);
});

test('validateVehicles removes case-insensitive duplicates', () => {
  const r = validateVehicles(['Maruti Swift 2018-2022', 'maruti swift 2018-2022']);
  assert.ok(r.ok);
  assert.strictEqual(r.value.length, 1);
});

test('validateVehicles accepts JSON string input', () => {
  const r = validateVehicles(JSON.stringify(['Toyota Corolla 2020']));
  assert.ok(r.ok);
  assert.deepStrictEqual(r.value, ['Toyota Corolla 2020']);
});

test('validateWhatsappNumber accepts valid numbers', () => {
  assert.ok(validateWhatsappNumber('919876543210').ok);
  assert.ok(validateWhatsappNumber('').ok);
  assert.ok(validateWhatsappNumber(null).ok);
});

test('validateWhatsappNumber rejects invalid numbers', () => {
  assert.ok(!validateWhatsappNumber('abc').ok);
  assert.ok(!validateWhatsappNumber('1234567').ok);
  assert.ok(!validateWhatsappNumber('+919876543210').ok);
});

test('buildPartMessage builds a complete message', () => {
  const msg = buildPartMessage('Bosch Auto', 'Front Brake Pad', ['Maruti Swift 2018-2022']);
  assert.ok(msg.includes('Bosch Auto'));
  assert.ok(msg.includes('Front Brake Pad'));
  assert.ok(msg.includes('Maruti Swift 2018-2022'));
  assert.ok(msg.includes('Please let me know if it is available. Thank you.'));
});

test('buildPartMessage uses Part #id when no name', () => {
  const msg = buildPartMessage('Bosch Auto', 'Part #42', ['Toyota Corolla 2020']);
  assert.ok(msg.includes('Part #42'));
});

test('buildHeaderMessage returns the general enquiry message', () => {
  assert.strictEqual(buildHeaderMessage(), 'Hello, I would like to enquire about parts.');
});

test('buildContactLink returns null for empty number', () => {
  assert.strictEqual(buildContactLink('', 'test'), null);
  assert.strictEqual(buildContactLink(null, 'test'), null);
});

test('buildContactLink builds a wa.me link', () => {
  const link = buildContactLink('919876543210', 'Hello');
  assert.strictEqual(link, 'https://wa.me/919876543210?text=Hello');
});

test('buildContactLink encodes spaces and special characters', () => {
  const link = buildContactLink('919876543210', 'Hello & thanks');
  assert.ok(link.includes('text=Hello%20%26%20thanks'));
});

// --- Upload validation and multipart tests ---
const { validateImageBuffer, parseMultipart } = require('../lib/uploads');

test('validateImageBuffer detects JPEG magic bytes', () => {
  const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  assert.strictEqual(validateImageBuffer(jpegBuf), '.jpg');
});

test('validateImageBuffer detects PNG magic bytes', () => {
  const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
  assert.strictEqual(validateImageBuffer(pngBuf), '.png');
});

test('validateImageBuffer detects WebP magic bytes', () => {
  const webpBuf = Buffer.from('RIFFxxxxWEBPVP8 ', 'binary');
  assert.strictEqual(validateImageBuffer(webpBuf), '.webp');
});

test('validateImageBuffer rejects invalid magic bytes', () => {
  const fakeBuf = Buffer.from('GIF89aThisIsAGif');
  assert.strictEqual(validateImageBuffer(fakeBuf), null);
});

test('parseMultipart extracts binary file cleanly without corruption', async () => {
  const boundary = '----WebKitFormBoundaryXyz123';
  const binaryPayload = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, 0xfe, 0xaa, 0xbb]);
  
  const part1Header = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\nBrake Disc\r\n`);
  const part2Header = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="part.png"\r\nContent-Type: image/png\r\n\r\n`);
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);

  const rawBody = Buffer.concat([part1Header, part2Header, binaryPayload, footer]);

  const req = {
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    rawBody,
  };

  const { fields, files } = await parseMultipart(req);
  assert.strictEqual(fields.name, 'Brake Disc');
  assert.ok(files.image);
  assert.strictEqual(files.image.name, 'part.png');
  assert.strictEqual(files.image.size, binaryPayload.length);
  assert.deepStrictEqual(Buffer.from(files.image.data), binaryPayload);
});

// --- Auth tests ---
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret-key-32-chars-at-least-1234';
const { createSession, verifySession, checkAdminPassword, checkLoginRateLimit } = require('../lib/auth');

test('createSession and verifySession valid token roundtrip', () => {
  const sessionStr = createSession(true, 'csrf-12345');
  const verified = verifySession(sessionStr);
  assert.ok(verified);
  assert.strictEqual(verified.admin, true);
  assert.strictEqual(verified.csrf, 'csrf-12345');
});

test('verifySession rejects tampered session tokens', () => {
  const sessionStr = createSession(true, 'csrf-12345');
  const tampered = sessionStr.slice(0, -3) + 'abc';
  assert.strictEqual(verifySession(tampered), null);
});

test('checkAdminPassword matches correctly', async () => {
  assert.strictEqual(await checkAdminPassword('secret', 'secret'), true);
  assert.strictEqual(await checkAdminPassword('wrong', 'secret'), false);
  assert.strictEqual(await checkAdminPassword('', 'secret'), false);
});

test('checkLoginRateLimit tracks attempts', () => {
  const testIp = '192.168.1.99';
  const r1 = checkLoginRateLimit(testIp);
  assert.strictEqual(r1.allowed, true);
});
