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
    categoryLabel: 'Brakes',
    description: 'Brake pads, brake shoes, and commercial brake linings.',
    partCount: 0,
    logoUrl: '/logos/01_sangsin_brakes.png'
  },
  {
    id: 2,
    name: 'Autolek Filters',
    logo: '02_autolek_filters.png',
    category: 'filtration',
    categoryLabel: 'Filters',
    description: 'Engine oil, air, AC cabin, and fuel filters.',
    partCount: 0,
    logoUrl: '/logos/02_autolek_filters.png'
  },
  {
    id: 3,
    name: 'Rotex Brake Discs',
    logo: '03_rotex_brake_discs.png',
    category: 'braking',
    categoryLabel: 'Brakes',
    description: 'Solid and ventilated brake discs and rotors.',
    partCount: 0,
    logoUrl: '/logos/03_rotex_brake_discs.png'
  },
  {
    id: 4,
    name: 'MX Mark Xtralife',
    logo: '04_mx_mark_xtralife.png',
    category: 'electrical',
    categoryLabel: 'Auto Spares',
    description: 'Electrical, ignition, and mechanical replacement parts.',
    partCount: 0,
    logoUrl: '/logos/04_mx_mark_xtralife.png'
  },
  {
    id: 5,
    name: 'Ceekay Exedy Clutches',
    logo: '05_ceekay_exedy_clutches.png',
    category: 'clutch',
    categoryLabel: 'Clutch & Transmission',
    description: 'Clutch plates, cover assemblies, and release bearings.',
    partCount: 0,
    logoUrl: '/logos/05_ceekay_exedy_clutches.png'
  },
  {
    id: 6,
    name: 'Mavrod Suspension',
    logo: '06_mavrod_suspension.png',
    category: 'suspension',
    categoryLabel: 'Suspension',
    description: 'Shock absorbers, strut assemblies, and suspension kits.',
    partCount: 0,
    logoUrl: '/logos/06_mavrod_suspension.png'
  },
  {
    id: 7,
    name: 'TVS Coolants',
    logo: '07_tvs_coolants.png',
    category: 'fluids',
    categoryLabel: 'Oils & Coolants',
    description: 'Engine radiator coolants and anti-freeze fluids.',
    partCount: 0,
    logoUrl: '/logos/07_tvs_coolants.png'
  },
  {
    id: 8,
    name: 'MB Techno Rubber',
    logo: '08_mb_techno_rubber.png',
    category: 'rubber',
    categoryLabel: 'Rubber Parts',
    description: 'Suspension bushes, engine mounts, bellows, and steering boots.',
    partCount: 0,
    logoUrl: '/logos/08_mb_techno_rubber.png'
  },
  {
    id: 9,
    name: 'HL Mando',
    logo: '09_hl_mando_suspension_brakes.png',
    category: 'suspension',
    categoryLabel: 'Steering & Suspension',
    description: 'Steering racks, columns, shock absorbers, and brake calipers.',
    partCount: 0,
    logoUrl: '/logos/09_hl_mando_suspension_brakes.png'
  },
  {
    id: 10,
    name: 'Delphi Engine Oils',
    logo: '10_delphi_engine_oils.png',
    category: 'fluids',
    categoryLabel: 'Oils & Coolants',
    description: 'Synthetic and semi-synthetic engine oils for petrol and diesel vehicles.',
    partCount: 0,
    logoUrl: '/logos/10_delphi_engine_oils.png'
  },
  {
    id: 11,
    name: 'Delphi Driveshafts',
    logo: '11_delphi_driveshafts.png',
    category: 'clutch',
    categoryLabel: 'Drivetrain & Axles',
    description: 'Complete CV axles, CV joints, and axle boots.',
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
    'Hello Sai Rudra Motors,\n' +
    'I want to check availability and rates for auto spare parts.\n' +
    'Please connect me with your counter.'
  );
}

function buildBrandInquiryMessage(brandName) {
  return (
    'Hello Sai Rudra Motors,\n' +
    'I want to check stock and rates for ' + brandName + '.\n' +
    'Please let me know availability and dispatch.'
  );
}

