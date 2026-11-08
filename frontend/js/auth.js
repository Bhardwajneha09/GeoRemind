/**
 * GeoRemind — Auth & Canvas Animation Module
 * Handles user authentication, token storage, authorized fetch, and landing page interactions.
 */

const API_BASE = 'http://localhost:3000/api';
const TOKEN_KEY = 'geo_token';
const USER_KEY = 'geo_user';

// ==========================================
// Token & User Storage Helpers
// ==========================================

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function getUser() {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

function setUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

function isAuthenticated() {
  const token = getToken();
  return Boolean(token && token.trim().length > 0);
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = 'index.html';
}

// ==========================================
// Authorized Fetch Wrapper
// ==========================================

async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Prepend API_BASE if a relative path was passed
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers
    });

    if (response.status === 401) {
      // Token expired or invalid
      console.warn('Session expired or unauthorized (401). Redirecting to login...');
      logout();
      throw new Error('Session expired. Please log in again.');
    }

    const contentType = response.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMsg = (data && (data.message || data.error)) || `Request failed with status ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

// ==========================================
// Auth API Endpoints
// ==========================================

async function register(name, email, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Registration failed');
    }

    // Server might return { token, user } or { data: { token, user } }
    const token = data.token || (data.data && data.data.token);
    const user = data.user || (data.data && data.data.user) || { name, email };

    if (token) {
      setToken(token);
      setUser(user);
    }

    return { token, user, message: data.message };
  } catch (err) {
    throw err;
  }
}

async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Login failed');
    }

    const token = data.token || (data.data && data.data.token);
    const user = data.user || (data.data && data.data.user) || { email };

    if (!token) {
      throw new Error('Authentication token not received from server');
    }

    setToken(token);
    setUser(user);

    return { token, user };
  } catch (err) {
    throw err;
  }
}

/**
 * Checks auth status on page load (dashboard).
 * Calls GET /api/auth/me to verify token authenticity.
 */
async function checkAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'index.html';
    return null;
  }

  try {
    const data = await authFetch('/auth/me');
    const user = data.user || data;
    if (user) {
      setUser(user);
      return user;
    }
    return getUser();
  } catch (err) {
    console.error('Failed to verify session:', err);
    logout();
    return null;
  }
}

// ==========================================
// Particle Starfield Canvas Animation
// ==========================================

function initParticleCanvas() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  const particleCount = window.innerWidth < 768 ? 40 : 75;
  const maxDistance = 120;
  let mouse = { x: null, y: null, radius: 100 };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.7;
      this.vy = (Math.random() - 0.5) * 0.7;
      this.radius = Math.random() * 1.8 + 0.6;
      this.alpha = Math.random() * 0.6 + 0.2;
      // Alternate between cyan and purple
      this.color = Math.random() > 0.4 ? '6, 182, 212' : '124, 58, 237';
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;

      // Mouse gentle interaction
      if (mouse.x !== null && mouse.y !== null) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          this.x -= (dx / dist) * force * 1.5;
          this.y -= (dy / dist) * force * 1.5;
        }
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = `rgba(${this.color}, 0.8)`;
      ctx.fill();
    }
  }

  // Populate particles
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    // Connect close particles with subtle neon lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDistance) {
          const lineAlpha = (1 - dist / maxDistance) * 0.2;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(124, 58, 237, ${lineAlpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    // Update and draw particles
    particles.forEach(p => {
      p.update();
      p.draw();
    });

    requestAnimationFrame(animate);
  }

  animate();
}

// ==========================================
// Landing & Auth Page Handlers
// ==========================================

function initAuthPage() {
  initParticleCanvas();

  // If already authenticated, redirect to dashboard
  if (isAuthenticated()) {
    // Check if redirect query param exists or go directly
    window.location.href = 'dashboard.html';
    return;
  }

  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const authFeedback = document.getElementById('auth-feedback');

  if (!tabLogin || !tabRegister || !formLogin || !formRegister) {
    return;
  }

  // Tab switching
  function switchTab(target) {
    clearFeedback();
    if (target === 'register') {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      formRegister.classList.add('active');
      formLogin.classList.remove('active');
    } else {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.classList.add('active');
      formRegister.classList.remove('active');
    }
  }

  tabLogin.addEventListener('click', () => switchTab('login'));
  tabRegister.addEventListener('click', () => switchTab('register'));

  // Quick switch links inside forms
  const toRegisterLink = document.getElementById('link-to-register');
  const toLoginLink = document.getElementById('link-to-login');
  if (toRegisterLink) toRegisterLink.addEventListener('click', (e) => { e.preventDefault(); switchTab('register'); });
  if (toLoginLink) toLoginLink.addEventListener('click', (e) => { e.preventDefault(); switchTab('login'); });

  function showFeedback(msg, isSuccess = false) {
    if (!authFeedback) return;
    authFeedback.textContent = msg;
    authFeedback.style.color = isSuccess ? 'var(--success)' : 'var(--danger)';
    authFeedback.style.display = 'block';
  }

  function clearFeedback() {
    if (!authFeedback) return;
    authFeedback.textContent = '';
    authFeedback.style.display = 'none';
  }

  function setButtonLoading(btn, isLoading, defaultText) {
    if (isLoading) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> <span>Please wait...</span>`;
    } else {
      btn.disabled = false;
      btn.innerHTML = defaultText;
    }
  }

  // Login Form Submission
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFeedback();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = formLogin.querySelector('button[type="submit"]');

    if (!email || !password) {
      showFeedback('Please fill in both email and password.');
      return;
    }

    try {
      setButtonLoading(submitBtn, true, 'Sign In');
      await login(email, password);
      showFeedback('Login successful! Redirecting...', true);
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 600);
    } catch (err) {
      showFeedback(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setButtonLoading(submitBtn, false, 'Sign In');
    }
  });

  // Register Form Submission
  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFeedback();

    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const submitBtn = formRegister.querySelector('button[type="submit"]');

    if (!name || !email || !password) {
      showFeedback('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      showFeedback('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      showFeedback('Passwords do not match.');
      return;
    }

    try {
      setButtonLoading(submitBtn, true, 'Create Account');
      const res = await register(name, email, password);

      // If token wasn't returned on register, log them in automatically
      if (!getToken()) {
        await login(email, password);
      }

      showFeedback('Account created successfully! Launching dashboard...', true);
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 700);
    } catch (err) {
      showFeedback(err.message || 'Registration failed. Please try again.');
    } finally {
      setButtonLoading(submitBtn, false, 'Create Account');
    }
  });
}

// Export functions to window
window.GeoAuth = {
  getToken,
  setToken,
  getUser,
  setUser,
  isAuthenticated,
  logout,
  authFetch,
  register,
  login,
  checkAuth,
  initAuthPage
};

// Auto initialize on DOM ready if on landing page
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('particle-canvas')) {
    initAuthPage();
  }
});
