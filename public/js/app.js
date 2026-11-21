// Sai Rudra Motors - Corporate Frontend Engine
// Handles brand showcase, logo rendering, live search, category tab filtering, and WhatsApp contact.

'use strict';

const API = window.location.origin;

// Official 11 brand suppliers fallback with logo references
const OFFICIAL_DISTRIBUTORS = [
  {
    id: 1,
    name: 'Sangsin Brakes',
    logo: '01_sangsin_brakes.png',
    category: 'braking',
    categoryLabel: 'Braking Systems',
    description: 'Leading OEM & OES brake pads, brake shoes, and commercial friction materials.',
    partCount: 0,
    logoUrl: '/logos/01_sangsin_brakes.png'
  },
  {
    id: 2,
    name: 'Autolek Filters',
    logo: '02_autolek_filters.png',
    category: 'filtration',
    categoryLabel: 'Filtration Systems',
    description: 'High-performance engine oil, air, cabin, and fuel filtration elements.',
    partCount: 0,
    logoUrl: '/logos/02_autolek_filters.png'
  },
  {
    id: 3,
    name: 'Rotex Brake Discs',
    logo: '03_rotex_brake_discs.png',
    category: 'braking',
    categoryLabel: 'Braking Systems',
    description: 'Ventilated and solid precision brake discs and rotors with superior heat dissipation.',
    partCount: 0,
    logoUrl: '/logos/03_rotex_brake_discs.png'
  },
  {
    id: 4,
    name: 'MX Mark Xtralife',
    logo: '04_mx_mark_xtralife.png',
    category: 'electrical',
    categoryLabel: 'Auto Components',
    description: 'Long-life, high-reliability automotive electrical, ignition, and mechanical spares.',
    partCount: 0,
    logoUrl: '/logos/04_mx_mark_xtralife.png'
  },
  {
    id: 5,
    name: 'Ceekay Exedy Clutches',
    logo: '05_ceekay_exedy_clutches.png',
    category: 'clutch',
    categoryLabel: 'Clutch & Transmission',
    description: 'Genuine OEM clutch plates, clutch cover assemblies, and release bearings.',
    partCount: 0,
    logoUrl: '/logos/05_ceekay_exedy_clutches.png'
  },
  {
    id: 6,
    name: 'Mavrod Suspension',
    logo: '06_mavrod_suspension.png',
    category: 'suspension',
    categoryLabel: 'Suspension & Steering',
    description: 'Gas-charged shock absorbers, strut assemblies, and heavy-duty suspension kits.',
    partCount: 0,
    logoUrl: '/logos/06_mavrod_suspension.png'
  },
  {
    id: 7,
    name: 'TVS Coolants',
    logo: '07_tvs_coolants.png',
    category: 'fluids',
    categoryLabel: 'Fluids & Lubricants',
    description: 'High-grade anti-freeze engine radiator coolants and heat-transfer fluids.',
    partCount: 0,
    logoUrl: '/logos/07_tvs_coolants.png'
  },
  {
    id: 8,
    name: 'MB Techno Rubber',
    logo: '08_mb_techno_rubber.png',
    category: 'rubber',
    categoryLabel: 'Rubber Components',
    description: 'Anti-vibration suspension bushings, engine mounts, bellows, and steering boots.',
    partCount: 0,
    logoUrl: '/logos/08_mb_techno_rubber.png'
  },
  {
    id: 9,
    name: 'HL Mando Suspension & Brakes',
    logo: '09_hl_mando_suspension_brakes.png',
    category: 'suspension',
    categoryLabel: 'Steering & Suspension',
    description: 'OEM steering gearboxes, steering columns, shock absorbers, and calipers.',
    partCount: 0,
    logoUrl: '/logos/09_hl_mando_suspension_brakes.png'
  },
  {
    id: 10,
    name: 'Delphi Engine Oils',
    logo: '10_delphi_engine_oils.png',
    category: 'fluids',
    categoryLabel: 'Fluids & Lubricants',
    description: 'Advanced fully synthetic and semi-synthetic motor oils for petrol & diesel engines.',
    partCount: 0,
    logoUrl: '/logos/10_delphi_engine_oils.png'
  },
  {
    id: 11,
    name: 'Delphi Driveshafts',
    logo: '11_delphi_driveshafts.png',
    category: 'clutch',
    categoryLabel: 'Drivetrain & Axles',
    description: 'Complete constant velocity (CV) drive axles, CV joints, and heavy-duty boots.',
    partCount: 0,
    logoUrl: '/logos/11_delphi_driveshafts.png'
  }
];

