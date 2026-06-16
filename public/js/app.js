/**
 * StickerSwap 2026 - Main Application JavaScript
 */

// ============================================
// UTILITY FUNCTIONS
// ============================================

const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

const debounce = (fn, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

const throttle = (fn, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Storage error:', e);
    }
  }
};

// ============================================
// TOAST NOTIFICATION SYSTEM
// ============================================

const Toast = {
  container: null,
  
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  
  show(message, type = 'success', title = '', duration = 5000) {
    this.init();
    
    const icons = {
      success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
      error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icons[type]}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    
    this.container.appendChild(toast);
    
    const close = () => {
      toast.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    };
    
    toast.querySelector('.toast-close').addEventListener('click', close);
    
    if (duration > 0) {
      setTimeout(close, duration);
    }
    
    return toast;
  },
  
  success(message, title) {
    return this.show(message, 'success', title);
  },
  
  error(message, title) {
    return this.show(message, 'error', title);
  },
  
  warning(message, title) {
    return this.show(message, 'warning', title);
  }
};

// ============================================
// MODAL SYSTEM
// ============================================

const Modal = {
  activeModal: null,
  
  create(options = {}) {
    const {
      title = '',
      content = '',
      size = 'medium',
      showClose = true,
      onClose = null
    } = options;
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal modal-${size}" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          ${showClose ? `
            <button class="modal-close" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          ` : ''}
        </div>
        <div class="modal-body">${content}</div>
      </div>
    `;
    
    const close = () => {
      overlay.classList.remove('active');
      setTimeout(() => {
        overlay.remove();
        this.activeModal = null;
        if (onClose) onClose();
      }, 300);
    };
    
    if (showClose) {
      overlay.querySelector('.modal-close').addEventListener('click', close);
    }
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    
    overlay.close = close;
    
    return overlay;
  },
  
  open(options) {
    if (this.activeModal) {
      this.activeModal.close();
    }
    
    const modal = this.create(options);
    document.body.appendChild(modal);
    this.activeModal = modal;
    
    // Trigger reflow for animation
    modal.offsetHeight;
    modal.classList.add('active');
    
    return modal;
  },
  
  confirm(options = {}) {
    const {
      title = 'Confirm',
      message = 'Are you sure?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      confirmClass = 'btn-danger',
      onConfirm = () => {},
      onCancel = () => {}
    } = options;
    
    return new Promise((resolve) => {
      const modal = this.open({
        title,
        content: `<p style="margin:0;color:var(--color-dark-gray);">${message}</p>`,
        onClose: () => resolve(false)
      });
      
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      footer.innerHTML = `
        <button class="btn btn-secondary modal-cancel">${cancelText}</button>
        <button class="btn ${confirmClass} modal-confirm">${confirmText}</button>
      `;
      
      footer.querySelector('.modal-cancel').addEventListener('click', () => {
        modal.close();
        onCancel();
        resolve(false);
      });
      
      footer.querySelector('.modal-confirm').addEventListener('click', () => {
        modal.close();
        onConfirm();
        resolve(true);
      });
      
      modal.querySelector('.modal').appendChild(footer);
    });
  }
};

// ============================================
// FORM VALIDATION
// ============================================

