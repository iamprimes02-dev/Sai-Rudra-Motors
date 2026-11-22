// Sai Rudra Motors - Supplier Parts Catalogue Engine
// Handles parts listing, vehicle filtering, live keyword search, image viewer, and WhatsApp contact.

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

async function loadSupplierAndParts() {
  try {
    const res = await fetch(`${API}/api/suppliers/${supplierId}/parts`, { cache: 'no-store' });
    let data;
    if (res.ok) {
      data = await res.json();
      supplierData = data.supplier;
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
      // Fallback to official distributor list if DB hasn't been seeded yet
      const match = OFFICIAL_DISTRIBUTORS.find(d => String(d.id) === String(supplierId) || d.name.toLowerCase() === String(supplierId).toLowerCase());
      if (match) {
        supplierData = match;
        allParts = [];
      } else {
        throw new Error('Supplier not found');
      }
    }

    // Populate Header Elements
    if (supplierTitleEl) supplierTitleEl.textContent = supplierData.name;
    if (breadcrumbBrand) breadcrumbBrand.textContent = supplierData.name;
    document.title = `${supplierData.name} Parts - Sai Rudra Motors`;

    const logoSrc = supplierData.logoUrl || (supplierData.logo ? `/logos/${supplierData.logo}` : null);
    if (supplierLogoEl && logoSrc) {
      supplierLogoEl.src = logoSrc;
      supplierLogoEl.alt = `${supplierData.name} logo`;
      supplierLogoEl.style.display = 'block';
    }

    if (supplierDescEl && supplierData.description) {
      supplierDescEl.textContent = supplierData.description;
    }

    if (supplierPartsCountHeader) {
      supplierPartsCountHeader.textContent = allParts.length > 0
        ? `${allParts.length} Parts Listed`
        : 'Genuine Brand Components';
    }

    // Collect distinct vehicles
    const distinctVehicles = new Set();
    allParts.forEach(p => {
      p.vehicles.forEach(v => distinctVehicles.add(v));
    });
    populateVehicleFilter(Array.from(distinctVehicles).sort());

    applyFilters();
  } catch (err) {
    console.error('Load parts error:', err);
    // Check fallback
    const match = OFFICIAL_DISTRIBUTORS.find(d => String(d.id) === String(supplierId));
    if (match) {
      supplierData = match;
      if (supplierTitleEl) supplierTitleEl.textContent = match.name;
      if (supplierLogoEl) {
        supplierLogoEl.src = match.logoUrl;
        supplierLogoEl.style.display = 'block';
      }
      if (supplierDescEl) supplierDescEl.textContent = match.description;
      allParts = [];
      renderParts([]);
      return;
    }

    if (partGrid) {
      partGrid.innerHTML = `
        <div class="empty-state">
          <h3>Supplier line not found</h3>
          <p>Please return to the main catalogue to select an authorized distributor.</p>
          <a href="/" class="btn-primary" style="margin-top:16px;">&larr; Return to All Brands</a>
        </div>
      `;
    }
  }
}

function populateVehicleFilter(vehicles) {
  if (!vehicleFilter) return;
  vehicleFilter.innerHTML = '<option value="">All compatible vehicles</option>';
  vehicles.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    vehicleFilter.appendChild(opt);
  });
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

    // Vehicle dropdown filter
    if (selectedVehicle) {
      const match = vehiclesLower.some(v => v === selectedVehicle || v.includes(selectedVehicle));
      if (!match) return false;
    }

    // Keyword search filter
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

  if (!parts || parts.length === 0) {
    if (emptyState) {
      emptyState.classList.remove('hidden');
      const h3 = emptyState.querySelector('h3');
      const p = emptyState.querySelector('p');
      if (allParts.length === 0) {
        if (h3) h3.textContent = `Direct Inquiries for ${supplierData ? supplierData.name : 'this Brand'}`;
        if (p) p.textContent = `We supply the complete catalog of genuine ${supplierData ? supplierData.name : ''} components. Send us your vehicle details on WhatsApp for immediate availability and wholesale pricing.`;
      } else {
        if (h3) h3.textContent = 'No parts match your filter criteria';
        if (p) p.textContent = 'Try resetting your vehicle filter or contact us on WhatsApp to check availability for unlisted models.';
      }
    }
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  parts.forEach((part) => {
    const card = document.createElement('article');
    card.className = 'part-card';

    const partNameOrRef = part.name || `Part #${part.id}`;
    const altText = `${partNameOrRef} - ${supplierData ? supplierData.name : 'SRM'}`;
    const imageUrl = part.imageUrl || part.image_url || '';

    // Render vehicles with expandable "+X more"
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
        <img src="${escapeAttr(imageUrl)}" alt="${escapeHtml(altText)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
        <div class="part-image-placeholder">${escapeHtml(partNameOrRef)}</div>
        <div class="part-zoom-hint">Enlarge Photo</div>
      </div>
      <div class="part-body">
        <h4 class="part-name ${!part.name ? 'part-name-muted' : ''}">${escapeHtml(partNameOrRef)}</h4>
        <div class="part-vehicles-label">Compatible Vehicles:</div>
      </div>
      <div class="part-footer"></div>
    `;

    // Append vehicle list to part-body
    card.querySelector('.part-body').appendChild(vehiclesContainer);

    // Append contact button
    const sName = supplierData ? supplierData.name : 'Supplier';
    const contactBtn = makePartContactBtn(part.id, sName, partNameOrRef, part.vehicles);
    card.querySelector('.part-footer').appendChild(contactBtn);

    partGrid.appendChild(card);
  });
}

// Event Listeners
if (vehicleFilter) {
  vehicleFilter.addEventListener('change', applyFilters);
}

if (partSearch) {
  partSearch.addEventListener('input', applyFilters);
}

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
    const msg = buildBrandInquiryMessage(bName);
    const link = buildContactLink(whatsappNumber, msg);
    if (link) window.open(link, '_blank', 'noopener,noreferrer');
  });
}

document.addEventListener('DOMContentLoaded', loadSupplierAndParts);
