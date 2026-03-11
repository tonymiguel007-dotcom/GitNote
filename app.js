// ===========================================
// GITNOTE – Frontend with Backend API (fetch)
// ===========================================

const API_BASE = 'http://localhost:3000/api';

// ---------- Authentication ----------
async function registerUser(username, password) {
    const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
}

async function loginUser(username, password) {
    const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('token', data.token);
    return data;
}

function logoutUser() {
    localStorage.removeItem('token');
}

function getCurrentUser() {
    const token = localStorage.getItem('token');
    return token ? { username: token } : null;
}

function isAuthenticated() {
    return !!localStorage.getItem('token');
}

// ---------- Notes ----------
async function getNotes() {
    const res = await fetch(`${API_BASE}/notes`);
    if (!res.ok) throw new Error('Failed to fetch notes');
    return await res.json();
}

async function getNoteById(id) {
    const res = await fetch(`${API_BASE}/notes/${id}`);
    if (!res.ok) throw new Error('Note not found');
    return await res.json();
}

async function createNote(title, content, parentId = null) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE}/notes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify({ title, content, parentId })
    });
    if (!res.ok) throw new Error('Failed to create note');
    return await res.json();
}

async function updateNote(id, title, content) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE}/notes/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify({ title, content })
    });
    if (!res.ok) throw new Error('Failed to update note');
    return await res.json();
}

async function deleteNote(id) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE}/notes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
    });
    if (!res.ok) throw new Error('Failed to delete note');
    return await res.json();
}

async function getForks(parentId) {
    const res = await fetch(`${API_BASE}/notes/${parentId}/forks`);
    if (!res.ok) throw new Error('Failed to fetch forks');
    return await res.json();
}

async function forkNote(originalId) {
    const original = await getNoteById(originalId);
    if (!original) throw new Error('Original note not found');
    const newNote = await createNote(
        original.title + ' (fork)',
        original.content,
        originalId
    );
    window.location.href = `editor.html?id=${newNote.id}`;
}

// ---------- Navbar Helper ----------
async function updateNavbar() {
    const navRight = document.getElementById('navRight');
    if (!navRight) return;
    const user = getCurrentUser();
    if (user) {
        navRight.innerHTML = `
            <div class="profile-menu">
                <a href="profile.html" class="username">${escapeHtml(user.username)}</a>
                <button onclick="logout()" class="logout-btn"><i class="fas fa-sign-out-alt"></i> Logout</button>
            </div>
        `;
    } else {
        navRight.innerHTML = `
            <a href="login.html" class="auth-link">Sign In</a>
            <a href="register.html" class="auth-link">Sign Up</a>
        `;
    }
}

// Global logout
window.logout = function() {
    logoutUser();
    updateNavbar();
    window.location.href = 'index.html';
};

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}
// ===========================================
// NEW FEATURES: Comments, Export, Dark Mode, Stats
// ===========================================

// ---------- Comments ----------
async function getComments(noteId) {
    const res = await fetch(`${API_BASE}/notes/${noteId}/comments`);
    if (!res.ok) return [];
    return await res.json();
}

async function addComment(noteId, text) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');
    
    const res = await fetch(`${API_BASE}/notes/${noteId}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error('Failed to add comment');
    return await res.json();
}

// ---------- Export Functions ----------
function exportNoteAsPDF(title, content) {
    // Create a printable version
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 2rem; }
                h1 { color: #2D9CDB; }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <div>${content}</div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function exportNoteAsMarkdown(title, content) {
    // Convert HTML to plain text for markdown
    const temp = document.createElement('div');
    temp.innerHTML = content;
    const text = temp.textContent || temp.innerText || '';
    
    const markdown = `# ${title}\n\n${text}`;
    downloadFile(`${title}.md`, markdown);
}

function exportNoteAsText(title, content) {
    const temp = document.createElement('div');
    temp.innerHTML = content;
    const text = temp.textContent || temp.innerText || '';
    
    downloadFile(`${title}.txt`, `${title}\n\n${text}`);
}

function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ---------- Dark Mode ----------
function initDarkMode() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }
    
    // Add toggle button to navbar if not exists
    const navRight = document.getElementById('navRight');
    if (navRight && !document.getElementById('darkModeToggle')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'darkModeToggle';
        toggleBtn.className = 'dark-mode-toggle';
        toggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
        toggleBtn.addEventListener('click', toggleDarkMode);
        navRight.appendChild(toggleBtn);
    }
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    
    const icon = document.querySelector('#darkModeToggle i');
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Call initDarkMode when page loads
document.addEventListener('DOMContentLoaded', initDarkMode);

// ---------- Keyboard Shortcuts (Global) ----------
document.addEventListener('keydown', (e) => {
    // Ctrl+N = New note (any page)
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        if (isAuthenticated()) {
            window.location.href = 'editor.html';
        } else {
            alert('Please log in to create a note.');
            window.location.href = 'login.html';
        }
    }
    
    // Ctrl+F = Focus search (on index page)
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    // Escape = Close modals/palettes
    if (e.key === 'Escape') {
        const colorPalette = document.getElementById('colorPalette');
        if (colorPalette) {
            colorPalette.classList.add('hidden');
        }
    }
});