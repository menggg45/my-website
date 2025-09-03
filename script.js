const nav = document.getElementById('primaryNav');
const toggle = document.getElementById('menuToggle');
const year = document.getElementById('year');

if (year) {
  year.textContent = new Date().getFullYear();
}

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
}

// Simple identity using localStorage 'studentName'
function getCurrentStudentName() {
  return localStorage.getItem('studentName') || '';
}
function setCurrentStudentName(name) {
  localStorage.setItem('studentName', name);
}

// Posts store
function loadPosts() {
  try {
    return JSON.parse(localStorage.getItem('hhf_posts') || '[]');
  } catch {
    return [];
  }
}
function savePosts(posts) {
  localStorage.setItem('hhf_posts', JSON.stringify(posts));
}

// UI elements
const askForm = document.getElementById('askForm');
const postsGrid = document.getElementById('postsGrid');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEdit');

let editingPostId = null;

function renderPosts() {
  if (!postsGrid) return;
  const posts = loadPosts().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (posts.length === 0) {
    postsGrid.innerHTML = '<p class="notice">No questions yet. Be the first to ask!</p>';
    return;
  }
  postsGrid.innerHTML = posts.map(p => {
    const isMine = p.author === getCurrentStudentName() && p.author !== '';
    const actions = isMine ? `
      <div class="post-actions">
        <button class="btn small" data-action="open" data-id="${p.id}">Open</button>
        <button class="btn small" data-action="edit" data-id="${p.id}">Edit</button>
        <button class="btn small danger" data-action="delete" data-id="${p.id}">Delete</button>
      </div>` : `
      <div class="post-actions">
        <button class="btn small" data-action="open" data-id="${p.id}">Open</button>
      </div>`;
    return `
      <article class="post">
        <h3 class="post-title"><a href="#">${escapeHtml(p.title)}</a></h3>
        <p class="post-meta">${escapeHtml(p.subject)} • by ${escapeHtml(p.author || 'Anonymous')} • ${timeAgo(p.createdAt)}</p>
        <p class="post-excerpt">${escapeHtml(p.details).slice(0, 160)}${p.details.length > 160 ? '…' : ''}</p>
        ${actions}
      </article>`;
  }).join('');

  postsGrid.querySelectorAll('button[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => startEdit(btn.getAttribute('data-id')));
  });
  postsGrid.querySelectorAll('button[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => deletePost(btn.getAttribute('data-id')));
  });
  postsGrid.querySelectorAll('button[data-action="open"]').forEach(btn => {
    btn.addEventListener('click', () => openPost(btn.getAttribute('data-id')));
  });
}

function startEdit(id) {
  const posts = loadPosts();
  const post = posts.find(p => String(p.id) === String(id));
  if (!post) return;
  const author = document.getElementById('author');
  const subject = document.getElementById('subject');
  const title = document.getElementById('title');
  const details = document.getElementById('details');
  if (author) author.value = post.author || '';
  if (subject) subject.value = post.subject || '';
  if (title) title.value = post.title || '';
  if (details) details.value = post.details || '';
  editingPostId = post.id;
  if (submitBtn) submitBtn.textContent = 'Save changes';
  if (cancelEditBtn) cancelEditBtn.style.display = 'inline-block';
  window.location.hash = '#ask';
}

