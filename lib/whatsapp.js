// WhatsApp link and message builders.
// TechSpec.md section 8.2.
// Rules.md section 5: Put WhatsApp logic in lib/whatsapp.js.

'use strict';

/**
 * Build the pre-filled enquiry message for a part card Contact button.
 * Template is fixed in v1.
 */
function buildPartMessage(supplier, partNameOrRef, vehicles) {
  const vehicleList = Array.isArray(vehicles) ? vehicles.join(', ') : String(vehicles);
  return (
    'Hello, I am interested in this part from ' + supplier + '.\n' +
    'Part: ' + partNameOrRef + '\n' +
    'Vehicles: ' + vehicleList + '\n' +
    'Please let me know if it is available. Thank you.'
  );
}

/**
 * Build the general header Contact Us message.
 */
function buildHeaderMessage() {
  return 'Hello, I would like to enquire about parts.';
}

/**
 * Build a wa.me link. Returns null if the number is empty (never render an
 * empty wa.me/ link).
 */
function buildContactLink(number, message) {
  if (!number) return null;
  return (
    'https://wa.me/' + encodeURIComponent(number) +
    '?text=' + encodeURIComponent(message)
  );
}

module.exports = {
  buildPartMessage,
  buildHeaderMessage,
  buildContactLink,
};
