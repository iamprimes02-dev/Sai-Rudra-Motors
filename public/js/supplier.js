// Sai Rudra Motors - Supplier Parts Catalogue Engine
// High-performance parts listing, instant brand pre-hydration, vehicle filtering, live search, and WhatsApp dispatch.

(() => {
  'use strict';

  const API = window.location.origin;
  const urlParams = new URLSearchParams(window.location.search);
  const querySupplierId = urlParams.get('id') || urlParams.get('supplierId');
  const pathTokens = window.location.pathname.split('/').filter(Boolean);
  const lastToken = pathTokens[pathTokens.length - 1];
  const supplierId = querySupplierId || (lastToken && !lastToken.endsWith('.html') && lastToken !== 'supplier' ? lastToken : '1');

  const partGrid = document.getElementById('partGrid');
  const vehicleFilter = document.getElementById('vehicleFilter');
  const partSearch = document.getElementById('partSearch');
  const clearPartSearchBtn = document.getElementById('clearPartSearchBtn');
  const shownCountEl = document.getElementById('shownCount');
  const totalCountEl = document.getElementById('totalCount');
  const emptyState = document.getElementById('emptyState');
  const supplierTitleEl = document.getElementById('supplierTitle');
  const supplierLogoEl = document.getElementById('supplierLogo');
  const supplierDescEl = document.getElementById('supplierDescription');
  const supplierPartsCountHeader = document.getElementById('supplierPartsCount');
  const breadcrumbBrand = document.getElementById('breadcrumbBrand');
  const supplierInquireBtn = document.getElementById('supplierInquireBtn');

  let allParts = [];
  let supplierData = null;
  let searchDebounceTimer = null;

  // Immediate Synchronous Pre-Hydration (0ms paint)
  const initialBrand = window.__SRM_INITIAL_BRAND__ || (typeof OFFICIAL_DISTRIBUTORS !== 'undefined'
    ? OFFICIAL_DISTRIBUTORS.find(d => String(d.id) === String(supplierId) || d.name.toLowerCase() === String(supplierId).toLowerCase())
    : null);

  if (initialBrand) {
    supplierData = initialBrand;
    hydrateHeader(initialBrand);
  }

  function hydrateHeader(brand) {
    if (supplierTitleEl && brand.name) supplierTitleEl.textContent = brand.name;
    if (breadcrumbBrand && brand.name) breadcrumbBrand.textContent = brand.name;
    if (brand.name) document.title = `${brand.name} Parts - Sai Rudra Motors`;

    const logoSrc = brand.logoUrl || (brand.logo ? (brand.logo.startsWith('http') || brand.logo.startsWith('/') ? brand.logo : `/logos/${brand.logo}`) : null);
    if (supplierLogoEl && logoSrc) {
      supplierLogoEl.src = logoSrc;
      supplierLogoEl.alt = `${brand.name} logo`;
      supplierLogoEl.style.display = 'block';
    }

    if (supplierDescEl && (brand.description || brand.desc)) {
      supplierDescEl.textContent = brand.description || brand.desc;
    }
  }

  async function loadSupplierAndParts() {
    try {
      const res = await fetch(`${API}/api/suppliers/${supplierId}/parts`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.supplier) {
          supplierData = data.supplier;
          hydrateHeader(supplierData);
        }
        allParts = (data.parts || []).map((p) => {
          let v = p.vehicles;
          if (typeof v === 'string') {
            try { v = JSON.parse(v); } catch { v = [v]; }
          }
          return {
            ...p,
            vehicles: Array.isArray(v) ? v : [],
          };
        });
      } else {
        // Fallback to official distributor
        if (!supplierData && typeof OFFICIAL_DISTRIBUTORS !== 'undefined') {
          const match = OFFICIAL_DISTRIBUTORS.find(d => String(d.id) === String(supplierId));
          if (match) {
            supplierData = match;
            hydrateHeader(match);
          }
        }
      }

      if (supplierPartsCountHeader) {
        supplierPartsCountHeader.textContent = allParts.length > 0
          ? `${allParts.length} ${allParts.length === 1 ? 'Part' : 'Parts'} Listed`
          : 'Genuine Company Stock';
      }

      // Collect distinct vehicles for filter dropdown
      const distinctVehicles = new Set();
      allParts.forEach(p => {
        p.vehicles.forEach(v => {
          if (v && v.trim()) distinctVehicles.add(v.trim());
        });
      });
      populateVehicleFilter(Array.from(distinctVehicles).sort());

      applyFilters();
    } catch (err) {
      console.warn('Load parts notice:', err.message);
      if (supplierPartsCountHeader) {
        supplierPartsCountHeader.textContent = 'Genuine Company Stock';
      }
      applyFilters();
    }
  }

  function populateVehicleFilter(vehicles) {
    if (!vehicleFilter) return;
    const currentVal = vehicleFilter.value;
    vehicleFilter.innerHTML = '<option value="">All compatible vehicles</option>';
    vehicles.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      vehicleFilter.appendChild(opt);
    });
    if (currentVal) vehicleFilter.value = currentVal;
  }

  function applyFilters() {
    const selectedVehicle = vehicleFilter ? vehicleFilter.value.trim().toLowerCase() : '';
    const searchKeywords = partSearch ? partSearch.value.trim().toLowerCase() : '';

    if (clearPartSearchBtn) {
      clearPartSearchBtn.style.display = searchKeywords ? 'block' : 'none';
    }

    const filtered = allParts.filter((part) => {
      const partName = (part.name || '').toLowerCase();
      const partId = String(part.id);
      const vehiclesLower = part.vehicles.map(v => v.toLowerCase());

      if (selectedVehicle) {
        const match = vehiclesLower.some(v => v === selectedVehicle || v.includes(selectedVehicle));
        if (!match) return false;
      }

      if (searchKeywords) {
        const nameMatch = partName.includes(searchKeywords);
        const idMatch = partId.includes(searchKeywords);
        const vehicleMatch = vehiclesLower.some(v => v.includes(searchKeywords));
        if (!nameMatch && !idMatch && !vehicleMatch) return false;
      }

      return true;
    });

    renderParts(filtered);
  }

  function renderParts(parts) {
    if (!partGrid) return;
    partGrid.innerHTML = '';

    if (shownCountEl) shownCountEl.textContent = parts.length;
    if (totalCountEl) totalCountEl.textContent = allParts.length;

    // Zero Parts Listed or Zero Filter Matches
    if (!parts || parts.length === 0) {
      if (emptyState) emptyState.classList.add('hidden'); // Hide dull legacy empty state

      const bName = supplierData ? supplierData.name : 'Authorized OEM';
      const isFilteredOut = allParts.length > 0;

      const directCard = document.createElement('div');
      directCard.className = 'oem-procurement-card';

      if (isFilteredOut) {
        directCard.innerHTML = `
          <div class="oem-card-badge">
            <span class="live-dot" style="background:#F59E0B;"></span> FILTER RESULT
          </div>
          <h3 class="oem-card-title">No direct matches found in current listing</h3>
          <p class="oem-card-desc">
            We supply unlisted part numbers, custom sub-assemblies, and alternative references for <strong>${escapeHtml(bName)}</strong>.
            Message our counter directly on WhatsApp with your vehicle model or part photo for instant availability.
          </p>
          <div class="oem-card-actions-row">
            <button type="button" class="srm-wa-btn oem-wa-cta-btn" id="filterWaBtn">
              <svg class="wa-icon-svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.57.12-.17.25-.66.81-.81.98-.15.17-.3.19-.55.07-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.57-1.37-.78-1.87-.2-.5-.42-.43-.57-.44l-.49-.01c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.42 1.02 2.59.12.17 1.77 2.7 4.28 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29z"/></svg>
              <span>Ask Counter for Unlisted Part</span>
            </button>
            <button type="button" class="srm-reset-filter-btn" id="resetFiltersBtn">Reset All Filters</button>
          </div>
        `;
        partGrid.appendChild(directCard);

        const resetBtn = directCard.querySelector('#resetFiltersBtn');
        if (resetBtn) {
          resetBtn.onclick = () => {
            if (partSearch) partSearch.value = '';
            if (vehicleFilter) vehicleFilter.value = '';
            applyFilters();
          };
        }
      } else {
        directCard.innerHTML = `
          <div class="oem-card-badge">
            <span class="live-dot"></span> DIRECT OEM FACTORY LINE
          </div>
          <h3 class="oem-card-title">Official Factory Procurement for ${escapeHtml(bName)}</h3>
          <p class="oem-card-desc">
            Sai Rudra Motors is an authorized distributor for <strong>${escapeHtml(bName)}</strong>.
            We stock and dispatch genuine OEM factory spares, components, and replacement kits across all transport hubs and workshops in Karnataka.
          </p>
          <div class="oem-card-perks">
            <div class="oem-perk">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              <span>100% Genuine Sealed Stock</span>
            </div>
            <div class="oem-perk">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              <span>Daily Karnataka Transport Dispatch</span>
            </div>
            <div class="oem-perk">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              <span>Wholesale Counter & Workshop Rates</span>
            </div>
          </div>
          <div class="oem-card-actions-row">
            <button type="button" class="srm-wa-btn oem-wa-cta-btn" id="filterWaBtn">
              <svg class="wa-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.57.12-.17.25-.66.81-.81.98-.15.17-.3.19-.55.07-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.57-1.37-.78-1.87-.2-.5-.42-.43-.57-.44l-.49-.01c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.42 1.02 2.59.12.17 1.77 2.7 4.28 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29z"/></svg>
              <span>Check Immediate Stock on WhatsApp</span>
            </button>
          </div>
        `;
        partGrid.appendChild(directCard);
      }

      const waBtn = directCard.querySelector('#filterWaBtn');
      if (waBtn) {
        waBtn.onclick = () => {
          const msg = `Hello Sai Rudra Motors,\nI want to check stock and rates for ${bName} parts.\nPlease confirm availability and dispatch.`;
          const num = typeof whatsappNumber !== 'undefined' ? whatsappNumber : '918660957903';
          const link = typeof buildContactLink === 'function' ? buildContactLink(num, msg) : `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
          if (link) window.open(link, '_blank', 'noopener,noreferrer');
        };
      }
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    // Batch render using DocumentFragment for maximum performance
    const fragment = document.createDocumentFragment();

    parts.forEach((part) => {
      const card = document.createElement('article');
      card.className = 'part-card';

      const partNameOrRef = part.name || `Part #${part.id}`;
      const altText = `${partNameOrRef} - ${supplierData ? supplierData.name : 'SRM'}`;
      const imageUrl = part.imageUrl || part.image_url || '';

      const vehiclesContainer = document.createElement('div');
      vehiclesContainer.className = 'vehicles';

      const maxInitial = 2;
      const initialList = part.vehicles.slice(0, maxInitial);
      const hiddenList = part.vehicles.slice(maxInitial);

      initialList.forEach(v => {
        const chip = document.createElement('span');
        chip.className = 'vehicle-chip';
        chip.textContent = v;
        vehiclesContainer.appendChild(chip);
      });

      if (hiddenList.length > 0) {
        const moreChip = document.createElement('button');
        moreChip.type = 'button';
        moreChip.className = 'vehicle-chip vehicle-chip-more';
        moreChip.textContent = `+${hiddenList.length} more`;
        moreChip.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          moreChip.remove();
          hiddenList.forEach(hv => {
            const chip = document.createElement('span');
            chip.className = 'vehicle-chip';
            chip.textContent = hv;
            vehiclesContainer.appendChild(chip);
          });
        };
        vehiclesContainer.appendChild(moreChip);
      }

      card.innerHTML = `
        <div class="part-image-box" data-view="${escapeAttr(imageUrl)}" data-view-alt="${escapeHtml(altText)}">
          <img src="${escapeAttr(imageUrl)}" alt="${escapeHtml(altText)}" loading="lazy" decoding="async" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
          <div class="part-image-placeholder">${escapeHtml(partNameOrRef)}</div>
          <div class="part-zoom-hint">Enlarge Photo</div>
        </div>
        <div class="part-body">
          <h4 class="part-name ${!part.name ? 'part-name-muted' : ''}">${escapeHtml(partNameOrRef)}</h4>
          <div class="part-vehicles-label">Compatible Vehicles:</div>
        </div>
        <div class="part-footer"></div>
      `;

      card.querySelector('.part-body').appendChild(vehiclesContainer);

      const sName = supplierData ? supplierData.name : 'Authorized OEM';
      if (typeof makePartContactBtn === 'function') {
        const contactBtn = makePartContactBtn(part.id, sName, partNameOrRef, part.vehicles);
        card.querySelector('.part-footer').appendChild(contactBtn);
      }

      fragment.appendChild(card);
    });

    partGrid.appendChild(fragment);
  }

  // Event Listeners with Debounced Search
  if (vehicleFilter) {
    vehicleFilter.addEventListener('change', applyFilters);
  }

  if (partSearch) {
    partSearch.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(applyFilters, 50);
    });
  }

  // Keyboard shortcut: '/' to focus search input
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && partSearch && document.activeElement !== partSearch && document.activeElement?.tagName !== 'INPUT') {
      e.preventDefault();
      partSearch.focus();
    }
  });

  if (clearPartSearchBtn) {
    clearPartSearchBtn.addEventListener('click', () => {
      if (partSearch) {
        partSearch.value = '';
        applyFilters();
        partSearch.focus();
      }
    });
  }

  if (supplierInquireBtn) {
    supplierInquireBtn.addEventListener('click', () => {
      const bName = supplierData ? supplierData.name : 'this brand';
      const msg = typeof buildBrandInquiryMessage === 'function'
        ? buildBrandInquiryMessage(bName)
        : `Hello Sai Rudra Motors,\nI want to check stock and rates for ${bName}.\nPlease let me know availability and dispatch.`;
      const num = typeof whatsappNumber !== 'undefined' ? whatsappNumber : '918660957903';
      const link = typeof buildContactLink === 'function'
        ? buildContactLink(num, msg)
        : `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
      if (link) window.open(link, '_blank', 'noopener,noreferrer');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSupplierAndParts);
  } else {
    loadSupplierAndParts();
  }
})();