function buildPartMessage(supplier, partNameOrRef, vehicles) {
  const vehicleList = Array.isArray(vehicles) ? vehicles.join(', ') : String(vehicles || '');
  return (
    'Hello Sai Rudra Motors,\n' +
    'I want to check stock and rates for this part:\n\n' +
    '• Brand: ' + supplier + '\n' +
    '• Part: ' + partNameOrRef + '\n' +
    '• Compatible Vehicles: ' + vehicleList + '\n\n' +
    'Please confirm availability and dispatch. Thank you.'
  );
}

function buildContactLink(number, message) {
  if (!number) return null;
  const cleanNumber = String(number).replace(/\D/g, '');
  return 'https://wa.me/' + encodeURIComponent(cleanNumber) + '?text=' + encodeURIComponent(message);
}

async function fetchJson(path) {
  const res = await fetch(API + path, { cache: 'no-store' });
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
    <svg class="wa-icon-svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.004 0C5.373 0 .004 5.373.004 12c0 2.115.547 4.102 1.516 5.836L.004 24l6.324-1.488C7.994 23.46 9.946 24 12.004 24c6.627 0 11.996-5.373 11.996-12S18.631 0 12.004 0zm6.986 16.965c-.29.816-1.688 1.554-2.355 1.654-.602.09-1.365.128-2.203-.138-.508-.16-1.16-.375-1.993-.734-3.504-1.516-5.794-5.048-5.968-5.281-.174-.233-1.423-1.895-1.423-3.614 0-1.719.897-2.564 1.216-2.912.319-.348.696-.435.928-.435.232 0 .464.002.667.013.213.012.5.081.782.76.29.7.986 2.406 1.073 2.58.087.174.145.377.029.609-.116.232-.174.377-.348.58-.174.203-.367.454-.522.61-.174.174-.356.363-.153.712.203.348.904 1.493 1.939 2.416 1.332 1.188 2.455 1.556 2.803 1.73.348.174.551.145.754-.087.203-.232.87-1.015 1.102-1.363.232-.348.464-.29.783-.174.319.116 2.03.957 2.378 1.131.348.174.58.261.667.406.087.145.087.841-.203 1.657z"/></svg>
    <span>Check Availability & Dispatch on WhatsApp</span>
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
      searchCountEl.textContent = `Showing ${list.length} of ${brandList.length} authorized brands`;
    }

    list.forEach((s, idx) => {
      const card = document.createElement('article');
      card.className = 'brand-card';

      const logoUrl = s.logoUrl || (s.logo ? `/logos/${s.logo}` : '/logos/01_sangsin_brakes.png');
      const categoryLabel = s.categoryLabel || s.category || 'Auto Spares';
      const description = s.description || 'Genuine factory replacement components and assemblies.';
      const catClass = `cat-${s.category || 'automotive'}`;
      const lineNum = String(idx + 1).padStart(2, '0');

      card.innerHTML = `
        <div class="brand-spotlight-layer"></div>
        <a href="/supplier/${s.id}" class="brand-logo-container" aria-label="View ${escapeHtml(s.name)} catalogue">
          <span class="brand-stage-watermark">${lineNum}</span>
          <img src="${escapeAttr(logoUrl)}" alt="${escapeHtml(s.name)} logo" class="brand-logo-img" loading="lazy" onerror="this.src='/logos/01_sangsin_brakes.png'">
        </a>
        <div class="brand-card-body">
          <div class="brand-card-header">
            <span class="brand-category-badge ${catClass}">${escapeHtml(categoryLabel)}</span>
            <span class="brand-verified-chip" title="${s.partCount > 0 ? `${s.partCount} parts available in live catalogue` : '100% Genuine Company Stock'}">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              ${s.partCount > 0 ? `${s.partCount} ${s.partCount === 1 ? 'Part' : 'Parts'} in Catalogue` : '100% Genuine'}
            </span>
          </div>
          <h3 class="brand-title"><a href="/supplier/${s.id}">${escapeHtml(s.name)}</a></h3>
          <p class="brand-description">${escapeHtml(description)}</p>
          <div class="brand-card-actions">
            <a href="/supplier/${s.id}" class="btn-view-parts">
              <span>View Catalogue</span>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </a>
            <button type="button" class="btn-quick-wa" data-brand="${escapeAttr(s.name)}" aria-label="Ask for Stock">
              <svg class="wa-icon-svg" viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12.004 0C5.373 0 .004 5.373.004 12c0 2.115.547 4.102 1.516 5.836L.004 24l6.324-1.488C7.994 23.46 9.946 24 12.004 24c6.627 0 11.996-5.373 11.996-12S18.631 0 12.004 0zm6.986 16.965c-.29.816-1.688 1.554-2.355 1.654-.602.09-1.365.128-2.203-.138-.508-.16-1.16-.375-1.993-.734-3.504-1.516-5.794-5.048-5.968-5.281-.174-.233-1.423-1.895-1.423-3.614 0-1.719.897-2.564 1.216-2.912.319-.348.696-.435.928-.435.232 0 .464.002.667.013.213.012.5.081.782.76.29.7.986 2.406 1.073 2.58.087.174.145.377.029.609-.116.232-.174.377-.348.58-.174.203-.367.454-.522.61-.174.174-.356.363-.153.712.203.348.904 1.493 1.939 2.416 1.332 1.188 2.455 1.556 2.803 1.73.348.174.551.145.754-.087.203-.232.87-1.015 1.102-1.363.232-.348.464-.29.783-.174.319.116 2.03.957 2.378 1.131.348.174.58.261.667.406.087.145.087.841-.203 1.657z"/></svg>
              <span>Ask for Stock</span>
            </button>
          </div>
        </div>
      `;

      // Apple interactive cursor spotlight physics
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
      });

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
          const match = OFFICIAL_DISTRIBUTORS.find(d => 
            d.name.toLowerCase() === item.name.toLowerCase() ||
            (d.name === 'HL Mando' && item.name.toLowerCase().includes('hl mando'))
          );
          return {
            ...item,
            name: match ? match.name : item.name,
            category: (match && match.category) || 'automotive',
            categoryLabel: (match && match.categoryLabel) || 'Auto Spares',
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
        const name = document.getElementById('widgetNameInput')?.value.trim();
        const phone = document.getElementById('widgetPhoneInput')?.value.trim();
        const enquiryType = document.getElementById('widgetEnquiryTypeSelect')?.value.trim();
        const brand = document.getElementById('widgetBrandSelect')?.value.trim();
        const vehicle = document.getElementById('widgetVehicleInput')?.value.trim();
        const part = document.getElementById('widgetPartInput')?.value.trim() || 'Genuine Replacement Parts';

        if (!name) {
          showToast('Please enter your name', 'error');
          document.getElementById('widgetNameInput')?.focus();
          return;
        }
        if (!phone) {
          showToast('Please enter your phone number', 'error');
          document.getElementById('widgetPhoneInput')?.focus();
          return;
        }
        if (!enquiryType) {
          showToast('Please select an enquiry type', 'error');
          document.getElementById('widgetEnquiryTypeSelect')?.focus();
          return;
        }
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
          'Hello Sai Rudra Motors,\n' +
          'I want to check stock and rates:\n\n' +
          '• Name: ' + name + '\n' +
          '• Phone: ' + phone + '\n' +
          '• Enquiry Type: ' + enquiryType + '\n' +
          '• Brand: ' + brand + '\n' +
          '• Vehicle & Year: ' + vehicle + '\n' +
          '• Part Needed: ' + part + '\n\n' +
          'Please confirm availability and rates. Thank you.';

        // Save inquiry lead to server database (captures lead even if WhatsApp redirect is interrupted)
        fetch('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, enquiryType, brand, vehicle, part }),
          keepalive: true,
        }).catch((err) => {
          console.warn('Lead persistence notice:', err);
        });

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
