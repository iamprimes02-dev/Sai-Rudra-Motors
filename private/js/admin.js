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
let supplierLogoFile = null; // File object for custom supplier logo
let currentEditSupplierLogo = null; // Existing supplier logo URL or filename
let tags = []; // Current vehicle tags

// Global bridge for inline event handlers (declared upfront)
window.app = {
  openSupplierParts: (id) => openSupplierParts(id),
  editSupplier: (id, btn) => editSupplier(id, btn),
  deleteSupplier: (id) => deleteSupplier(id),
  editPart: (id) => openPartForm(id),
  deletePart: (id) => deletePart(id),
};

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

  // Supplier Logo File Upload & Drag-and-Drop
  const logoUploadBox = document.getElementById('logoUploadBox');
  const supplierLogoFileInput = document.getElementById('supplierLogoFile');
  const removeLogoBtn = document.getElementById('removeLogoBtn');

  if (logoUploadBox && supplierLogoFileInput) {
    logoUploadBox.addEventListener('click', () => supplierLogoFileInput.click());

    logoUploadBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      logoUploadBox.style.borderColor = 'var(--color-primary)';
      logoUploadBox.style.background = 'rgba(0,102,255,0.04)';
    });
    logoUploadBox.addEventListener('dragleave', () => {
      logoUploadBox.style.borderColor = 'var(--color-border)';
      logoUploadBox.style.background = 'var(--color-surface)';
    });
    logoUploadBox.addEventListener('drop', (e) => {
      e.preventDefault();
      logoUploadBox.style.borderColor = 'var(--color-border)';
      logoUploadBox.style.background = 'var(--color-surface)';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleSupplierLogoFile(e.dataTransfer.files[0]);
      }
    });

    supplierLogoFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleSupplierLogoFile(e.target.files[0]);
      }
    });
  }

  if (removeLogoBtn) {
    removeLogoBtn.addEventListener('click', () => {
      supplierLogoFile = null;
      currentEditSupplierLogo = null;
      if (supplierLogoFileInput) supplierLogoFileInput.value = '';
      const logoSelect = document.getElementById('supplierLogo');
      if (logoSelect) logoSelect.value = '';
      const logoPreview = document.getElementById('logoPreview');
      if (logoPreview) logoPreview.style.display = 'none';
      const uploadText = document.getElementById('logoUploadText');
      if (uploadText) uploadText.textContent = 'Click or Drag & Drop to upload local logo file';
    });
  }

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

  // Keyboard accessibility for stat cards
  document.querySelectorAll('.stat-card[role="button"]').forEach((card) => {
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Keyboard accessibility for upload boxes
  if (logoUploadBox && supplierLogoFileInput) {
    logoUploadBox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        supplierLogoFileInput.click();
      }
    });
  }
  if (imagePicker && partImageInput) {
    imagePicker.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        partImageInput.click();
      }
    });
  }

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

function getView(name) {
  const map = {
    dashboard: 'viewDashboard',
    supplierForm: 'viewSupplierForm',
    supplierParts: 'viewSupplierParts',
    partForm: 'viewPartForm',
    settings: 'viewSettings',
    inquiries: 'viewInquiries',
  };
  return document.getElementById(map[name] || name);
}

function switchView(viewName) {
  const allViewIds = [
    'viewDashboard',
    'viewSupplierForm',
    'viewSupplierParts',
    'viewPartForm',
    'viewSettings',
    'viewInquiries',
  ];

  allViewIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('active');
      el.classList.add('hidden');
      el.style.display = 'none';
    }
  });

  document.querySelectorAll('.admin-nav .nav-link').forEach((l) => l.classList.remove('active'));
  const link = document.querySelector('.admin-nav .nav-link[data-view="' + viewName + '"]');
  if (link) link.classList.add('active');

  const target = getView(viewName);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
    target.style.display = 'block';
  }

  // Auto-fetch data for the activated view
  if (viewName === 'inquiries') loadInquiries();
  if (viewName === 'settings') loadSettings();
  if (viewName === 'dashboard') loadDashboard();

  // Scroll to top
  const container = document.querySelector('.admin-container');
  if (container) container.scrollTop = 0;
}

