const API_HOST = window.location.hostname || 'localhost';
const API_PROTOCOL = window.location.protocol === 'https:' ? 'https:' : 'http:';
const API_BASE = `${API_PROTOCOL}//${API_HOST}:8080/api`;

const state = {
  page: 0,
  size: 8,
  search: '',
  category: '',
  status: '',
  totalPages: 0,
  view: 'dashboard',
  mode: '',
  authRole: 'STUDENT',
  user: null,
  categories: [],
  statuses: [],
  complaints: []
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function humanize(value = '') {
  return String(value).toLowerCase().split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function dateText(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' :
    date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusBadge(status) {
  const normalized = String(status || 'PENDING').toLowerCase();
  return `<span class="status-pill status-${escapeHtml(normalized)}">${escapeHtml(humanize(status))}</span>`;
}

function categorySymbol(category) {
  const key = String(category || '').toLowerCase();
  if (key.includes('wi-fi') || key.includes('internet')) return '⌁';
  if (key.includes('water')) return '♧';
  if (key.includes('electric')) return 'ϟ';
  if (key.includes('clean')) return '✧';
  if (key.includes('library')) return '▤';
  if (key.includes('wash')) return '♧';
  if (key.includes('class')) return '▦';
  return '◈';
}

async function api(path, options = {}) {
  let response;
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers
    });
  } catch {
    throw new Error('Cannot reach backend. Start Spring Boot and check that MySQL is running.');
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${data.message || 'Request failed'} (${response.status})`);
  return data;
}

function showNotice(message, kind = 'success') {
  const notice = $('#notice');
  notice.textContent = message;
  notice.className = `notice ${kind}`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  window.clearTimeout(showNotice.timer);
  showNotice.timer = window.setTimeout(() => notice.classList.add('hidden'), 5000);
}

function setApiState(online) {
  $('#apiDot').className = `dot ${online ? 'online' : 'offline'}`;
  $('#apiState').textContent = online ? 'Backend connected' : 'Backend unavailable';
}

function navigate(view) {
  if (view === 'new' && state.mode !== 'STUDENT') return;
  state.view = view;
  $$('.view').forEach(section => section.classList.add('hidden'));
  $(`#${view}View`).classList.remove('hidden');
  $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  $('#pageTitle').textContent = ({ dashboard: state.mode === 'ADMIN' ? 'Admin Dashboard' : 'Student Dashboard', complaints: state.mode === 'ADMIN' ? 'All complaints' : 'My complaints', new: 'Submit a complaint' })[view];
  if (view === 'dashboard') loadDashboard();
  if (view === 'complaints') loadComplaints();
  if (view === 'new') $('#complaintForm').elements.title.focus();
}

function complaintRow(complaint, showActions = true) {
  const actionButtons = state.mode === 'ADMIN'
    ? `<button class="mini-btn" data-detail="${complaint.id}">Manage</button>`
    : `<button class="mini-btn" data-detail="${complaint.id}">Details</button>`;
  return `<article class="complaint-row">
    <div class="category-icon">${categorySymbol(complaint.category)}</div>
    <div class="complaint-main">
      <h4>${escapeHtml(complaint.title)}</h4>
      <div class="complaint-meta"><span>#${complaint.id}</span><span>•</span><span>${escapeHtml(complaint.category)}</span><span>•</span><span>${escapeHtml(complaint.location)}</span><span>•</span>${state.mode === 'ADMIN' ? `<span>${escapeHtml(complaint.submittedBy)}</span><span>•</span>` : ''}<span>${escapeHtml(dateText(complaint.createdAt))}</span></div>
    </div>
    <div class="complaint-side">${statusBadge(complaint.status)}${showActions ? actionButtons : ''}</div>
  </article>`;
}

function emptyState(message, showNew = false) {
  return `<div class="empty-state"><strong>${escapeHtml(message)}</strong><span>When a complaint is submitted, it will appear here.</span>${showNew ? '<br><button class="btn btn-primary" data-go="new">＋ Submit a complaint</button>' : ''}</div>`;
}

async function loadMeta() {
  const [categories, statuses] = await Promise.all([api('/meta/categories'), api('/meta/statuses')]);
  state.categories = categories;
  state.statuses = statuses;
  $('#categoryFilter').innerHTML = '<option value="">All categories</option>' + categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  $('#formCategory').innerHTML = '<option value="">Choose a category</option>' + categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  $('#statusFilter').innerHTML = '<option value="">All statuses</option>' + statuses.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(humanize(s))}</option>`).join('');
}

async function loadDashboard() {
  try {
    const [stats, page] = await Promise.all([api('/complaints/stats'), api('/complaints?page=0&size=5')]);
    const records = page.content || [];
    $('#totalCount').textContent = stats.total;
    $('#pendingCount').textContent = stats.pending;
    $('#progressCount').textContent = stats.inProgress;
    $('#resolvedCount').textContent = stats.resolved;
    $('#recentList').innerHTML = records.length ? records.map(c => complaintRow(c)).join('') : emptyState('No complaints yet', state.mode === 'STUDENT');
    setApiState(true);
  } catch (error) {
    if (error.message.includes('(401)')) {
      setApiState(true);
      showAuth('Your session expired. Please sign in again.');
      return;
    }
    setApiState(false);
    $('#recentList').innerHTML = `<div class="empty-state"><strong>Could not load dashboard</strong>${escapeHtml(error.message)}</div>`;
    ['totalCount', 'pendingCount', 'progressCount', 'resolvedCount'].forEach(id => $('#' + id).textContent = '—');
  }
}

function queryString() {
  const params = new URLSearchParams({ page: state.page, size: state.size });
  if (state.search.trim()) params.set('search', state.search.trim());
  if (state.category) params.set('category', state.category);
  if (state.status) params.set('status', state.status);
  return params.toString();
}

async function loadComplaints() {
  $('#allList').innerHTML = '<div class="loading">Loading live complaints…</div>';
  try {
    const result = await api(`/complaints?${queryString()}`);
    state.complaints = result.content || [];
    state.totalPages = result.totalPages || 0;
    $('#allList').innerHTML = state.complaints.length ? state.complaints.map(c => complaintRow(c)).join('') : emptyState('No matching complaints', state.mode === 'STUDENT');
    $('#pageInfo').textContent = `Page ${state.totalPages ? state.page + 1 : 0} of ${state.totalPages}`;
    $('#prevPage').disabled = state.page <= 0;
    $('#nextPage').disabled = state.page + 1 >= state.totalPages;
    setApiState(true);
  } catch (error) {
    if (error.message.includes('(401)')) {
      setApiState(true);
      showAuth('Your session expired. Please sign in again.');
      return;
    }
    $('#allList').innerHTML = `<div class="empty-state"><strong>Could not load complaints</strong>${escapeHtml(error.message)}</div>`;
    setApiState(false);
  }
}

async function openDetails(id) {
  try {
    const c = await api(`/complaints/${id}`);
    $('#detailTitle').textContent = c.title;
    const adminControl = state.mode === 'ADMIN'
      ? `<div class="admin-status"><label for="detailStatus">Update status</label><select id="detailStatus">${state.statuses.map(s => `<option value="${escapeHtml(s)}" ${s === c.status ? 'selected' : ''}>${escapeHtml(humanize(s))}</option>`).join('')}</select><button class="btn btn-primary" id="saveStatus" data-id="${c.id}">Save</button></div>
         <button class="mini-btn" id="deleteComplaint" data-id="${c.id}" style="margin-top:12px;color:#c24154">Delete complaint</button>
         <div class="admin-note">Admin controls are protected by your signed-in account.</div>`
      : '';
    $('#detailBody').innerHTML = `
      <div>${statusBadge(c.status)} <span class="complaint-meta"> #${c.id} · ${escapeHtml(dateText(c.createdAt))}</span></div>
      <div class="detail-grid">
        <div class="detail-field"><span>Category</span><strong>${escapeHtml(c.category)}</strong></div>
        <div class="detail-field"><span>Location</span><strong>${escapeHtml(c.location)}</strong></div>
        <div class="detail-field"><span>Submitted by</span><strong>${escapeHtml(c.submittedBy)}</strong></div>
        <div class="detail-field"><span>Last updated</span><strong>${escapeHtml(dateText(c.updatedAt))}</strong></div>
      </div>
      <div class="detail-field"><span>Description</span><div class="detail-description">${escapeHtml(c.description)}</div></div>${adminControl}`;
    const dialog = $('#detailDialog');
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

async function submitComplaint(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const button = $('#submitBtn');
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Submitting…';
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  try {
    const created = await api('/complaints', { method: 'POST', body: JSON.stringify(payload) });
    form.reset();
    showNotice(`Complaint #${created.id} submitted successfully.`);
    navigate('dashboard');
  } catch (error) {
    showNotice(error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function updateStatus(id) {
  const status = $('#detailStatus').value;
  try {
    await api(`/complaints/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    $('#detailDialog').close();
    showNotice('Complaint status updated.');
    await Promise.all([loadDashboard(), state.view === 'complaints' ? loadComplaints() : Promise.resolve()]);
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

async function deleteComplaint(id) {
  if (!window.confirm(`Delete complaint #${id}? This cannot be undone.`)) return;
  try {
    await api(`/complaints/${id}`, { method: 'DELETE' });
    $('#detailDialog').close();
    showNotice('Complaint deleted.');
    await Promise.all([loadDashboard(), state.view === 'complaints' ? loadComplaints() : Promise.resolve()]);
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

document.addEventListener('click', (event) => {
  const nav = event.target.closest('[data-view]');
  const go = event.target.closest('[data-go]');
  const detail = event.target.closest('[data-detail]');
  const authAction = event.target.closest('[data-auth-role][data-auth-mode]');
  if (nav) navigate(nav.dataset.view);
  if (go) navigate(go.dataset.go);
  if (detail) openDetails(detail.dataset.detail);
  if (authAction) openAuth(authAction.dataset.authRole, authAction.dataset.authMode === 'register');
  if (event.target.closest('#quickNew, #listNew')) navigate('new');
  if (event.target.closest('#closeDialog')) $('#detailDialog').close();
  const save = event.target.closest('#saveStatus');
  if (save) updateStatus(save.dataset.id);
  const remove = event.target.closest('#deleteComplaint');
  if (remove) deleteComplaint(remove.dataset.id);
});

$('#complaintForm').addEventListener('submit', submitComplaint);
$('#prevPage').addEventListener('click', () => { if (state.page > 0) { state.page--; loadComplaints(); } });
$('#nextPage').addEventListener('click', () => { if (state.page + 1 < state.totalPages) { state.page++; loadComplaints(); } });

let searchTimer;
$('#searchInput').addEventListener('input', (event) => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => { state.search = event.target.value; state.page = 0; loadComplaints(); }, 300);
});
$('#categoryFilter').addEventListener('change', (event) => { state.category = event.target.value; state.page = 0; loadComplaints(); });
$('#statusFilter').addEventListener('change', (event) => { state.status = event.target.value; state.page = 0; loadComplaints(); });

async function startApp() {
  try {
    await api('/health');
    setApiState(true);
    await loadMeta();
    const user = await api('/auth/me');
    if (user) enterWorkspace(user);
    else showHome();
  } catch (error) {
    if (error.message.includes('(401)')) {
      setApiState(true);
      showHome('Your session expired. Please choose a portal and sign in again.');
      return;
    }
    setApiState(false);
    showHome(error.message);
  }
}

function showHome(message = '') {
  state.user = null;
  state.mode = '';
  $('.app-shell').classList.add('hidden');
  $('#authScreen').classList.add('hidden');
  $('#homeScreen').classList.remove('hidden');
  $('#homeNotice').textContent = message;
  $('#homeNotice').classList.toggle('hidden', !message);
}

function showAuth(message = '') {
  state.user = null;
  state.mode = '';
  $('.app-shell').classList.add('hidden');
  $('#homeScreen').classList.add('hidden');
  $('#authScreen').classList.remove('hidden');
  $('#authNotice').textContent = message;
  $('#authNotice').classList.toggle('hidden', !message);
}

function openAuth(role, registering) {
  state.authRole = role;
  showAuth();
  $('#registerRole').value = role;
  $('#registerRole').dispatchEvent(new Event('change'));
  showAuthMode(registering);
  if (!registering) $('#loginForm').elements.email.focus();
}

function enterWorkspace(user) {
  state.user = user;
  state.mode = user.role;
  state.page = 0;
  $('.app-shell').classList.remove('hidden');
  $('#homeScreen').classList.add('hidden');
  $('#authScreen').classList.add('hidden');
  $('#avatar').textContent = user.name.charAt(0).toUpperCase();
  $('#userLabel').textContent = `${user.name} · ${humanize(user.role)}`;
  const isAdmin = user.role === 'ADMIN';
  $('#welcomeTitle').textContent = isAdmin ? 'Admin Dashboard' : 'Student Dashboard';
  $('#welcomeDescription').textContent = isAdmin
    ? 'Review and manage complaints from across campus.'
    : 'Track the complaints you have submitted.';
  $('#complaintsNavText').textContent = isAdmin ? 'All complaints' : 'My complaints';
  $('#complaintsHeading').textContent = isAdmin ? 'All complaints' : 'My complaints';
  $('#complaintsDescription').textContent = isAdmin
    ? 'Review and manage reports submitted across campus.'
    : 'Track reports you have submitted.';
  $('#totalStatLabel').textContent = isAdmin ? 'Total reports' : 'My complaints';
  $('#totalStatHint').textContent = isAdmin ? 'All submitted complaints' : 'Reports submitted by you';
  $('#newComplaintNav').classList.toggle('hidden', isAdmin);
  $('#quickNew').classList.toggle('hidden', isAdmin);
  $('#listNew').classList.toggle('hidden', isAdmin);
  navigate('dashboard');
}

function showAuthMode(registering) {
  const roleName = humanize(state.authRole);
  $('#loginForm').classList.toggle('hidden', registering);
  $('#registerForm').classList.toggle('hidden', !registering);
  $('#authTitle').textContent = registering ? `Create your ${roleName.toLowerCase()} account` : `${roleName} sign in`;
  $('#authDescription').textContent = registering
    ? `Join CampusCare as a ${roleName.toLowerCase()} and help improve your campus.`
    : state.authRole === 'ADMIN'
      ? 'Sign in with your Admin account to review and manage campus complaints.'
      : 'Sign in to submit complaints and track your reports.';
  $('#authSwitchText').textContent = registering ? 'Already have an account?' : 'New to CampusCare?';
  $('#authSwitch').textContent = registering ? 'Sign in' : 'Create an account';
  $('#authNotice').classList.add('hidden');
  $('#authNotice').textContent = '';
}

async function submitAuth(event, registering) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  $('#authNotice').classList.add('hidden');
  const values = Object.fromEntries(new FormData(form).entries());
  try {
    if (registering) {
      values.role = values.role.toUpperCase();
      await api('/auth/register', { method: 'POST', body: JSON.stringify(values) });
    }
    const user = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: values.email, password: values.password })
    });
    form.reset();
    enterWorkspace(user);
    showNotice(registering ? 'Account created successfully. Welcome to CampusCare!' : 'Signed in successfully.');
  } catch (error) {
    $('#authNotice').textContent = error.message.includes('(401)')
      ? 'Email or password is incorrect.'
      : error.message;
    $('#authNotice').classList.remove('hidden');
  } finally {
    button.disabled = false;
  }
}

$('#authSwitch').addEventListener('click', () => showAuthMode($('#registerForm').classList.contains('hidden')));
$('#registerRole').addEventListener('change', (event) => {
  state.authRole = event.target.value;
  $('#adminCodeField').classList.toggle('hidden', event.target.value !== 'ADMIN');
  $('#adminCodeField input').required = event.target.value === 'ADMIN';
});
$('#backHome').addEventListener('click', () => showHome());
$('#loginForm').addEventListener('submit', (event) => submitAuth(event, false));
$('#registerForm').addEventListener('submit', (event) => submitAuth(event, true));
$('#logoutBtn').addEventListener('click', async () => {
  try {
    await api('/auth/logout', { method: 'POST' });
    showAuth();
    showAuthMode(false);
  } catch (error) {
    showNotice(error.message, 'error');
  }
});

startApp();
