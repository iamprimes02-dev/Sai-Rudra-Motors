// Admin frontend logic - Sai Rudra Motors.
// Handles login, session/CSRF, supplier & part CRUD, vehicle tags, image uploads, settings.

'use strict';

const API = window.location.origin;

// --- State ---
let csrfToken = null;
let isLoggedIn = false;
let currentSupplierId = null;
let partImageFile = null; // File object for the current part form
let currentPartImage = null; // Existing image name (for edit)
let tags = []; // Current vehicle tags

// --- DOM elements ---
const views = {
  dashboard: document.getElementById('viewDashboard'),
  supplierForm: document.getElementById('viewSupplierForm'),
  supplierParts: document.getElementById('viewSupplierParts'),
  partForm: document.getElementById('viewPartForm'),
  settings: document.getElementById('viewSettings'),
  inquiries: document.getElementById('viewInquiries'),
};

const navLinks = document.querySelectorAll('.nav-link');
const toast = document.getElementById('toast');
const confirmOverlay = document.getElementById('confirmOverlay');
let confirmResolve = null;

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  // Check session on load
  await checkSession();

  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Nav links
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.getAttribute('data-view');
      if (view) {
        switchView(view);
        if (view === 'inquiries') loadInquiries();
        if (view === 'settings') loadSettings();
        if (view === 'dashboard') loadDashboard();
      }
    });
  });

  // Refresh inquiries button
  const refreshInquiriesBtn = document.getElementById('refreshInquiriesBtn');
  if (refreshInquiriesBtn) {
    refreshInquiriesBtn.addEventListener('click', () => loadInquiries());
  }

  // Dashboard: add supplier
  const addSupplierBtn = document.getElementById('addSupplierBtn');
  if (addSupplierBtn) {
    addSupplierBtn.addEventListener('click', () => openSupplierForm());
  }

  // Supplier form
  const supplierForm = document.getElementById('supplierForm');
  if (supplierForm) {
    supplierForm.addEventListener('submit', handleSupplierFormSubmit);
  }
  document.getElementById('supplierFormCancelBtn').addEventListener('click', () => switchView('dashboard'));
  document.getElementById('deleteSupplierBtn').addEventListener('click', () => {
    confirmDelete('supplier');
  });

  // Back to dashboard from parts view
  document.getElementById('backToDashboard').addEventListener('click', () => switchView('dashboard'));

  // Add part
  document.getElementById('addPartBtn').addEventListener('click', () => openPartForm(null));

  // Back to parts from part form
  document.getElementById('backToParts').addEventListener('click', () => switchView('supplierParts'));

  // Part form
  document.getElementById('partForm').addEventListener('submit', handlePartFormSubmit);
  document.getElementById('partFormCancelBtn').addEventListener('click', () => switchView('supplierParts'));
  document.getElementById('deletePartBtn').addEventListener('click', () => {
    confirmDelete('part');
  });

  // Image picker
  const imagePicker = document.getElementById('imagePicker');
  const partImageInput = document.getElementById('partImage');
  const changePhotoBtn = document.getElementById('changePhotoBtn');
  const imagePreview = document.getElementById('imagePreview');
  const previewImage = document.getElementById('previewImage');

  imagePicker.addEventListener('click', () => partImageInput.click());
  changePhotoBtn.addEventListener('click', () => partImageInput.click());

  partImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    partImageFile = file;
    const url = URL.createObjectURL(file);
    previewImage.src = url;
    imagePreview.style.display = 'block';
    changePhotoBtn.style.display = 'inline-block';
  });

  // Vehicle tag input
  const tagInput = document.getElementById('tagInput');
  const vehicleInput = document.getElementById('vehicleInput');
  const suggestionsEl = document.getElementById('tagSuggestions');

  tagInput.addEventListener('click', () => vehicleInput.focus());
  vehicleInput.addEventListener('input', handleVehicleInput);
  vehicleInput.addEventListener('keydown', handleVehicleKeydown);
  vehicleInput.addEventListener('blur', () => {
    setTimeout(() => suggestionsEl.classList.remove('open'), 150);
  });

  // Settings form
  document.getElementById('settingsForm').addEventListener('submit', handleSettingsFormSubmit);

  // Confirm dialog
  document.getElementById('confirmCancel').addEventListener('click', () => {
    confirmOverlay.classList.remove('open');
    if (confirmResolve) confirmResolve(false);
    confirmResolve = null;
  });
  document.getElementById('confirmOk').addEventListener('click', () => {
    confirmOverlay.classList.remove('open');
    if (confirmResolve) confirmResolve(true);
    confirmResolve = null;
  });

  // Initial view
  if (isLoggedIn) {
    loadDashboard();
  }
});