window.switchView = switchView;
window.app.switchView = switchView;

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
    const rawLogo = s.logoUrl || s.logo;
    const logoSrc = rawLogo
      ? (rawLogo.startsWith('http') || rawLogo.startsWith('data:') ? rawLogo : (rawLogo.startsWith('/') ? rawLogo : `/logos/${rawLogo}`))
      : null;
    const logoHtml = logoSrc
      ? `<div class="admin-logo-pedestal"><img src="${escapeAttr(logoSrc)}" alt="${escapeHtml(s.name)} logo"></div>`
      : `<div class="admin-logo-pedestal admin-logo-fallback"><span>${escapeHtml(s.name.slice(0, 2).toUpperCase())}</span></div>`;
    card.innerHTML = `
      <div class="info" style="display:flex;align-items:center;gap:16px;">
        ${logoHtml}
        <div>
          <h2 style="margin:0 0 4px 0;font-size:1.15rem;font-weight:700;">${escapeHtml(s.name)}</h2>
          ${s.description ? `<p style="margin:0 0 6px 0;font-size:0.84rem;color:var(--color-text-muted);max-width:550px;line-height:1.4;">${escapeHtml(s.description)}</p>` : ''}
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="admin-category-badge">${escapeHtml(s.category || 'Auto Spares')}</span>
            <span class="admin-part-count-badge">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              ${s.partCount} ${s.partCount === 1 ? 'part' : 'parts'}
            </span>
            <span style="font-size:0.8rem;color:var(--color-text-muted);">&bull; Added ${formatDate(s.created_at)}</span>
          </div>
        </div>
      </div>
      <div class="actions">
        <a href="/supplier/${s.id}" target="_blank" class="admin-action-btn" title="View brand on live customer website" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          <span>Live ↗</span>
        </a>
        <button class="admin-action-btn btn-parts" title="View Parts Inventory" onclick="app.openSupplierParts(${s.id})">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          <span>Parts</span>
        </button>
        <button class="admin-action-btn btn-edit" title="Edit Brand Details" onclick="app.editSupplier(${s.id}, this)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          <span>Edit</span>
        </button>
        <button class="admin-action-btn btn-delete" title="Delete Supplier" onclick="app.deleteSupplier(${s.id})">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          <span>Delete</span>
        </button>
      </div>`;
    list.appendChild(card);
  });
}

