import { API_BASE_URL, TABLEAU_URL } from './config.js';

// Utility: Get current date in YYYY-MM-DD format
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

// Global State
let applications = [];
let currentTabUrl = '';
let currentJobMatch = null;
let scrapedData = null;

// DOM Elements
const view0 = document.getElementById('view0');
const view1 = document.getElementById('view1');
const view1b = document.getElementById('view1b');
const view2 = document.getElementById('view2');
const view3 = document.getElementById('view3');
const toast = document.getElementById('toast');

// Initialize Popup
document.addEventListener('DOMContentLoaded', async () => {
  // Load data from API
  try {
    const res = await fetch(`${API_BASE_URL}/applications`);
    if (res.ok) {
      applications = await res.json();
    }
  } catch (err) {
    console.error("Failed to fetch applications:", err);
  }

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url) {
    currentTabUrl = tab.url;
  }

  // Check if current URL is already saved
  currentJobMatch = applications.find(app => app.url && currentTabUrl && app.url === currentTabUrl);

  if (currentJobMatch) {
    // Show View 1B
    showView1B(currentJobMatch);
  } else {
    // Not a saved job, let's see if we can scrape it
    if (tab && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('about:')) {
      chrome.tabs.sendMessage(tab.id, { action: "getJobDetails" }, (response) => {
        if (chrome.runtime.lastError) {
          // Can't access page or not a job board. Show Dashboard (View 0)
          showView0();
        } else if (response && (response.role || response.company)) {
          // Found job data, show View 1 to save
          scrapedData = response;
          showView(view1);
          prefillView1(scrapedData);
          checkForDuplicates(scrapedData);
        } else {
          // Scraper returned nothing useful, show Dashboard (View 0)
          showView0();
        }
      });
    } else {
      // Browser tab, show Dashboard (View 0)
      showView0();
    }
  }

  setupEventListeners();
});

// Setup All Event Listeners
function setupEventListeners() {
  // Navigation
  document.getElementById('v0-btn-analytics').addEventListener('click', () => {
    chrome.tabs.create({ url: TABLEAU_URL });
  });
  document.getElementById('v0-btn-add').addEventListener('click', () => {
    showView(view1);
    prefillView1({});
  });
  
  document.getElementById('v1-btn-pipeline').addEventListener('click', () => showView2());
  document.getElementById('v1b-btn-pipeline').addEventListener('click', () => showView2());
  document.getElementById('v2-btn-back').addEventListener('click', () => {
    if (currentJobMatch) showView1B(currentJobMatch);
    else showView0(); // Back from pipeline usually goes to dashboard if not on a job match
  });
  document.getElementById('v3-btn-cancel').addEventListener('click', () => showView2());

  // View 1 Save
  document.getElementById('v1-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveNewJob();
  });

  // View 1B Quick Actions
  document.querySelectorAll('#view1b .btn-status').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const newStatus = e.target.dataset.status;
      updateJobStatus(currentJobMatch.id, newStatus);
    });
  });
  document.getElementById('v1b-btn-edit').addEventListener('click', () => {
    showView3(currentJobMatch);
  });

  // View 2 Filters & Actions
  document.getElementById('v2-search').addEventListener('input', renderPipeline);
  document.getElementById('v2-filter-status').addEventListener('change', renderPipeline);
  document.getElementById('v2-btn-export').addEventListener('click', exportCSV);

  // View 3 Update
  document.getElementById('v3-form').addEventListener('submit', (e) => {
    e.preventDefault();
    updateJobDetails();
  });
}

// View Management
function showView(viewToShow) {
  [view0, view1, view1b, view2, view3].forEach(v => v.classList.add('hidden'));
  viewToShow.classList.remove('hidden');
}

function showView0() {
  showView(view0);
  
  document.getElementById('v0-count-total').textContent = applications.length;
  document.getElementById('v0-count-applied').textContent = applications.filter(a => a.status === 'Applied').length;
  document.getElementById('v0-count-interviewing').textContent = applications.filter(a => a.status === 'Interviewing').length;
  document.getElementById('v0-count-offers').textContent = applications.filter(a => a.status === 'Offer').length;
  document.getElementById('v0-count-ghosted').textContent = applications.filter(a => a.status === 'Ghosted').length;
}