const Validation = {
  rules: {
    required: (value) => value.trim() !== '' || 'This field is required',
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Please enter a valid email',
    minLength: (length) => (value) => value.length >= length || `Must be at least ${length} characters`,
    maxLength: (length) => (value) => value.length <= length || `Must be no more than ${length} characters`,
    match: (otherField) => (value) => value === $(`[name="${otherField}"]`).value || 'Passwords do not match',
    number: (value) => !isNaN(value) && value !== '' || 'Please enter a valid number'
  },
  
  validateField(field, rules) {
    const value = field.value;
    const errors = [];
    
    for (const rule of rules) {
      let result;
      if (typeof rule === 'function') {
        result = rule(value);
      } else if (typeof rule === 'string' && this.rules[rule]) {
        result = this.rules[rule](value);
      }
      
      if (result !== true) {
        errors.push(typeof result === 'string' ? result : 'Invalid value');
      }
    }
    
    return errors;
  },
  
  validateForm(form, schema) {
    const errors = {};
    let isValid = true;
    
    // Clear previous errors
    form.querySelectorAll('.form-error').forEach(el => el.remove());
    form.querySelectorAll('.form-input-error').forEach(el => el.classList.remove('form-input-error'));
    
    for (const [fieldName, rules] of Object.entries(schema)) {
      const field = form.querySelector(`[name="${fieldName}"]`);
      if (!field) continue;
      
      const fieldErrors = this.validateField(field, rules);
      
      if (fieldErrors.length > 0) {
        errors[fieldName] = fieldErrors;
        isValid = false;
        
        field.classList.add('form-input-error');
        
        const errorEl = document.createElement('div');
        errorEl.className = 'form-error';
        errorEl.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          ${fieldErrors[0]}
        `;
        field.parentNode.insertBefore(errorEl, field.nextSibling);
      }
    }
    
    return { isValid, errors };
  }
};

// ============================================
// API SIMULATION (for demo purposes)
// ============================================

const API = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock data
  stickers: [
    { id: 1, number: 'BRA1', name: 'Alisson', team: 'Brazil', rarity: 'legendary', type: 'duplicate', quantity: 2 },
    { id: 2, number: 'BRA2', name: 'Marquinhos', team: 'Brazil', rarity: 'rare', type: 'duplicate', quantity: 3 },
    { id: 3, number: 'ARG1', name: 'Messi', team: 'Argentina', rarity: 'legendary', type: 'missing', quantity: 0 },
    { id: 4, number: 'ARG2', name: 'Di Maria', team: 'Argentina', rarity: 'rare', type: 'missing', quantity: 0 },
    { id: 5, number: 'FRA1', name: 'Mbappe', team: 'France', rarity: 'legendary', type: 'duplicate', quantity: 1 },
    { id: 6, number: 'FRA2', name: 'Griezmann', team: 'France', rarity: 'rare', type: 'missing', quantity: 0 },
    { id: 7, number: 'GER1', name: 'Neuer', team: 'Germany', rarity: 'rare', type: 'duplicate', quantity: 2 },
    { id: 8, number: 'ESP1', name: 'Pedri', team: 'Spain', rarity: 'rare', type: 'duplicate', quantity: 1 },
  ],
  
  trades: [
    { id: 1, user: 'Carlos Silva', city: 'São Paulo', avatar: 'CS', has: { number: 'BRA3', name: 'Neymar Jr' }, wants: { number: 'ARG1', name: 'Messi' }, compatibility: 95 },
    { id: 2, user: 'Maria Garcia', city: 'Buenos Aires', avatar: 'MG', has: { number: 'ARG1', name: 'Messi' }, wants: { number: 'FRA1', name: 'Mbappe' }, compatibility: 88 },
    { id: 3, user: 'John Smith', city: 'London', avatar: 'JS', has: { number: 'ENG1', name: 'Kane' }, wants: { number: 'BRA1', name: 'Alisson' }, compatibility: 82 },
    { id: 4, user: 'Emma Wilson', city: 'Paris', avatar: 'EW', has: { number: 'FRA3', name: 'Dembele' }, wants: { number: 'GER1', name: 'Neuer' }, compatibility: 76 },
  ],
  
  catalog: [
    { id: 1, number: 'BRA1', name: 'Alisson', team: 'Brazil', rarity: 'legendary' },
    { id: 2, number: 'BRA2', name: 'Marquinhos', team: 'Brazil', rarity: 'rare' },
    { id: 3, number: 'BRA3', name: 'Neymar Jr', team: 'Brazil', rarity: 'legendary' },
    { id: 4, number: 'ARG1', name: 'Messi', team: 'Argentina', rarity: 'legendary' },
    { id: 5, number: 'ARG2', name: 'Di Maria', team: 'Argentina', rarity: 'rare' },
    { id: 6, number: 'FRA1', name: 'Mbappe', team: 'France', rarity: 'legendary' },
    { id: 7, number: 'FRA2', name: 'Griezmann', team: 'France', rarity: 'rare' },
    { id: 8, number: 'GER1', name: 'Neuer', team: 'Germany', rarity: 'rare' },
    { id: 9, number: 'ESP1', name: 'Pedri', team: 'Spain', rarity: 'rare' },
    { id: 10, number: 'ENG1', name: 'Kane', team: 'England', rarity: 'rare' },
  ],
  
  currentUser: {
    name: 'Alex Johnson',
    email: 'alex@example.com',
    city: 'New York',
    memberSince: '2024-01-15',
    stats: {
      duplicates: 12,
      missing: 8,
      trades: 5
    }
  },
  
  // API methods
  async login(credentials) {
    await this.delay(800);
    if (credentials.email && credentials.password) {
      storage.set('user', { email: credentials.email, name: 'Alex Johnson' });
      return { success: true, user: this.currentUser };
    }
    throw new Error('Invalid credentials');
  },
  
  async register(data) {
    await this.delay(1000);
    if (data.email && data.password) {
      storage.set('user', { email: data.email, name: data.name });
      return { success: true, user: { ...this.currentUser, ...data } };
    }
    throw new Error('Registration failed');
  },
  
  async getStickers(filter = 'all') {
    await this.delay(500);
    if (filter === 'all') return this.stickers;
    return this.stickers.filter(s => s.type === filter);
  },
  
  async addSticker(data) {
    await this.delay(600);
    const newSticker = { id: Date.now(), ...data };
    this.stickers.push(newSticker);
    return { success: true, sticker: newSticker };
  },
  
  async updateSticker(id, data) {
    await this.delay(600);
    const index = this.stickers.findIndex(s => s.id === id);
    if (index > -1) {
      this.stickers[index] = { ...this.stickers[index], ...data };
      return { success: true, sticker: this.stickers[index] };
    }
    throw new Error('Sticker not found');
  },
  
  async deleteSticker(id) {
    await this.delay(500);
    const index = this.stickers.findIndex(s => s.id === id);
    if (index > -1) {
      this.stickers.splice(index, 1);
      return { success: true };
    }
    throw new Error('Sticker not found');
  },
  
  async getTrades() {
    await this.delay(700);
    return this.trades;
  },
  
  async getCatalog(filters = {}) {
    await this.delay(500);
    let results = [...this.catalog];
    
    if (filters.country) {
      results = results.filter(c => c.team.toLowerCase().includes(filters.country.toLowerCase()));
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      results = results.filter(c => 
        c.name.toLowerCase().includes(search) || 
        c.number.toLowerCase().includes(search)
      );
    }
    
    return results;
  },
  
  async updateProfile(data) {
    await this.delay(800);
    this.currentUser = { ...this.currentUser, ...data };
    return { success: true, user: this.currentUser };
  }
};

// ============================================
// NAVIGATION
// ============================================

const Navigation = {
  init() {
    // Mobile menu toggle
    const toggle = $('.navbar-toggle');
    const sidebar = $('.sidebar');
    
    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }
    
    // Active link highlighting
    const currentPath = window.location.pathname;
    $$('.navbar-link, .sidebar-link').forEach(link => {
      if (link.getAttribute('href') === currentPath) {
        link.classList.add('active');
      }
    });
  }
};

// ============================================
// AUTHENTICATION
// ============================================

const Auth = {
  isLoggedIn() {
    return !!storage.get('user');
  },
  
  getUser() {
    return storage.get('user');
  },
  
  logout() {
    storage.remove('user');
    window.location.href = '/login.html';
  },
  
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  },
  
  updateUI() {
    const user = this.getUser();
    $$('[data-auth]').forEach(el => {
      const when = el.dataset.auth;
      const shouldShow = when === 'logged-in' ? !!user : !user;
      el.classList.toggle('hidden', !shouldShow);
    });
  }
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  Navigation.init();
  Auth.updateUI();
  
  // Global error handler
  window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
  });
  
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled rejection:', e.reason);
  });
});

// Export for use in other scripts
window.StickerSwap = { $, $$, Toast, Modal, Validation, API, Auth, storage };