async function loadDashboard() {
  try {
    const [supResult, setResult, inqResult] = await Promise.allSettled([
      apiRequest('/api/admin/suppliers'),
      apiRequest('/api/admin/settings'),
      apiRequest('/api/admin/inquiries'),
    ]);

    let suppliers = [];
    if (supResult.status === 'fulfilled' && supResult.value.ok) {
      suppliers = await supResult.value.json();
    }
    allAdminSuppliers = Array.isArray(suppliers) ? suppliers : [];

    // Update Stats
    const statSuppliersEl = document.getElementById('statSupplierCount');
    const statPartsEl = document.getElementById('statPartCount');
    const statWaEl = document.getElementById('statWhatsappNum');
    const statInqEl = document.getElementById('statInquiryCount');

    if (statSuppliersEl) statSuppliersEl.textContent = allAdminSuppliers.length;
    if (statPartsEl) {
      const totalParts = allAdminSuppliers.reduce((sum, s) => sum + (s.partCount || 0), 0);
      statPartsEl.textContent = totalParts;
    }

    if (setResult.status === 'fulfilled' && setResult.value.ok) {
      try {
        const setData = await setResult.value.json();
        if (statWaEl) {
          statWaEl.textContent = formatPhoneDisplay(setData.whatsappNumber);
          statWaEl.title = setData.whatsappNumber ? `+${setData.whatsappNumber}` : 'Not set';
        }
      } catch {}
    }

    if (inqResult.status === 'fulfilled' && inqResult.value.ok) {
      try {
        const inqData = await inqResult.value.json();
        if (statInqEl && Array.isArray(inqData)) {
          statInqEl.textContent = inqData.length;
        }
      } catch {}
    }

    renderAdminSuppliers(allAdminSuppliers);

    // Setup Admin Search with debounce & multi-field matching
    const searchInput = document.getElementById('adminSupplierSearch');
    if (searchInput) {
      let debounceTimer = null;
      searchInput.oninput = (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const q = e.target.value.trim().toLowerCase();
          if (!q) {
            renderAdminSuppliers(allAdminSuppliers);
          } else {
            const filtered = allAdminSuppliers.filter((s) => {
              const nameMatch = s.name && s.name.toLowerCase().includes(q);
              const catMatch = s.category && s.category.toLowerCase().includes(q);
              const descMatch = s.description && s.description.toLowerCase().includes(q);
              return nameMatch || catMatch || descMatch;
            });
            renderAdminSuppliers(filtered);
          }
        }, 60);
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

function handleSupplierLogoFile(file) {
  supplierLogoFile = file;
  const url = URL.createObjectURL(file);
  const previewLogo = document.getElementById('previewLogo');
  const logoPreview = document.getElementById('logoPreview');
  const logoSelect = document.getElementById('supplierLogo');
  const uploadText = document.getElementById('logoUploadText');

  if (previewLogo) previewLogo.src = url;
  if (logoPreview) logoPreview.style.display = 'block';
  if (logoSelect) logoSelect.value = '';
  if (uploadText) uploadText.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
}

async function openSupplierForm(supplier = null) {
  const title = document.getElementById('supplierFormTitle');
  const form = document.getElementById('supplierForm');
  const idInput = document.getElementById('supplierFormId');
  const nameInput = document.getElementById('supplierName');
  const catInput = document.getElementById('supplierCategory');
  const descInput = document.getElementById('supplierDescription');
  const logoSelect = document.getElementById('supplierLogo');
  const logoPreview = document.getElementById('logoPreview');
  const previewLogo = document.getElementById('previewLogo');
  const deleteBtn = document.getElementById('deleteSupplierBtn');
  const fileInput = document.getElementById('supplierLogoFile');
  const uploadText = document.getElementById('logoUploadText');

  form.reset();
  idInput.value = '';
  supplierLogoFile = null;
  currentEditSupplierLogo = null;
  if (fileInput) fileInput.value = '';
  if (uploadText) uploadText.textContent = 'Click or Drag & Drop to upload local logo file';
  if (catInput) catInput.value = 'Auto Spares';
  if (descInput) descInput.value = '';
  deleteBtn.style.display = 'none';
  logoPreview.style.display = 'none';

  // Populate logo dropdown
  await populateLogoDropdown(logoSelect);

  if (supplier) {
    title.textContent = 'Edit supplier';
    idInput.value = supplier.id;
    nameInput.value = supplier.name;
    if (catInput) catInput.value = supplier.category || 'Auto Spares';
    if (descInput) descInput.value = supplier.description || '';
    currentEditSupplierLogo = supplier.logo || null;
    deleteBtn.style.display = 'inline-block';

    const rawLogo = supplier.logoUrl || supplier.logo;
    if (rawLogo) {
      const src = rawLogo.startsWith('http') || rawLogo.startsWith('data:')
        ? rawLogo
        : (rawLogo.startsWith('/') ? rawLogo : '/logos/' + rawLogo);
      previewLogo.src = src;
      logoPreview.style.display = 'block';

      const hasOption = Array.from(logoSelect.options).some(o => o.value && o.value === supplier.logo);
      if (hasOption) {
        logoSelect.value = supplier.logo;
      } else {
        logoSelect.value = '';
        if (uploadText) uploadText.textContent = 'Active: Custom logo uploaded';
      }
    }
  } else {
    title.textContent = 'Add supplier';
  }

  // Show/hide preview on preset logo change
  logoSelect.onchange = function () {
    if (logoSelect.value) {
      supplierLogoFile = null;
      if (fileInput) fileInput.value = '';
      previewLogo.src = '/logos/' + logoSelect.value;
      logoPreview.style.display = 'block';
      if (uploadText) uploadText.textContent = 'Preset selected: ' + logoSelect.options[logoSelect.selectedIndex].text;
    } else {
      if (!supplierLogoFile && !currentEditSupplierLogo) {
        logoPreview.style.display = 'none';
      }
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
  const catInput = document.getElementById('supplierCategory');
  const category = catInput ? catInput.value.trim() : 'Auto Spares';
  const descInput = document.getElementById('supplierDescription');
  const description = descInput ? descInput.value.trim() : '';
  const logoSelect = document.getElementById('supplierLogo');
  const logoPreview = document.getElementById('logoPreview');
  const errorEl = document.getElementById('supplierFormError');
  const btn = document.getElementById('supplierFormSaveBtn');

  errorEl.textContent = '';
  btn.disabled = true;

  try {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category || 'Auto Spares');
    formData.append('description', description);

    if (supplierLogoFile) {
      formData.append('logoFile', supplierLogoFile);
    } else {
      const isRemoved = logoPreview.style.display === 'none';
      const logoVal = isRemoved ? '' : (logoSelect.value || currentEditSupplierLogo || '');
      formData.append('logo', logoVal);
    }

    const path = id ? '/api/admin/suppliers/' + id : '/api/admin/suppliers';
    const res = await apiRequest(path, {
      method: id ? 'PATCH' : 'POST',
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      errorEl.textContent = data.error || 'Failed to save supplier.';
      return;
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
  switchView('supplierParts');

  const titleEl = document.getElementById('partsPageTitle');
  const grid = document.getElementById('partsGrid');
  const empty = document.getElementById('partsEmpty');
  const liveBtn = document.getElementById('viewLiveCatalogueBtn');

  if (liveBtn) liveBtn.href = '/supplier/' + id;

  if (titleEl) titleEl.textContent = 'Loading parts...';
  if (grid) grid.innerHTML = '';
  if (empty) {
    empty.classList.add('hidden');
    empty.style.display = 'none';
  }

  try {
    const res = await apiRequest('/api/admin/suppliers/' + id + '/parts');
    const data = await res.json();

    if (titleEl) {
      titleEl.textContent = (data.supplier && data.supplier.name ? data.supplier.name : 'Supplier') + ' parts';
    }

    if (!data.parts || data.parts.length === 0) {
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

    data.parts.forEach((part) => {
      const vehicles = typeof part.vehicles === 'string' ? JSON.parse(part.vehicles) : part.vehicles;
      const card = document.createElement('div');
      card.className = 'admin-part-card';
      const imageUrl = part.imageUrl;
      const vehicleTagsHtml = (vehicles || []).map(v => `<span class="admin-vehicle-pill">${escapeHtml(v)}</span>`).join('');
      card.innerHTML = `
        <div class="admin-part-pedestal">
          <img src="${escapeAttr(imageUrl)}" alt="Part photo" onerror="this.src='';this.style.background='var(--color-bg)';this.textContent='No image'">
        </div>
        <div class="info">
          <h3>${escapeHtml(part.name || 'Part #' + part.id)}</h3>
          <div class="admin-part-vehicles-wrap">${vehicleTagsHtml}</div>
        </div>
        <div class="actions">
          <button class="admin-action-btn btn-edit" title="Edit Part" onclick="app.editPart(${part.id})">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            <span>Edit</span>
          </button>
          <button class="admin-action-btn btn-delete" title="Delete Part" onclick="app.deletePart(${part.id})">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>Delete</span>
          </button>
        </div>`;
      grid.appendChild(card);
    });
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
    const bName = document.getElementById('businessName');
    const waNum = document.getElementById('whatsappNumber');
    if (bName) bName.value = data.businessName || 'Sai Rudra Motors';
    if (waNum) {
      const raw = data.whatsappNumber || '';
      // Display clean 10-digit number directly if it has Indian 91 country prefix
      if (raw.length === 12 && raw.startsWith('91')) {
        waNum.value = raw.slice(2);
      } else {
        waNum.value = raw;
      }
    }
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
    const saved = await res.json();
    const statWaEl = document.getElementById('statWhatsappNum');
    if (statWaEl && saved.whatsappNumber) {
      statWaEl.textContent = formatPhoneDisplay(saved.whatsappNumber);
      statWaEl.title = `+${saved.whatsappNumber}`;
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
      card.className = 'inquiry-card';

      const typeClass = item.enquiry_type === 'Wholesale Enquiry'
        ? 'type-wholesale'
        : (item.enquiry_type === 'Brand And Availability Enquiry' ? 'type-brand' : 'type-retail');
      const cleanPhone = String(item.phone || '').replace(/\D/g, '');
      const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : '#';

      card.innerHTML = `
        <div class="inquiry-header">
          <div class="inquiry-title-wrap">
            <h3 class="inquiry-customer-name">${escapeHtml(item.name || 'Customer')}</h3>
            <span class="inquiry-type-pill ${typeClass}">
              ${escapeHtml(item.enquiry_type || 'Retail Enquiry')}
            </span>
          </div>
          <span class="inquiry-date">${formatDate(item.created_at)}</span>
        </div>
        <div class="inquiry-meta-grid">
          <div class="inquiry-meta-item">
            <span class="meta-label">Phone:</span>
            <a href="tel:${escapeAttr(item.phone)}" class="meta-phone-link">${escapeHtml(item.phone)}</a>
            <a href="${escapeAttr(waLink)}" target="_blank" rel="noopener noreferrer" class="inquiry-wa-pill">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/></svg>
              Chat
            </a>
          </div>
          <div class="inquiry-meta-item">
            <span class="meta-label">Brand:</span>
            <span class="meta-val">${escapeHtml(item.brand || '—')}</span>
          </div>
          <div class="inquiry-meta-item">
            <span class="meta-label">Vehicle:</span>
            <span class="meta-val">${escapeHtml(item.vehicle || '—')}</span>
          </div>
          ${item.part ? `
          <div class="inquiry-meta-item">
            <span class="meta-label">Part:</span>
            <span class="meta-val">${escapeHtml(item.part)}</span>
          </div>` : ''}
        </div>
        <div class="inquiry-actions">
          <button type="button" class="admin-action-btn btn-delete" title="Delete enquiry" onclick="app.deleteInquiry(${item.id})">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>Delete</span>
          </button>
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

function formatPhoneDisplay(num) {
  if (!num) return 'Not set';
  const clean = String(num).replace(/\D/g, '');
  if (clean.length === 12 && clean.startsWith('91')) {
    return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
  } else if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return clean ? `+${clean}` : 'Not set';
}