function cancelEdit() {
  editingPostId = null;
  if (submitBtn) submitBtn.textContent = 'Post question';
  if (cancelEditBtn) cancelEditBtn.style.display = 'none';
  if (askForm) askForm.reset();
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs>1?'s':''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days>1?'s':''} ago`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}

if (askForm) {
  askForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const author = document.getElementById('author');
    const subject = document.getElementById('subject');
    const title = document.getElementById('title');
    const details = document.getElementById('details');
    const authorError = document.getElementById('authorError');
    const subjectError = document.getElementById('subjectError');
    const titleError = document.getElementById('titleError');
    const detailsError = document.getElementById('detailsError');

    let valid = true;

    if (author && author.value.trim().length < 2) {
      valid = false;
      if (authorError) authorError.textContent = 'Please enter your name.';
    } else if (authorError) authorError.textContent = '';

    if (subject && subject.value === '') {
      valid = false;
      if (subjectError) subjectError.textContent = 'Please select a subject.';
    } else if (subjectError) subjectError.textContent = '';

    if (title && title.value.trim().length < 8) {
      valid = false;
      if (titleError) titleError.textContent = 'Title should be at least 8 characters.';
    } else if (titleError) titleError.textContent = '';

    if (details && details.value.trim().length < 24) {
      valid = false;
      if (detailsError) detailsError.textContent = 'Please add more details (≥ 24 characters).';
    } else if (detailsError) detailsError.textContent = '';

    if (!valid) return;

    const currentName = author ? author.value.trim() : '';
    setCurrentStudentName(currentName);

    const posts = loadPosts();
    if (editingPostId !== null) {
      const idx = posts.findIndex(p => String(p.id) === String(editingPostId));
      if (idx !== -1 && posts[idx].author === currentName) {
        posts[idx] = {
          ...posts[idx],
          subject: subject ? subject.value : '',
          title: title ? title.value.trim() : '',
          details: details ? details.value.trim() : '',
          updatedAt: new Date().toISOString()
        };
        savePosts(posts);
        renderPosts();
        cancelEdit();
        return;
      }
    }

    const newPost = {
      id: Date.now(),
      author: currentName,
      subject: subject ? subject.value : '',
      title: title ? title.value.trim() : '',
      details: details ? details.value.trim() : '',
      createdAt: new Date().toISOString()
    };
    posts.unshift(newPost);
    savePosts(posts);
    renderPosts();
    askForm.reset();
  });
}

if (cancelEditBtn) {
  cancelEditBtn.addEventListener('click', cancelEdit);
}

// Initialize default author field with persisted name
const authorInput = document.getElementById('author');
if (authorInput) {
  const name = getCurrentStudentName();
  if (name) authorInput.value = name;
}

// Initial render
renderPosts();

// Delete a post (own posts only)
function deletePost(id) {
  const posts = loadPosts();
  const post = posts.find(p => String(p.id) === String(id));
  if (!post) return;
  if (post.author !== getCurrentStudentName()) return alert('You can only delete your own post.');
  if (!confirm('Delete this post? This cannot be undone.')) return;
  const next = posts.filter(p => String(p.id) !== String(id));
  savePosts(next);
  renderPosts();
}

// Post detail view + answers
const postView = document.getElementById('postView');
const postDetail = document.getElementById('postDetail');
const closePostView = document.getElementById('closePostView');
const answersList = document.getElementById('answersList');
const answerForm = document.getElementById('answerForm');
const answerDetails = document.getElementById('answerDetails');
const answerError = document.getElementById('answerError');
const answerCancel = document.getElementById('answerCancel');
let currentPostId = null;
let editingAnswerId = null;

function loadAnswers() {
  try { return JSON.parse(localStorage.getItem('hhf_answers') || '{}'); } catch { return {}; }
}
function saveAnswers(map) {
  localStorage.setItem('hhf_answers', JSON.stringify(map));
}

function openPost(id) {
  const posts = loadPosts();
  const post = posts.find(p => String(p.id) === String(id));
  if (!post || !postView || !postDetail) return;
  currentPostId = post.id;
  postDetail.innerHTML = `
    <h2>${escapeHtml(post.title)}</h2>
    <p class="post-meta">${escapeHtml(post.subject)} • by ${escapeHtml(post.author || 'Anonymous')} • ${timeAgo(post.createdAt)}${post.updatedAt ? ' • edited' : ''}</p>
    <p>${escapeHtml(post.details)}</p>
  `;
  renderAnswers();
  postView.style.display = 'block';
  window.location.hash = '#postView';
}

function renderAnswers() {
  if (!answersList || currentPostId == null) return;
  const map = loadAnswers();
  const answers = (map[currentPostId] || []).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  if (answers.length === 0) {
    answersList.innerHTML = '<p class="notice">No answers yet. Share what you know!</p>';
    return;
  }
  answersList.innerHTML = answers.map(a => {
    const isMine = a.author === getCurrentStudentName() && a.author !== '';
    const actions = isMine ? `
      <div class="answer-actions">
        <button class="btn small" data-answer-action="edit" data-id="${a.id}">Edit</button>
        <button class="btn small danger" data-answer-action="delete" data-id="${a.id}">Delete</button>
      </div>` : '';
    return `
      <div class="answer">
        <div>${escapeHtml(a.details)}</div>
        <div class="meta">by ${escapeHtml(a.author || 'Anonymous')} • ${timeAgo(a.createdAt)}${a.updatedAt ? ' • edited' : ''}</div>
        ${actions}
      </div>`;
  }).join('');

  answersList.querySelectorAll('[data-answer-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => startEditAnswer(btn.getAttribute('data-id')));
  });
  answersList.querySelectorAll('[data-answer-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => deleteAnswer(btn.getAttribute('data-id')));
  });
}

if (closePostView) {
  closePostView.addEventListener('click', () => {
    if (postView) postView.style.display = 'none';
    currentPostId = null;
    editingAnswerId = null;
    if (answerForm) answerForm.reset();
  });
}

if (answerForm) {
  answerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!answerDetails) return;
    const text = answerDetails.value.trim();
    if (text.length < 4) {
      if (answerError) answerError.textContent = 'Answer is too short.';
      return;
    } else if (answerError) answerError.textContent = '';

    const map = loadAnswers();
    const list = map[currentPostId] || [];
    const author = getCurrentStudentName();
    if (editingAnswerId != null) {
      const idx = list.findIndex(a => String(a.id) === String(editingAnswerId));
      if (idx !== -1 && list[idx].author === author) {
        list[idx] = { ...list[idx], details: text, updatedAt: new Date().toISOString() };
        map[currentPostId] = list;
        saveAnswers(map);
        renderAnswers();
        answerForm.reset();
        if (answerCancel) answerCancel.style.display = 'none';
        editingAnswerId = null;
        return;
      }
    }

    const item = { id: Date.now(), details: text, author, createdAt: new Date().toISOString() };
    list.push(item);
    map[currentPostId] = list;
    saveAnswers(map);
    renderAnswers();
    answerForm.reset();
  });
}

function startEditAnswer(id) {
  const map = loadAnswers();
  const list = map[currentPostId] || [];
  const item = list.find(a => String(a.id) === String(id));
  if (!item) return;
  if (item.author !== getCurrentStudentName()) return alert('You can only edit your own answer.');
  if (answerDetails) answerDetails.value = item.details;
  editingAnswerId = item.id;
  const answerSubmit = document.getElementById('answerSubmit');
  if (answerSubmit) answerSubmit.textContent = 'Save changes';
  if (answerCancel) answerCancel.style.display = 'inline-block';
}

function deleteAnswer(id) {
  const map = loadAnswers();
  const list = map[currentPostId] || [];
  const item = list.find(a => String(a.id) === String(id));
  if (!item) return;
  if (item.author !== getCurrentStudentName()) return alert('You can only delete your own answer.');
  if (!confirm('Delete this answer?')) return;
  map[currentPostId] = list.filter(a => String(a.id) !== String(id));
  saveAnswers(map);
  renderAnswers();
}

if (answerCancel) {
  answerCancel.addEventListener('click', () => {
    const answerSubmit = document.getElementById('answerSubmit');
    editingAnswerId = null;
    if (answerSubmit) answerSubmit.textContent = 'Post answer';
    if (answerCancel) answerCancel.style.display = 'none';
    if (answerForm) answerForm.reset();
  });
}