// --- Session / auth ---

async function checkSession() {
  try {
    const res = await fetch(`${API}/api/admin/session`);
    const data = await res.json();
    isLoggedIn = data.loggedIn;
    csrfToken = data.csrfToken || null;

    const loginPage = document.getElementById('loginForm');
    if (isLoggedIn && loginPage) {
      // Already logged in on login page -> redirect to admin
      window.location.pathname = '/admin';
    }
    if (!isLoggedIn && !loginPage) {
      // Not logged in on admin page -> redirect to login
      window.location.pathname = '/admin/login';
    }
  } catch (err) {
    console.error('Session check failed:', err);
    isLoggedIn = false;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const password = document.getElementById('password').value;
  const generalError = document.getElementById('generalError');
  const passwordError = document.getElementById('passwordError');

  generalError.textContent = '';
  passwordError.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Logging in...';

  try {
    const res = await fetch(`${API}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();

    if (!res.ok) {
      passwordError.textContent = data.error || 'Incorrect password.';
      return;
    }

    isLoggedIn = true;
    csrfToken = data.csrfToken || null;
    window.location.pathname = '/admin';
  } catch (err) {
    generalError.textContent = 'Login failed. Please try again.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Login';
  }
}

async function handleLogout() {
  try {
    await fetch(`${API}/api/admin/logout`, { method: 'POST' });
  } catch (err) {
    console.error('Logout failed:', err);
  }
  isLoggedIn = false;
  csrfToken = null;
  window.location.pathname = '/admin/login';
}

// --- API helpers ---

async function apiRequest(path, options = {}) {
  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  // CSRF token for write methods
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const res = await fetch(`${API}${path}`, { ...options, headers });
  return res;
}

function showToastMessage(message, type = 'success') {
  toast.textContent = message;
  toast.className = 'toast toast-' + type + ' show';
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function confirmDialog(title, message) {
  return new Promise((resolve) => {
    confirmResolve = resolve;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmOverlay.classList.add('open');
  });
}

function switchView(viewName) {
  Object.values(views).forEach((v) => v.classList.remove('active'));
  navLinks.forEach((l) => l.classList.remove('active'));
  const link = document.querySelector('.nav-link[data-view="' + viewName + '"]');
  if (link) link.classList.add('active');
  views[viewName].classList.add('active');

  // Scroll to top
  document.querySelector('.admin-container').scrollTop = 0;
}

// --- Dashboard ---

let allAdminSuppliers = [];

function renderAdminSuppliers(suppliers) {
  const list = document.getElementById('supplierList');
  const empty = document.getElementById('dashboardEmpty');
  list.innerHTML = '';

  if (!suppliers || suppliers.length === 0) {
    empty.classList.remove('hidden');
    empty.style.display = 'block';
    return;
  }
  empty.classList.add('hidden');
  empty.style.display = 'none';

  suppliers.forEach((s) => {
    const card = document.createElement('div');
    card.className = 'supplier-card-admin';
    const logoHtml = s.logo
      ? `<img src="/logos/${escapeAttr(s.logo)}" alt="${escapeHtml(s.name)} logo" style="max-height:36px;max-width:60px;object-fit:contain;margin-right:12px;vertical-align:middle;">`
      : '';
    card.innerHTML =
      '<div class="info" style="display:flex;align-items:center;">' +
      logoHtml +
      '<div>' +
      '<h2 style="margin:0 0 4px 0;font-size:1.15rem;">' + escapeHtml(s.name) + '</h2>' +
      '<p style="margin:0;color:var(--color-text-muted);font-size:0.875rem;">' + s.partCount + ' part' + (s.partCount !== 1 ? 's' : '') + ' &bull; created ' + formatDate(s.created_at) + '</p>' +
      '</div>' +
      '</div>' +
      '<div class="actions">' +
      '<button class="btn-icon" title="View parts" onclick="app.openSupplierParts(' + s.id + ')">&#128065; Parts</button>' +
      '<button class="btn-icon" title="Edit name" onclick="app.editSupplier(' + s.id + ', this)">&#9998; Edit</button>' +
      '<button class="btn-icon" title="Delete" style="color:var(--color-danger);" onclick="app.deleteSupplier(' + s.id + ')">&#10006; Delete</button>' +
      '</div>';
    list.appendChild(card);
  });
}

async function loadDashboard() {
  try {
    const res = await apiRequest('/api/admin/suppliers');
    const suppliers = await res.json();
    allAdminSuppliers = Array.isArray(suppliers) ? suppliers : [];

    // Update Stats
    const statSuppliersEl = document.getElementById('statSupplierCount');
    const statPartsEl = document.getElementById('statPartCount');
    const statWaEl = document.getElementById('statWhatsappNum');

    if (statSuppliersEl) statSuppliersEl.textContent = allAdminSuppliers.length;
    if (statPartsEl) {
      const totalParts = allAdminSuppliers.reduce((sum, s) => sum + (s.partCount || 0), 0);
      statPartsEl.textContent = totalParts;
    }

    // Load WhatsApp status & Inquiry count
    try {
      const setRes = await apiRequest('/api/admin/settings');
      if (setRes.ok) {
        const setData = await setRes.json();
        if (statWaEl) {
          statWaEl.textContent = setData.whatsappNumber ? `+${setData.whatsappNumber}` : 'Not set';
        }
      }
    } catch {}

    try {
      const inqRes = await apiRequest('/api/admin/inquiries');
      if (inqRes.ok) {
        const inqData = await inqRes.json();
        const statInqEl = document.getElementById('statInquiryCount');
        if (statInqEl && Array.isArray(inqData)) {
          statInqEl.textContent = inqData.length;
        }
      }
    } catch {}

    renderAdminSuppliers(allAdminSuppliers);

    // Setup Admin Search
    const searchInput = document.getElementById('adminSupplierSearch');
    if (searchInput) {
      searchInput.oninput = (e) => {
        const q = e.target.value.trim().toLowerCase();
        if (!q) {
          renderAdminSuppliers(allAdminSuppliers);
        } else {
          const filtered = allAdminSuppliers.filter(s => s.name.toLowerCase().includes(q));
          renderAdminSuppliers(filtered);
        }
      };
    }
  } catch (err) {
    console.error('Load dashboard failed:', err);
    showToastMessage('Failed to load suppliers.', 'danger');
  }
}

// Expose methods on window for inline onclick handlers
window.app = {
  openSupplierParts: (id) => openSupplierParts(id),
  editSupplier: (id, btn) => editSupplier(id, btn),
  deleteSupplier: (id) => deleteSupplier(id),
};

async function openSupplierForm(supplier = null) {
  const title = document.getElementById('supplierFormTitle');
  const form = document.getElementById('supplierForm');
  const idInput = document.getElementById('supplierFormId');
  const nameInput = document.getElementById('supplierName');
  const logoSelect = document.getElementById('supplierLogo');
  const logoPreview = document.getElementById('logoPreview');
  const previewLogo = document.getElementById('previewLogo');
  const deleteBtn = document.getElementById('deleteSupplierBtn');

  form.reset();
  idInput.value = '';
  deleteBtn.style.display = 'none';
  logoPreview.style.display = 'none';

  // Populate logo dropdown
  await populateLogoDropdown(logoSelect);

  if (supplier) {
    title.textContent = 'Edit supplier';
    idInput.value = supplier.id;
    nameInput.value = supplier.name;
    deleteBtn.style.display = 'inline-block';
    if (supplier.logo) {
      logoSelect.value = supplier.logo;
      previewLogo.src = '/logos/' + supplier.logo;
      logoPreview.style.display = 'block';
    }
  } else {
    title.textContent = 'Add supplier';
  }

  // Show/hide preview on logo change
  logoSelect.onchange = function () {
    if (logoSelect.value) {
      previewLogo.src = '/logos/' + logoSelect.value;
      logoPreview.style.display = 'block';
    } else {
      logoPreview.style.display = 'none';
    }
  };

  switchView('supplierForm');
}

/**
 * Populate logo dropdown with available logo files from /logos/
 */
async function populateLogoDropdown(selectEl) {
  if (selectEl.options.length > 1) return; // already populated
  try {
    const res = await fetch('/logos/');
    // Directory listing may not be available, so we'll use a hardcoded list
    // based on the known logo files
    const knownLogos = [
      '01_sangsin_brakes.png',
      '02_autolek_filters.png',
      '03_rotex_brake_discs.png',
      '04_mx_mark_xtralife.png',
      '05_ceekay_exedy_clutches.png',
      '06_mavrod_suspension.png',
      '07_tvs_coolants.png',
      '08_mb_techno_rubber.png',
      '09_hl_mando_suspension_brakes.png',
      '10_delphi_engine_oils.png',
      '11_delphi_driveshafts.png',
    ];
    knownLogos.forEach((logo) => {
      const option = document.createElement('option');
      option.value = logo;
      option.textContent = logo.replace(/^\d+_/, '').replace(/\.[^/.]+$/, '');
      selectEl.appendChild(option);
    });
  } catch (err) {
    console.error('Failed to load logos:', err);
  }
}

async function handleSupplierFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('supplierFormId').value;
  const name = document.getElementById('supplierName').value;
  const logo = document.getElementById('supplierLogo').value || null;
  const errorEl = document.getElementById('supplierFormError');
  const btn = document.getElementById('supplierFormSaveBtn');

  errorEl.textContent = '';
  btn.disabled = true;

  try {
    if (id) {
      const res = await apiRequest('/api/admin/suppliers/' + id, {
        method: 'PATCH',
        body: JSON.stringify({ name, logo }),
      });
      if (!res.ok) {
        const data = await res.json();
        errorEl.textContent = data.error || 'Failed to rename supplier.';
        return;
      }
    } else {
      const res = await apiRequest('/api/admin/suppliers', {
        method: 'POST',
        body: JSON.stringify({ name, logo }),
      });
      if (!res.ok) {
        const data = await res.json();
        errorEl.textContent = data.error || 'Failed to add supplier.';
        return;
      }
    }

    showToastMessage('Supplier saved.');
    switchView('dashboard');
    loadDashboard();
  } catch (err) {
    errorEl.textContent = 'An error occurred.';
  } finally {
    btn.disabled = false;
  }
}

async function editSupplier(id, btn) {
  // Fetch supplier details
  try {
    const res = await apiRequest('/api/admin/suppliers');
    const suppliers = await res.json();
    const s = suppliers.find((x) => x.id === id);
    if (s) openSupplierForm(s);
  } catch (err) {
    showToastMessage('Failed to load supplier.', 'danger');
  }
}

async function deleteSupplier(id) {
  const confirmed = await confirmDialog(
    'Delete supplier',
    'Delete this supplier and all its parts? This cannot be undone.'
  );
  if (!confirmed) return;

  try {
    const res = await apiRequest('/api/admin/suppliers/' + id, {
      method: 'DELETE',
    });
    if (!res.ok) {
      showToastMessage('Failed to delete supplier.', 'danger');
      return;
    }
    showToastMessage('Supplier deleted.');
    loadDashboard();
  } catch (err) {
    showToastMessage('Failed to delete supplier.', 'danger');
  }
}

// --- Supplier parts view ---

async function openSupplierParts(id) {
  currentSupplierId = id;
  try {
    const res = await apiRequest('/api/admin/suppliers/' + id + '/parts');
    const data = await res.json();

    document.getElementById('partsPageTitle').textContent = data.supplier.name + ' parts';
    const grid = document.getElementById('partsGrid');
    const empty = document.getElementById('partsEmpty');
    grid.innerHTML = '';

    if (!data.parts || data.parts.length === 0) {
      empty.classList.remove('hidden');
      empty.style.display = 'block';
      return;
    }
    empty.classList.add('hidden');
    empty.style.display = 'none';

    data.parts.forEach((part) => {
      const vehicles = typeof part.vehicles === 'string' ? JSON.parse(part.vehicles) : part.vehicles;
      const card = document.createElement('div');
      card.className = 'admin-part-card';
      const imageUrl = part.imageUrl;
      card.innerHTML =
        '<div>' +
        '<img src="' + escapeAttr(imageUrl) + '" alt="Part photo" onerror="this.src=\'\';this.style.background=\'var(--color-bg)\';this.textContent=\'No image\'">' +
        '</div>' +
        '<div class="info">' +
        '<h3>' + escapeHtml(part.name || 'Part #' + part.id) + '</h3>' +
        '<p>' + vehicles.join(', ') + '</p>' +
        '</div>' +
        '<div class="actions">' +
        '<button class="btn-icon" title="Edit" onclick="app.editPart(' + part.id + ')">&#9998;</button>' +
        '<button class="btn-icon" title="Delete" style="color:var(--color-danger);" onclick="app.deletePart(' + part.id + ')">&#10006;</button>' +
        '</div>';
      grid.appendChild(card);
    });

    switchView('supplierParts');
  } catch (err) {
    console.error('Load parts failed:', err);
    showToastMessage('Failed to load parts.', 'danger');
  }
}

window.app.editPart = (id) => openPartForm(id);
window.app.deletePart = (id) => deletePart(id);

async function openPartForm(partId = null) {
  const form = document.getElementById('partForm');
  const title = document.getElementById('partFormTitle');
  const idInput = document.getElementById('partFormId');
  const supplierIdInput = document.getElementById('partFormSupplierId');
  const nameInput = document.getElementById('partName');
  const vehicleInput = document.getElementById('vehicleInput');
  const imageInput = document.getElementById('partImage');
  const imagePreview = document.getElementById('imagePreview');
  const previewImage = document.getElementById('previewImage');
  const changePhotoBtn = document.getElementById('changePhotoBtn');
  const deleteBtn = document.getElementById('deletePartBtn');

  form.reset();
  tags = [];
  updateTagUI();
  idInput.value = '';
  supplierIdInput.value = currentSupplierId;
  nameInput.value = '';
  partImageFile = null;
  currentPartImage = null;
  imagePreview.style.display = 'none';
  changePhotoBtn.style.display = 'none';
  deleteBtn.style.display = 'none';
  imageInput.value = '';
  previewImage.src = '';

  if (partId) {
    title.textContent = 'Edit part';
    try {
      const res = await apiRequest('/api/admin/suppliers/' + currentSupplierId + '/parts');
      const data = await res.json();
      const part = data.parts.find((p) => p.id === partId);
      if (part) {
        idInput.value = part.id;
        currentPartImage = part.image;
        nameInput.value = part.name || '';
        const vehicles = typeof part.vehicles === 'string' ? JSON.parse(part.vehicles) : part.vehicles;
        tags = [...vehicles];
        updateTagUI();

        const imageUrl = part.imageUrl;
        previewImage.src = imageUrl;
        imagePreview.style.display = 'block';
        changePhotoBtn.style.display = 'inline-block';
        deleteBtn.style.display = 'inline-block';
      }
    } catch (err) {
      showToastMessage('Failed to load part.', 'danger');
    }
  } else {
    title.textContent = 'Add part';
  }

  switchView('partForm');
}

async function handlePartFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('partFormId').value;
  const name = document.getElementById('partName').value;
  const errorEl = document.getElementById('partFormError');
  const btn = document.getElementById('partFormSaveBtn');

  errorEl.textContent = '';
  btn.disabled = true;

  // Validate: image required for new part
  if (!id && !partImageFile) {
    errorEl.textContent = 'A photo is required.';
    btn.disabled = false;
    return;
  }
  // Validate: at least one vehicle
  if (tags.length === 0) {
    errorEl.textContent = 'Add at least one compatible vehicle.';
    btn.disabled = false;
    return;
  }

  const formData = new FormData();
  if (partImageFile) {
    formData.append('image', partImageFile);
  }
  formData.append('vehicles', JSON.stringify(tags));
  if (name) formData.append('name', name);

  try {
    const path = id
      ? '/api/admin/parts/' + id
      : '/api/admin/suppliers/' + currentSupplierId + '/parts';

    const res = await apiRequest(path, {
      method: id ? 'PATCH' : 'POST',
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      errorEl.textContent = data.error || 'Failed to save part.';
      return;
    }

    showToastMessage('Part saved.');
    switchView('supplierParts');
    openSupplierParts(currentSupplierId);
  } catch (err) {
    errorEl.textContent = 'An error occurred.';
  } finally {
    btn.disabled = false;
  }
}

async function deletePart(id) {
  const confirmed = await confirmDialog(
    'Delete part',
    'Delete this part and its photo? This cannot be undone.'
  );
  if (!confirmed) return;

  try {
    const res = await apiRequest('/api/admin/parts/' + id, {
      method: 'DELETE',
    });
    if (!res.ok) {
      showToastMessage('Failed to delete part.', 'danger');
      return;
    }
    showToastMessage('Part deleted.');
    openSupplierParts(currentSupplierId);
  } catch (err) {
    showToastMessage('Failed to delete part.', 'danger');
  }
}

// --- Vehicle tag input ---

function updateTagUI() {
  const tagInput = document.getElementById('tagInput');
  // Clear existing chips (keep the input)
  const chips = tagInput.querySelectorAll('.tag-chip');
  chips.forEach((c) => c.remove());

  tags.forEach((tag) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.textContent = tag;
    const removeBtn = document.createElement('button');
    removeBtn.className = 'tag-remove';
    removeBtn.textContent = '&#215;';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      tags = tags.filter((t) => t !== tag);
      updateTagUI();
      document.getElementById('vehicleInput').focus();
    });
    chip.appendChild(removeBtn);
    tagInput.insertBefore(chip, tagInput.querySelector('input'));
  });
}

async function handleVehicleInput() {
  const q = document.getElementById('vehicleInput').value.trim();
  const suggestionsEl = document.getElementById('tagSuggestions');

  if (q.length < 2) {
    suggestionsEl.classList.remove('open');
    return;
  }

  try {
    const res = await fetch(`${API}/api/admin/vehicles/suggest?q=${encodeURIComponent(q)}`);
    const suggestions = await res.json();

    suggestionsEl.innerHTML = '';
    suggestions.forEach((s) => {
      if (tags.includes(s)) return;
      const div = document.createElement('div');
      div.className = 'tag-suggestion';
      div.textContent = s;
      div.addEventListener('click', () => {
        addTag(s);
        suggestionsEl.classList.remove('open');
        document.getElementById('vehicleInput').value = '';
      });
      suggestionsEl.appendChild(div);
    });

    if (suggestionsEl.children.length > 0) {
      suggestionsEl.classList.add('open');
    } else {
      suggestionsEl.classList.remove('open');
    }
  } catch (err) {
    suggestionsEl.classList.remove('open');
  }
}

function handleVehicleKeydown(e) {
  const input = document.getElementById('vehicleInput');
  const val = input.value.trim();

  if (e.key === 'Enter') {
    e.preventDefault();
    if (val) addTag(val);
    input.value = '';
    document.getElementById('tagSuggestions').classList.remove('open');
  } else if (e.key === ',' && val) {
    e.preventDefault();
    addTag(val);
    input.value = '';
    document.getElementById('tagSuggestions').classList.remove('open');
  } else if (e.key === 'Backspace' && !val && tags.length > 0) {
    e.preventDefault();
    tags.pop();
    updateTagUI();
  }
}

function addTag(tag) {
  const trimmed = tag.trim();
  if (!trimmed || tags.includes(trimmed)) return;
  tags.push(trimmed);
  updateTagUI();
}

// --- Settings ---

async function loadSettings() {
  try {
    const res = await apiRequest('/api/admin/settings');
    const data = await res.json();
    document.getElementById('businessName').value = data.businessName || '';
    document.getElementById('whatsappNumber').value = data.whatsappNumber || '';
  } catch (err) {
    showToastMessage('Failed to load settings.', 'danger');
  }
}

async function handleSettingsFormSubmit(e) {
  e.preventDefault();
  const businessName = document.getElementById('businessName').value;
  const whatsappNumber = document.getElementById('whatsappNumber').value;
  const errorEl = document.getElementById('settingsError');
  const btn = e.target.querySelector('button[type="submit"]');

  errorEl.textContent = '';
  btn.disabled = true;

  try {
    const res = await apiRequest('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ businessName, whatsappNumber }),
    });
    if (!res.ok) {
      const data = await res.json();
      // Map field errors
      if (data.error) errorEl.textContent = data.error;
      return;
    }
    showToastMessage('Settings saved.');
  } catch (err) {
    errorEl.textContent = 'Failed to save settings.';
  } finally {
    btn.disabled = false;
  }
}

// --- Inquiries (Leads) ---

async function loadInquiries() {
  const container = document.getElementById('inquiriesList');
  const empty = document.getElementById('inquiriesEmpty');
  if (!container) return;

  try {
    const res = await apiRequest('/api/admin/inquiries');
    if (!res.ok) throw new Error('Failed to load enquiries');
    const data = await res.json();

    const statCount = document.getElementById('statInquiryCount');
    if (statCount && Array.isArray(data)) statCount.textContent = data.length;

    container.innerHTML = '';
    if (!data || data.length === 0) {
      if (empty) {
        empty.classList.remove('hidden');
        empty.style.display = 'block';
      }
      return;
    }
    if (empty) {
      empty.classList.add('hidden');
      empty.style.display = 'none';
    }

    data.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'supplier-card-admin';
      card.style.display = 'flex';
      card.style.justifyContent = 'space-between';
      card.style.alignItems = 'flex-start';

      const typeBadgeColor = item.enquiry_type === 'Wholesale Enquiry' ? '#2563EB' : item.enquiry_type === 'Brand And Availability Enquiry' ? '#7C3AED' : '#059669';
      const cleanPhone = String(item.phone || '').replace(/\D/g, '');
      const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : '#';

      card.innerHTML = `
        <div class="info" style="flex:1;">
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:6px;">
            <h2 style="margin:0;font-size:1.15rem;">${escapeHtml(item.name || 'Customer')}</h2>
            <span style="font-size:0.75rem;font-weight:700;padding:2px 8px;border-radius:12px;background:${typeBadgeColor}15;color:${typeBadgeColor};border:1px solid ${typeBadgeColor}40;">
              ${escapeHtml(item.enquiry_type || 'Retail Enquiry')}
            </span>
            <span style="font-size:0.8rem;color:var(--color-text-muted);">${formatDate(item.created_at)}</span>
          </div>
          <p style="margin:4px 0;font-size:0.92rem;color:var(--color-text);">
            <strong>Phone:</strong> <a href="tel:${escapeAttr(item.phone)}" style="color:var(--color-focus);font-weight:600;">${escapeHtml(item.phone)}</a>
            &bull;
            <a href="${escapeAttr(waLink)}" target="_blank" style="color:var(--color-whatsapp);font-weight:600;margin-left:4px;">Open WhatsApp &rarr;</a>
          </p>
          <p style="margin:4px 0;font-size:0.88rem;color:var(--color-text-muted);">
            <strong>Brand:</strong> ${escapeHtml(item.brand)} &bull; <strong>Vehicle:</strong> ${escapeHtml(item.vehicle)}
            ${item.part ? `&bull; <strong>Part:</strong> ${escapeHtml(item.part)}` : ''}
          </p>
        </div>
        <div class="actions" style="margin-left:16px;">
          <button class="btn-icon" title="Delete enquiry" style="color:var(--color-danger);font-size:1.1rem;background:none;border:none;cursor:pointer;" onclick="app.deleteInquiry(${item.id})">&#10006;</button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    showToastMessage('Failed to load enquiries.', 'danger');
  }
}

window.app.deleteInquiry = async function (id) {
  const confirmed = await confirmDialog('Delete enquiry', 'Remove this customer lead permanently?');
  if (!confirmed) return;
  try {
    const res = await apiRequest(`/api/admin/inquiries/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    showToastMessage('Enquiry removed.');
    loadInquiries();
  } catch {
    showToastMessage('Failed to delete enquiry.', 'danger');
  }
};

// --- Utilities ---

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return String(text).replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}