// Sanitization
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function escapeAttr(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/"/g, '&quot;');
}

// WhatsApp Utilities
let whatsappNumber = '918660957903';

function buildGeneralMessage() {
  return (
    'Hello Sai Rudra Motors Distributors,\n' +
    'I would like to inquire about automotive spare parts availability.\n' +
    'Please connect me with the sales depot.'
  );
}

function buildBrandInquiryMessage(brandName) {
  return (
    'Hello Sai Rudra Motors Distributors,\n' +
    'I would like to inquire about genuine parts for ' + brandName + '.\n' +
    'Please let me know about current stock and pricing for my vehicle.'
  );
}

function buildPartMessage(supplier, partNameOrRef, vehicles) {
  const vehicleList = Array.isArray(vehicles) ? vehicles.join(', ') : String(vehicles || '');
  return (
    'Hello Sai Rudra Motors Distributors,\n' +
    'I would like to check availability for this part:\n\n' +
    '• Brand: ' + supplier + '\n' +
    '• Part: ' + partNameOrRef + '\n' +
    '• Compatible Vehicles: ' + vehicleList + '\n\n' +
    'Please advise availability and dispatch time. Thank you.'
  );
}

function buildContactLink(number, message) {
  if (!number) return null;
  const cleanNumber = String(number).replace(/\D/g, '');
  return 'https://wa.me/' + encodeURIComponent(cleanNumber) + '?text=' + encodeURIComponent(message);
}

async function fetchJson(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error('API error: ' + res.status);
  return res.json();
}

function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast toast-' + type + ' show';
  setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// Config Loader
async function loadConfig() {
  try {
    const config = await fetchJson('/api/config');
    if (config.whatsappNumber) {
      whatsappNumber = config.whatsappNumber;
    }
  } catch (err) {
    console.warn('Using default business config:', err.message);
  }

  // Setup header contact buttons
  const headerBtns = document.querySelectorAll('[data-contact-btn="header"]');
  headerBtns.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const link = buildContactLink(whatsappNumber, buildGeneralMessage());
      if (link) window.open(link, '_blank', 'noopener,noreferrer');
    };
  });
}

// Fullscreen Image Viewer Modal
function initImageViewer() {
  const viewer = document.getElementById('imageViewer');
  const viewerImg = document.getElementById('viewerImage');
  const closeBtn = document.getElementById('closeViewer');

  if (!viewer || !viewerImg) return;

  function closeViewer() {
    viewer.classList.remove('open');
    viewerImg.src = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeViewer);

  viewer.addEventListener('click', (e) => {
    if (e.target === viewer || e.target === closeBtn) closeViewer();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && viewer.classList.contains('open')) {
      closeViewer();
    }
  });

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-view]');
    if (trigger) {
      const src = trigger.getAttribute('data-view');
      const alt = trigger.getAttribute('data-view-alt') || 'Part Image';
      if (src) {
        viewerImg.src = src;
        viewerImg.alt = alt;
        viewer.classList.add('open');
      }
    }
  });
}