function showView1B(job) {
  showView(view1b);
  document.getElementById('v1b-date-display').textContent = job.dateSaved;
  document.getElementById('v1b-company-role').textContent = `${job.company} — ${job.role}`;
  
  const statusBadge = document.getElementById('v1b-current-status');
  statusBadge.textContent = job.status;
  statusBadge.className = `status-badge status-${job.status}`;

  document.querySelectorAll('#view1b .btn-status').forEach(btn => {
    if (btn.dataset.status === job.status) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function showView2() {
  showView(view2);
  renderPipeline();
}

function showView3(job) {
  showView(view3);
  document.getElementById('v3-id').value = job.id;
  document.getElementById('v3-title').value = job.role || '';
  document.getElementById('v3-company').value = job.company || '';
  document.getElementById('v3-location').value = job.location || '';
  document.getElementById('v3-type').value = job.type || 'Full-time';
  document.getElementById('v3-salary').value = job.salary || '';
  document.getElementById('v3-status').value = job.status || 'Wishlist';
  document.getElementById('v3-date').value = job.dateSaved || '';
  document.getElementById('v3-url').value = job.url || '';
  document.getElementById('v3-notes').value = job.notes || '';
  document.getElementById('v3-last-updated').textContent = job.lastUpdated || job.dateSaved;
}

function prefillView1(data) {
  document.getElementById('v1-title').value = data.role || '';
  document.getElementById('v1-company').value = data.company || '';
  document.getElementById('v1-location').value = data.location || '';
  document.getElementById('v1-type').value = data.type || 'Full-time';
  document.getElementById('v1-salary').value = data.salary || '';
  document.getElementById('v1-status').value = 'Wishlist';
  document.getElementById('v1-date').value = data.dateSaved || getTodayStr();
  document.getElementById('v1-url').value = data.url || currentTabUrl || '';
}

function checkForDuplicates(data) {
  if (!data.company || !data.role) return;
  const isDuplicate = applications.some(app => 
    app.company.toLowerCase() === data.company.toLowerCase() && 
    app.role.toLowerCase() === data.role.toLowerCase()
  );
  if (isDuplicate) {
    document.getElementById('v1-warning').classList.remove('hidden');
  }
}

// Data Operations
async function notifyBackground() {
  chrome.runtime.sendMessage({ action: "updateBadge" });
}

async function saveNewJob() {
  const newJob = {
    role: document.getElementById('v1-title').value,
    company: document.getElementById('v1-company').value,
    location: document.getElementById('v1-location').value,
    type: document.getElementById('v1-type').value,
    salary: document.getElementById('v1-salary').value,
    status: document.getElementById('v1-status').value,
    dateSaved: document.getElementById('v1-date').value,
    lastUpdated: getTodayStr(),
    url: document.getElementById('v1-url').value,
    notes: document.getElementById('v1-notes').value
  };

  try {
    const res = await fetch(`${API_BASE_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newJob)
    });
    if (res.ok) {
      const savedJob = await res.json();
      applications.push(savedJob);
      showToast('Job saved successfully!');
      currentJobMatch = savedJob;
      notifyBackground();
      setTimeout(() => showView2(), 600);
    }
  } catch (err) {
    console.error(err);
    alert('Failed to save job to API.');
  }
}

async function updateJobStatus(id, newStatus) {
  try {
    const res = await fetch(`${API_BASE_URL}/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, lastUpdated: getTodayStr() })
    });
    if (res.ok) {
      const updatedJob = await res.json();
      const jobIndex = applications.findIndex(a => a.id === id);
      if (jobIndex > -1) applications[jobIndex] = updatedJob;
      if (currentJobMatch && currentJobMatch.id === id) currentJobMatch = updatedJob;
      
      showToast(`Status updated to ${newStatus}`);
      notifyBackground();
      
      // Update UI if we are on view1b
      if (!view1b.classList.contains('hidden')) {
        showView1B(currentJobMatch);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function updateJobDetails() {
  const id = document.getElementById('v3-id').value;
  const updatedData = {
    role: document.getElementById('v3-title').value,
    company: document.getElementById('v3-company').value,
    location: document.getElementById('v3-location').value,
    type: document.getElementById('v3-type').value,
    salary: document.getElementById('v3-salary').value,
    status: document.getElementById('v3-status').value,
    url: document.getElementById('v3-url').value,
    notes: document.getElementById('v3-notes').value,
    lastUpdated: getTodayStr()
  };

  try {
    const res = await fetch(`${API_BASE_URL}/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });
    if (res.ok) {
      const updatedJob = await res.json();
      const jobIndex = applications.findIndex(a => a.id === id);
      if (jobIndex > -1) applications[jobIndex] = updatedJob;
      if (currentJobMatch && currentJobMatch.id === id) currentJobMatch = updatedJob;
      
      showToast('Job updated successfully!');
      notifyBackground();
      showView2();
    }
  } catch (err) {
    console.error(err);
  }
}

async function deleteJob(id) {
  if (confirm("Are you sure you want to delete this job?")) {
    try {
      const res = await fetch(`${API_BASE_URL}/applications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        applications = applications.filter(a => a.id !== id);
        if (currentJobMatch && currentJobMatch.id === id) currentJobMatch = null;
        notifyBackground();
        renderPipeline();
      }
    } catch (err) {
      console.error(err);
    }
  }
}

// Pipeline Rendering
function renderPipeline() {
  const searchQuery = document.getElementById('v2-search').value.toLowerCase();
  const statusFilter = document.getElementById('v2-filter-status').value;
  
  const filteredApps = applications.filter(app => {
    const matchesSearch = (app.company || '').toLowerCase().includes(searchQuery) || 
                          (app.role || '').toLowerCase().includes(searchQuery);
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Update summary counts based on ALL applications (not just filtered)
  document.getElementById('v2-count-total').textContent = applications.length;
  document.getElementById('v2-count-applied').textContent = applications.filter(a => a.status === 'Applied').length;
  document.getElementById('v2-count-interviewing').textContent = applications.filter(a => a.status === 'Interviewing').length;
  document.getElementById('v2-count-offers').textContent = applications.filter(a => a.status === 'Offer').length;

  const listEl = document.getElementById('v2-job-list');
  const emptyState = document.getElementById('v2-empty-state');
  
  listEl.innerHTML = '';
  
  if (filteredApps.length === 0) {
    listEl.classList.add('hidden');
    emptyState.classList.remove('hidden');
    if (applications.length > 0) {
      emptyState.textContent = "No jobs match your filters.";
    } else {
      emptyState.textContent = "No jobs saved yet. Browse a job posting and click the extension to get started.";
    }
    return;
  }
  
  listEl.classList.remove('hidden');
  emptyState.classList.add('hidden');

  // Sort by date saved (newest first)
  filteredApps.sort((a, b) => new Date(b.dateSaved) - new Date(a.dateSaved));

  filteredApps.forEach(app => {
    const card = document.createElement('div');
    card.className = 'job-card';
    
    card.innerHTML = `
      <div class="job-card-header">
        <div class="job-card-title">${app.company} — ${app.role}</div>
      </div>
      <div class="job-card-date">Saved ${app.dateSaved}</div>
      <div class="job-card-actions">
        <select class="inline-status-select status-${app.status}" data-id="${app.id}">
          <option value="Wishlist" ${app.status === 'Wishlist' ? 'selected' : ''}>Wishlist</option>
          <option value="Applied" ${app.status === 'Applied' ? 'selected' : ''}>Applied</option>
          <option value="Interviewing" ${app.status === 'Interviewing' ? 'selected' : ''}>Interviewing</option>
          <option value="Offer" ${app.status === 'Offer' ? 'selected' : ''}>Offer</option>
          <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
          <option value="Ghosted" ${app.status === 'Ghosted' ? 'selected' : ''}>Ghosted</option>
        </select>
        <div class="card-btns">
          <button class="btn-icon edit-btn" data-id="${app.id}" title="Edit">✎ Edit</button>
          <button class="btn-icon delete delete-btn" data-id="${app.id}" title="Delete">🗑</button>
        </div>
      </div>
    `;
    listEl.appendChild(card);
  });

  // Attach events to dynamic elements
  listEl.querySelectorAll('.inline-status-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const newStatus = e.target.value;
      await updateJobStatus(id, newStatus);
      renderPipeline(); // re-render to update colors/filters
    });
  });

  listEl.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const job = applications.find(a => a.id === id);
      if (job) showView3(job);
    });
  });

  listEl.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      deleteJob(e.target.dataset.id);
    });
  });
}

// Toast
let toastTimeout;
function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2000);
}

// CSV Export (Now redirects to the API download endpoint)
function exportCSV() {
  if (applications.length === 0) {
    showToast("No jobs to export");
    return;
  }
  
  // Use the backend export endpoint
  chrome.tabs.create({ url: `${API_BASE_URL}/analytics/export/csv` });
}

