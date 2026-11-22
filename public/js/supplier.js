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
              <svg class="wa-icon-svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.004 0C5.373 0 .004 5.373.004 12c0 2.115.547 4.102 1.516 5.836L.004 24l6.324-1.488C7.994 23.46 9.946 24 12.004 24c6.627 0 11.996-5.373 11.996-12S18.631 0 12.004 0zm6.986 16.965c-.29.816-1.688 1.554-2.355 1.654-.602.09-1.365.128-2.203-.138-.508-.16-1.16-.375-1.993-.734-3.504-1.516-5.794-5.048-5.968-5.281-.174-.233-1.423-1.895-1.423-3.614 0-1.719.897-2.564 1.216-2.912.319-.348.696-.435.928-.435.232 0 .464.002.667.013.213.012.5.081.782.76.29.7.986 2.406 1.073 2.58.087.174.145.377.029.609-.116.232-.174.377-.348.58-.174.203-.367.454-.522.61-.174.174-.356.363-.153.712.203.348.904 1.493 1.939 2.416 1.332 1.188 2.455 1.556 2.803 1.73.348.174.551.145.754-.087.203-.232.87-1.015 1.102-1.363.232-.348.464-.29.783-.174.319.116 2.03.957 2.378 1.131.348.174.58.261.667.406.087.145.087.841-.203 1.657z"/></svg>
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
              <svg class="wa-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12.004 0C5.373 0 .004 5.373.004 12c0 2.115.547 4.102 1.516 5.836L.004 24l6.324-1.488C7.994 23.46 9.946 24 12.004 24c6.627 0 11.996-5.373 11.996-12S18.631 0 12.004 0zm6.986 16.965c-.29.816-1.688 1.554-2.355 1.654-.602.09-1.365.128-2.203-.138-.508-.16-1.16-.375-1.993-.734-3.504-1.516-5.794-5.048-5.968-5.281-.174-.233-1.423-1.895-1.423-3.614 0-1.719.897-2.564 1.216-2.912.319-.348.696-.435.928-.435.232 0 .464.002.667.013.213.012.5.081.782.76.29.7.986 2.406 1.073 2.58.087.174.145.377.029.609-.116.232-.174.377-.348.58-.174.203-.367.454-.522.61-.174.174-.356.363-.153.712.203.348.904 1.493 1.939 2.416 1.332 1.188 2.455 1.556 2.803 1.73.348.174.551.145.754-.087.203-.232.87-1.015 1.102-1.363.232-.348.464-.29.783-.174.319.116 2.03.957 2.378 1.131.348.174.58.261.667.406.087.145.087.841-.203 1.657z"/></svg>
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