// Part Card Contact Button Generator (Used by supplier.js)
function makePartContactBtn(partId, supplier, partNameOrRef, vehicles) {
  const btn = document.createElement('button');
  btn.className = 'contact-part-btn';
  btn.type = 'button';
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.57.12-.17.25-.66.81-.81.98-.15.17-.3.19-.55.07-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.57-1.37-.78-1.87-.2-.5-.42-.43-.57-.44l-.49-.01c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.42 1.02 2.59.12.17 1.77 2.7 4.28 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29z"/></svg>
    <span>Check Availability & Price on WhatsApp</span>
  `;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const message = buildPartMessage(supplier, partNameOrRef, vehicles);
    const link = buildContactLink(whatsappNumber, message);
    if (link) window.open(link, '_blank', 'noopener,noreferrer');
  });

  return btn;
}

// Home Page: Distributor Brand Showcase with Real Logos & Filtering
function initHomePage() {
  const grid = document.getElementById('supplierGrid');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('supplierSearch');
  const clearBtn = document.getElementById('clearSearchBtn');
  const searchCountEl = document.getElementById('supplierSearchCount');
  const componentPills = document.getElementById('componentPills');
  const resetBtn = document.getElementById('resetSearchBtn');
  const quoteForm = document.getElementById('heroQuickQuoteForm');

  if (!grid) return; // not home page

  let brandList = OFFICIAL_DISTRIBUTORS;
  let activeCategory = 'all';

  function renderBrands(list) {
    grid.innerHTML = '';

    if (!list || list.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      if (searchCountEl) searchCountEl.textContent = 'No matching brands found';
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (searchCountEl) {
      searchCountEl.textContent = `Showing ${list.length} of ${brandList.length} authorized distributor lines`;
    }

    list.forEach((s) => {
      const card = document.createElement('article');
      card.className = 'brand-card';

      const logoUrl = s.logoUrl || (s.logo ? `/logos/${s.logo}` : '/logos/01_sangsin_brakes.png');
      const categoryLabel = s.categoryLabel || s.category || 'Automotive Spares';
      const description = s.description || 'Genuine factory replacement components and assemblies.';
      const catClass = `cat-${s.category || 'automotive'}`;

      card.innerHTML = `
        <a href="/supplier/${s.id}" class="brand-logo-container" aria-label="View ${escapeHtml(s.name)} parts">
          <img src="${escapeAttr(logoUrl)}" alt="${escapeHtml(s.name)} logo" class="brand-logo-img" loading="lazy" onerror="this.src='/logos/01_sangsin_brakes.png'">
        </a>
        <div class="brand-card-body">
          <div class="brand-card-header">
            <span class="brand-category-badge ${catClass}">${escapeHtml(categoryLabel)}</span>
            <span class="brand-verified-chip" title="Direct Authorized OEM / OES Supply">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              OEM Direct
            </span>
          </div>
          <h3 class="brand-title"><a href="/supplier/${s.id}">${escapeHtml(s.name)}</a></h3>
          <p class="brand-description">${escapeHtml(description)}</p>
          <div class="brand-card-actions">
            <a href="/supplier/${s.id}" class="btn-view-parts">
              <span>View Parts Catalogue</span>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </a>
            <button type="button" class="btn-quick-wa" data-brand="${escapeAttr(s.name)}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.57.12-.17.25-.66.81-.81.98-.15.17-.3.19-.55.07-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.57-1.37-.78-1.87-.2-.5-.42-.43-.57-.44l-.49-.01c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.42 1.02 2.59.12.17 1.77 2.7 4.28 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29z"/></svg>
              <span>WhatsApp Inquire</span>
            </button>
          </div>
        </div>
      `;

      // Quick WhatsApp button handler
      const waBtn = card.querySelector('.btn-quick-wa');
      if (waBtn) {
        waBtn.onclick = (e) => {
          e.preventDefault();
          const message = buildBrandInquiryMessage(s.name);
          const link = buildContactLink(whatsappNumber, message);
          if (link) window.open(link, '_blank', 'noopener,noreferrer');
        };
      }

      grid.appendChild(card);
    });
  }

  function applyFilters() {
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (clearBtn) {
      clearBtn.style.display = query ? 'block' : 'none';
    }

    const filtered = brandList.filter((b) => {
      // Category filter
      if (activeCategory !== 'all') {
        const cat = (b.category || '').toLowerCase();
        const catLabel = (b.categoryLabel || '').toLowerCase();
        if (!cat.includes(activeCategory) && !catLabel.includes(activeCategory)) {
          return false;
        }
      }

      // Query filter
      if (query) {
        const nameMatch = b.name.toLowerCase().includes(query);
        const descMatch = (b.description || '').toLowerCase().includes(query);
        const catMatch = (b.categoryLabel || '').toLowerCase().includes(query);
        if (!nameMatch && !descMatch && !catMatch) return false;
      }

      return true;
    });

    renderBrands(filtered);
  }

  async function loadBrands() {
    try {
      const data = await fetchJson('/api/suppliers');
      if (Array.isArray(data) && data.length > 0) {
        // Merge API data with official enriched list
        brandList = data.map((item) => {
          const match = OFFICIAL_DISTRIBUTORS.find(d => d.name.toLowerCase() === item.name.toLowerCase());
          return {
            ...item,
            category: (match && match.category) || 'automotive',
            categoryLabel: (match && match.categoryLabel) || 'Automotive Component',
            description: (match && match.description) || 'Genuine factory replacement components and assemblies.',
            logoUrl: item.logoUrl || (match && match.logoUrl) || (item.logo ? `/logos/${item.logo}` : null),
          };
        });
      }
    } catch (err) {
      console.warn('API error, using verified official distributor lines:', err.message);
      brandList = OFFICIAL_DISTRIBUTORS;
    }

    renderBrands(brandList);

    // Search events
    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        applyFilters();
        searchInput.focus();
      });
    }

    // Reset button
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        activeCategory = 'all';
        if (componentPills) {
          componentPills.querySelectorAll('.comp-pill').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-category') === 'all');
          });
        }
        applyFilters();
      });
    }

    // Component Category Pills events (Interactive System Navigator)
    if (componentPills) {
      componentPills.addEventListener('click', (e) => {
        const btn = e.target.closest('.comp-pill');
        if (!btn) return;
        componentPills.querySelectorAll('.comp-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.getAttribute('data-category') || 'all';
        applyFilters();

        // Smooth scroll toward results if filtering
        if (activeCategory !== 'all') {
          const target = document.getElementById('brandsSection');
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    }

    // Quick Workshop Quote form handler
    if (quoteForm) {
      quoteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const brand = document.getElementById('widgetBrandSelect')?.value.trim();
        const vehicle = document.getElementById('widgetVehicleInput')?.value.trim();
        const part = document.getElementById('widgetPartInput')?.value.trim() || 'Genuine Replacement Parts';

        if (!brand) {
          showToast('Please select a brand from the list', 'error');
          document.getElementById('widgetBrandSelect')?.focus();
          return;
        }
        if (!vehicle) {
          showToast('Please enter your vehicle model and year', 'error');
          document.getElementById('widgetVehicleInput')?.focus();
          return;
        }

        const message = 
          'Hello Sai Rudra Motors Distributors,\n' +
          'I would like to check availability and wholesale price quote for:\n\n' +
          '• Manufacturer / Brand: ' + brand + '\n' +
          '• Vehicle Model & Year: ' + vehicle + '\n' +
          '• Component Required: ' + part + '\n\n' +
          'Please confirm stock availability and dispatch time. Thank you.';

        const link = buildContactLink(whatsappNumber, message);
        if (link) window.open(link, '_blank', 'noopener,noreferrer');
      });
    }
  }

  loadBrands();
}

// Floating Back to Top Button
function initBackToTop() {
  const btn = document.getElementById('backToTopBtn');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 350) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Global Keyboard Navigation
function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // If pressing '/' when not in an input, focus search
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      const search = document.getElementById('supplierSearch') || document.getElementById('partSearch');
      if (search) {
        e.preventDefault();
        search.focus();
        search.select();
      }
    }
    // ESC clears search
    if (e.key === 'Escape') {
      const search = document.getElementById('supplierSearch') || document.getElementById('partSearch');
      if (search && document.activeElement === search) {
        search.value = '';
        search.dispatchEvent(new Event('input', { bubbles: true }));
        search.blur();
      }
    }
  });
}

// Mobile Menu Drawer
function initMobileNav() {
  const toggle = document.getElementById('mobileMenuToggle');
  const drawer = document.getElementById('mobileDrawer');
  if (!toggle || !drawer) return;

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    drawer.classList.toggle('open');
    toggle.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (drawer.classList.contains('open') && !drawer.contains(e.target) && e.target !== toggle) {
      drawer.classList.remove('open');
      toggle.classList.remove('active');
    }
  });

  drawer.querySelectorAll('.drawer-link').forEach(link => {
    link.addEventListener('click', () => {
      drawer.classList.remove('open');
      toggle.classList.remove('active');
    });
  });
}

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  initImageViewer();
  initHomePage();
  initBackToTop();
  initKeyboardShortcuts();
  initMobileNav();
});
