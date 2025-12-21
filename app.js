/*
 * =================================================================================
 * APP.JS - Version 21.0.0 (Ultimate Fixes + Performance Optimization)
 * تم دمج كافة الإصلاحات: Retry Logic, Timeout, Activity Sync, 404 Handling
 * =================================================================================
 */

// 1. الثوابت والإعدادات
// ✅ التعديل: استخدام رابط Fly.io الذي تم الرفع عليه بنجاح في الخطوة السابقة
const API_URL = 'https://tawal-backend-main.fly.dev/api';
const STORAGE_KEY_STUDENT_ID = 'tawal_student_id_v2';
const STORAGE_KEY_USER = 'tawal_user_data_v2';
const STORAGE_KEY_FP = 'tawal_device_fp_fixed';

// إعدادات الكاش والمواد
const DATA_CACHE = new Map();
const CACHE_DURATION = 2 * 60 * 1000;
const DEFAULT_SUBJECT = 'gis_networks';

// المتغيرات العامة
let CURRENT_STUDENT_ID = null; 
let USER_DATA = null;
let FINGERPRINT_ID = null;
let QUIZ_IN_PROGRESS = false;

// إعدادات المستويات
const LEVEL_CONFIG = [
    { id: 1, suffix: '_quiz_1.json', titleSuffix: 'المستوى 1', name: 'المستوى الأول (مبتدئ)', requiredScore: 80 },
    { id: 2, suffix: '_quiz_2.json', titleSuffix: 'المستوى 2', name: 'المستوى الثاني (متوسط)', requiredScore: 85 },
    { id: 3, suffix: '_quiz_3.json', titleSuffix: 'المستوى 3', name: 'المستوى الثالث (متقدم)', requiredScore: 90 }
];

// الشعار
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4"><path d="M40 8H8c-2.21 0-4 1.79-4 4v24c0 2.21 1.79 4 4 4h32c2.21 0 4-1.79 4-4V12c0-2.21-1.79-4-4-4z" fill="currentColor"/><path d="M18 20l6 12 6-12" stroke="white" stroke-width="2"/><line x1="16" y1="20" x2="32" y2="20" stroke="white" stroke-width="2"/></svg>`;

// المواد الدراسية
const SUBJECTS = {
    gis_networks: { id: 'gis_networks', title: "تطبيقات نظم المعلومات الجغرافية فى الشبكات", icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>' },
    transport: { id: 'transport', title: "جغرافية النقل والمواصلات", icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 17l5 5"></path><path d="M10 17l5 5"></path></svg>' },
    geo_maps: { id: 'geo_maps', title: "الخرائط الجيولوجية", icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path></svg>' },
    projections: { id: 'projections', title: "كتاب مساقط الخرائط", icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path></svg>' },
    research: { id: 'research', title: "مقرر مناهج البحث الجغرافى", icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 13.3V3a1 1 0 0 1 1-1h11l5 5v10.3"></path></svg>' },
    surveying_texts: { id: 'surveying_texts', title: "نصوص جغرافية فى المساحة والخرائط", icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20"></path></svg>' },
    arid_lands: { id: 'arid_lands', title: "جغرافيا الاراضي الجافة", icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v2"></path><path d="M22 12h-2"></path></svg>' }
};

// =================================================================
// 2. أدوات مساعدة (Helpers) & Security
// =================================================================
function $(id) { return document.getElementById(id); }

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    let icon = '🔔';
    if(type === 'error') icon = '❌';
    if(type === 'success') icon = '✅';
    toast.innerHTML = `<span style="font-size:1.2rem">${icon}</span> <span>${message}</span>`;
    if(type === 'error') toast.style.background = 'var(--color-incorrect)';
    if(type === 'success') toast.style.background = 'var(--primary-gradient)';
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideInLeft 0.3s reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ✅ المشكلة 2: تحسين recordActivity لتكون Async وتنتظر الرد لضمان التسجيل في السيرفر
async function recordActivity(type, name) {
    if (!CURRENT_STUDENT_ID) return;
    try {
        console.log(`📡 Recording: ${type} - ${name}`);
        const response = await fetch(`${API_URL}/log-activity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                studentId: parseInt(CURRENT_STUDENT_ID), 
                activityType: type, 
                subjectName: name 
            })
        });
        if (!response.ok) console.warn('⚠️ Activity logging failed:', response.status);
    } catch(e) {
        console.warn('⚠️ Activity logging error:', e.message);
    }
}

function encryptData(data) { return btoa(JSON.stringify(data)); }
function decryptData(encrypted) { try { return JSON.parse(atob(encrypted)); } catch { return null; } }

function getStudentId() {
    const savedData = decryptData(localStorage.getItem(STORAGE_KEY_STUDENT_ID));
    if (savedData && savedData.id) return savedData.id;
    return null;
}

function saveStudentId(id) {
    localStorage.setItem(STORAGE_KEY_STUDENT_ID, encryptData({ id: id, timestamp: Date.now() }));
    CURRENT_STUDENT_ID = id;
}

CURRENT_STUDENT_ID = getStudentId();

function getSubjectKey() { 
    try { return (new URLSearchParams(window.location.search)).get('subject') || DEFAULT_SUBJECT; } 
    catch (e) { return DEFAULT_SUBJECT; } 
}

function shuffleArray(array) { 
    const s = [...array]; 
    for (let i = s.length - 1; i > 0; i--) { 
        const j = Math.floor(Math.random() * (i + 1)); 
        [s[i], s[j]] = [s[j], s[i]]; 
    } 
    return s; 
}

function showLoading(el, msg='جاري التحميل...') { 
    if(el.id === 'subjects-grid') {
        el.innerHTML = `<div class="skeleton-card" style="height:280px"></div><div class="skeleton-card" style="height:280px"></div><div class="skeleton-card" style="height:280px"></div>`;
    } else {
        el.innerHTML = `<div style="text-align:center;padding:3rem;"><div class="spinner"></div><p>${msg}</p></div>`; 
    }
}

function validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase()); }

function showError(title, message) { 
    const qc = document.querySelector('.quiz-container'); 
    const msg = `<p class="placeholder" style="color:var(--color-incorrect); text-align:center; padding:3rem;">${message}</p>`; 
    if (qc) qc.innerHTML = `<div class="quiz-header"><h2>${title}</h2></div><div class="quiz-body">${msg}</div>`; 
    else showToast(`${title}: ${message}`, 'error');
}

// ✅ المشكلة 10: تحسين تنسيق التاريخ والوقت لضمان العمل على جميع المتصفحات
function formatDate(dateString) {
    if (!dateString || dateString === 'null' || dateString === 'undefined') return '-';
    try {
        let safeDate = String(dateString).replace(' ', 'T');
        if (!safeDate.includes('Z') && !safeDate.includes('+')) safeDate += 'Z';
        const d = new Date(safeDate);
        if (isNaN(d.getTime())) return '-';
        return new Intl.DateTimeFormat('ar-EG', {
            timeZone: 'Africa/Cairo',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: true
        }).format(d);
    } catch (e) { return '-'; }
}

// =================================================================
// 3. الاتصال بالسيرفر (API) مع الـ Retry Logic
// =================================================================
// ✅ المشكلة 12: إضافة خاصية الـ Retries والـ Timeout لضمان استقرار الاتصال
async function apiRequest(endpoint, opts = {}, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 ثواني مهلة

            const res = await fetch(`${API_URL}${endpoint}`, { 
                ...opts, 
                headers: { 'Content-Type': 'application/json', ...opts.headers },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (res.status === 403) {
                const data = await res.json().catch(() => ({}));
                if (data.error === 'Device Blocked' || data.error === 'Account Blocked') {
                    document.body.innerHTML = `
                        <div style="height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;background:#000;color:#e74c3c;text-align:center;padding:20px;z-index:99999;position:fixed;top:0;left:0;width:100%;">
                            <div style="font-size:5rem;">⛔</div>
                            <h1 style="margin:20px 0;">تم حظر الجهاز</h1>
                            <p style="font-size:1.2rem;">تم منع وصولك إلى المنصة من قبل الإدارة.</p>
                        </div>`;
                    throw new Error('Blocked');
                }
            }

            if (res.status === 429 || res.status >= 500) {
                if (attempt < retries) {
                    console.warn(`⚠️ API attempt ${attempt + 1} failed, retrying...`);
                    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                    continue;
                }
            }

            if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
            return res;
        } catch (err) { 
            if(err.message === 'Blocked') throw err;
            if (attempt === retries) {
                console.error('❌ API Error after retries:', err);
                return null;
            }
        }
    }
    return null;
}

// =================================================================
// 4. البصمة والأمان
// =================================================================
async function getFingerprint() {
    let savedFp = localStorage.getItem(STORAGE_KEY_FP);
    if (!savedFp) {
        savedFp = 'fp_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem(STORAGE_KEY_FP, savedFp);
    }
    try {
        await apiRequest('/verify-fingerprint', { method: 'POST', body: JSON.stringify({ fingerprint: savedFp }) });
    } catch(e) {}
    return savedFp;
}

// =================================================================
// 5. بدء التطبيق (Initialization)
// =================================================================
document.addEventListener('DOMContentLoaded', async () => {
    initThemeToggle();
    
    // ✅ المشكلة 5: تحسين جلب الإحصائيات مع Timeout وبيانات بديلة (Fallback)
    if (document.getElementById('total-students')) {
        const fetchWithTimeout = (url, timeout = 5000) => {
            return Promise.race([
                fetch(url),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
        };

        fetchWithTimeout(`${API_URL}/public-stats`)
            .then(res => {
                if (!res.ok) throw new Error('Stats API failed');
                return res.json();
            })
            .then(stats => {
                animateCounter(document.getElementById('total-students'), stats.totalStudents || 0, 2000);
                animateCounter(document.getElementById('total-quizzes'), stats.totalQuizzes || 0, 2500);
            })
            .catch(e => {
                console.warn('📊 Using fallback stats:', e.message);
                animateCounter(document.getElementById('total-students'), 1250, 2000); 
                animateCounter(document.getElementById('total-quizzes'), 5400, 2500);
            });
    }

    if (window.location.href.includes('dashboard.html')) {
        const dashLink = document.querySelector('.dashboard-link');
        if(dashLink) dashLink.classList.add('active');
    }

    FINGERPRINT_ID = await getFingerprint();

    if (CURRENT_STUDENT_ID) {
        try {
            await apiRequest('/login', { method:'POST', body: JSON.stringify({ studentId: CURRENT_STUDENT_ID, fingerprint: FINGERPRINT_ID }) });
        } catch(e) {}
    }

    await verifyStudent();

    if (!CURRENT_STUDENT_ID) {
        if (!(await registerStudent(FINGERPRINT_ID))) return;
    }

    const key = getSubjectKey();
    if ($('subjects-grid')) initIndexPage();
    else if ($('quiz-body')) initQuizPage(key);
    else if ($('summary-content-files')) initSummaryPage(key);
    else if ($('dashboard-content')) initDashboardPage();
});

// ✅ المشكلة 8: التحسين الذكي للتحقق ومسح الجلسة إذا كان الطالب محذوفاً (404)
async function verifyStudent() {
    if (!CURRENT_STUDENT_ID) return false;
    try { 
        const res = await apiRequest(`/students/${CURRENT_STUDENT_ID}`); 
        
        // إذا عاد السيرفر بـ 404 فهذا يعني أن الطالب حُذف من لوحة الإدارة
        if (!res || res.status === 404) {
            console.warn('❌ Student session invalid (404). Resetting...');
            localStorage.clear();
            location.reload();
            return false;
        }
        
        const s = await res.json(); 
        if (!s || !s.id) {
            localStorage.clear();
            location.reload();
            return false; 
        }
        
        if (s.isblocked) { 
            localStorage.clear(); 
            showToast('⛔ تم حظر هذا الحساب من قبل الإدارة.', 'error');
            setTimeout(() => location.reload(), 2000);
            return false; 
        } 
        
        USER_DATA = s; 
        return true; 
    } catch (e) { 
        if(e.message !== 'Blocked') {
            localStorage.clear();
            location.reload();
        }
        return false; 
    }
}

async function registerStudent(fp) {
    const n = prompt('أهلاً بك في Tawal Academy 🎓\nالرجاء كتابة الاسم:'); 
    if (!n || n.trim().length < 2) return false;
    const e = prompt('الرجاء كتابة البريد الإلكتروني:'); 
    if (!e || !validateEmail(e)) { showToast("البريد غير صحيح", 'error'); return false; }
    try {
        const res = await apiRequest(`/students/register`, { method: 'POST', body: JSON.stringify({name:n, email:e, fingerprint:fp}) });
        if(!res) return false;
        const d = await res.json();
        saveStudentId(d.id);
        USER_DATA = d; 
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(d)); 
        showToast(`تم التسجيل بنجاح!`, 'success'); 
        return true; 
    } catch (err) { 
        showToast('فشل التسجيل، حاول مرة أخرى.', 'error'); 
        return false; 
    }
}

window.logoutStudent = async () => {
    if(!confirm('هل أنت متأكد من تسجيل الخروج؟ 🚪')) return;
    if (CURRENT_STUDENT_ID) {
        try {
            await apiRequest('/logout', { method: 'POST', body: JSON.stringify({ studentId: CURRENT_STUDENT_ID }) });
        } catch(e) {}
    }
    localStorage.clear();
    showToast('تم تسجيل الخروج بنجاح', 'success');
    setTimeout(() => location.href = 'index.html', 1000);
};

// =================================================================
// 6. الصفحة الرئيسية (Index Page)
// =================================================================
function initThemeToggle() { 
    const b = $('theme-toggle-btn'); 
    if (localStorage.getItem('theme')==='light') document.body.classList.add('light-mode'); 
    if(b) b.onclick = () => { 
        document.body.classList.toggle('light-mode'); 
        localStorage.setItem('theme', document.body.classList.contains('light-mode')?'light':'dark'); 
    }; 
}

// ✅ المشكلة 6: تحسين animateCounter مع التحقق من قيمة الهدف (Target)
function animateCounter(element, target, duration = 2000) {
    if (!element || target === null || target === undefined) return;
    let start = 0;
    const safeTarget = Math.max(0, parseInt(target) || 0);
    const increment = safeTarget / (duration / 16);
    const timer = setInterval(() => {
        start += increment;
        if (start >= safeTarget) {
            element.textContent = Math.ceil(safeTarget).toLocaleString();
            clearInterval(timer);
        } else {
            element.textContent = Math.ceil(start).toLocaleString();
        }
    }, 16);
}

async function initIndexPage() { 
    const g = $('subjects-grid'); 
    if(!g) return; 
    recordActivity('view_home', 'الصفحة الرئيسية');
    showLoading(g); 
    const logoEl = document.querySelector('.main-header .logo'); 
    if(logoEl) logoEl.innerHTML = LOGO_SVG + ' Tawal Academy'; 
    
    let locks = {};
    try {
        const res = await fetch(`${API_URL}/quiz-status`);
        if(res.ok) locks = await res.json();
    } catch(e) {}

    g.innerHTML=''; 
    for(const k in SUBJECTS){ 
        const s = SUBJECTS[k]; 
        const lockData = locks[k] || { locked: false, message: '' };
        const isLocked = lockData.locked === true;
        let completionRate = (USER_DATA && USER_DATA.progress) ? (USER_DATA.progress[k] || 0) : 0;
        let lockBadge = isLocked ? `<span class="lock-badge">🔒 مغلق</span>` : '';
        let quizAction = isLocked 
            ? `<button disabled class="card-btn disabled" title="${lockData.message}">⛔ ${lockData.message}</button>`
            : `<a href="quiz.html?subject=${k}" class="card-btn btn-quiz">🧠 ابدأ الاختبار</a>`;

        g.innerHTML += `
            <div class="subject-card modern-card" data-tilt>
                ${lockBadge}
                <div class="card-icon-wrapper">
                    <div class="progress-ring" style="--progress: ${completionRate}">
                        <div class="card-icon">${s.icon}</div>
                    </div>
                </div>
                <h3 class="card-title">${s.title}</h3>
                <div class="card-meta"><span class="meta-item">📊 ${completionRate}% مكتمل</span></div>
                <div class="card-actions">
                    ${quizAction}
                    <a href="summary.html?subject=${k}" class="card-btn btn-summary">📖 الملخصات</a>
                </div>
            </div>`; 
    }

    document.querySelectorAll('[data-tilt]').forEach(card => {
        card.onmousemove = (e) => {
            const r = card.getBoundingClientRect();
            const x = e.clientX - r.left, y = e.clientY - r.top;
            const rx = ((y - r.height/2) / r.height/2) * -10, ry = ((x - r.width/2) / r.width/2) * 10;
            card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
        };
        card.onmouseleave = () => card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
    });

    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
        searchBar.oninput = (e) => {
            const q = e.target.value.toLowerCase();
            document.querySelectorAll('.subject-card').forEach(c => {
                c.style.display = c.querySelector('.card-title').textContent.toLowerCase().includes(q) ? 'flex' : 'none';
            });
        };
    }
}

// =================================================================
// 7. لوحة الطالب والرسائل (Dashboard)
// =================================================================
async function initDashboardPage() {
    const c = $('dashboard-content'); 
    if(!CURRENT_STUDENT_ID) return; 
    showLoading(c);
    try {
        const [statsRes, resultsRes] = await Promise.all([ 
            apiRequest(`/students/${CURRENT_STUDENT_ID}/stats`), 
            apiRequest(`/students/${CURRENT_STUDENT_ID}/results`) 
        ]);
        const stats = statsRes ? await statsRes.json() : {};
        let html = `<div class="dashboard-header" style="margin-bottom:2rem"><h2>أهلاً ${USER_DATA ? USER_DATA.name : 'يا بطل'} 👋</h2></div>`;
        html += `<div class="dashboard-summary-grid">
            <div class="summary-box"><p class="summary-box-label">الاختبارات</p><p class="summary-box-value">${stats.totalQuizzes||0}</p></div>
            <div class="summary-box"><p class="summary-box-label">المتوسط</p><p class="summary-box-value">${stats.averageScore||0}%</p></div>
            <div class="summary-box"><p class="summary-box-label">الأفضل</p><p class="summary-box-value">${stats.bestScore||0}%</p></div>
        </div>`;
        html += `<button onclick="window.logoutStudent()" class="card-btn" style="background:var(--color-incorrect); width:100%; margin:20px 0; color:white;">🚪 تسجيل الخروج</button>`;
        html += `<div class="subject-card" style="margin-top:20px; background:var(--bg-secondary-color);">
            <h3>📩 الدعم الفني</h3>
            <p style="font-size:0.9rem; margin-bottom:10px;">الرصيد المتبقي اليوم: <span id="msg-limit-count" style="font-weight:bold; color:var(--primary-color)">...</span></p>
            <textarea id="support-msg" rows="3" placeholder="اكتب رسالتك..." style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;"></textarea>
            <button id="send-msg-btn" class="card-btn" style="margin-top:10px; width:100%;">📤 إرسال</button>
            <p id="msg-status" style="margin-top:5px; font-size:0.9rem;"></p>
        </div>`;
        html += `<div class="subject-card" style="margin-top:20px;"><h3>💬 الرسائل السابقة</h3><div id="my-messages-list" style="max-height:300px; overflow-y:auto; padding:10px;">جاري التحميل...</div></div>`;
        c.innerHTML = html;
        setupMessaging();
    } catch(e) { c.innerHTML='<p>فشل تحميل البيانات.</p>'; }
}

async function setupMessaging() {
    const btn = $('send-msg-btn'), txt = $('support-msg'), status = $('msg-status'), limitDisplay = $('msg-limit-count'), msgList = $('my-messages-list');
    async function refreshMessages() {
        try {
            const res = await apiRequest(`/students/${CURRENT_STUDENT_ID}/messages`);
            if(!res) return;
            const data = await res.json();
            limitDisplay.innerText = data.remaining;
            if (data.remaining <= 0) { btn.disabled = true; btn.innerText = '⛔ نفذ الرصيد'; txt.disabled = true; }
            msgList.innerHTML = data.messages.length === 0 ? '<p style="color:#777;text-align:center;">لا توجد رسائل.</p>' : data.messages.map(msg => `
                <div style="background:var(--bg-color); border:1px solid var(--border-color); border-radius:8px; padding:10px; margin-bottom:10px;">
                    <p style="font-weight:bold;">أنت:</p><p style="background:var(--bg-secondary-color); padding:8px; border-radius:5px;">${msg.content}</p>
                    ${msg.adminreply ? `<div style="margin-top:5px; border-top:1px solid #eee; padding-top:5px;"><p style="font-weight:bold; color:var(--color-correct);">الرد:</p><p style="color:var(--color-correct);">${msg.adminreply}</p></div>` : '<small style="color:#999">في الانتظار...</small>'}
                    <small style="display:block; color:#ccc; margin-top:5px; font-size:0.7rem;">${formatDate(msg.createdat)}</small>
                </div>`).join('');
        } catch(e) {}
    }
    btn.onclick = async () => {
        const msg = txt.value.trim(); if(!msg) return;
        btn.disabled = true; btn.innerText = 'جاري الإرسال...';
        try {
            const res = await apiRequest('/messages', { method: 'POST', body: JSON.stringify({ studentId: CURRENT_STUDENT_ID, message: msg }) });
            if(res && res.ok) { 
                const result = await res.json();
                status.innerText = `✅ تم الإرسال!`; status.style.color = 'green';
                txt.value = ''; await refreshMessages(); 
            }
        } catch(e) { status.innerText = '❌ خطأ'; status.style.color = 'red'; }
        finally { btn.disabled = false; btn.innerText = '📤 إرسال'; setTimeout(()=>status.innerText='', 3000); }
    };
    refreshMessages();
}

// =================================================================
// 8. الملخصات (Summary)
// =================================================================
async function checkResourceExists(url) {
    try { const r = await fetch(url, { method: 'HEAD' }); return r.ok; } catch { return false; }
}

async function initSummaryPage(key) {
    if(!SUBJECTS[key]) return;
    const title = SUBJECTS[key].title;
    $('summary-title').innerText = title;
    recordActivity('view_summary', title);
    const fDiv = $('summary-content-files'), iDiv = $('summary-content-images');
    fDiv.innerHTML = '<div style="text-align:center; padding:3rem;"><div class="spinner"></div><p>جاري الفحص...</p></div>';
    try {
        const res = await fetch(`data_${key}/data_${key}_summary.json?v=${Date.now()}`);
        if(!res.ok) throw new Error(); 
        const d = await res.json();
        const fileChecks = (d.files || []).map(async f => (await checkResourceExists(f.path)) ? f : null);
        const imageChecks = (d.images || []).map(async img => (await checkResourceExists(img.path)) ? img : null);
        const [validFiles, validImages] = await Promise.all([Promise.all(fileChecks), Promise.all(imageChecks)]);
        
        const fResults = validFiles.filter(f => f);
        fDiv.innerHTML = fResults.length > 0 ? `<div class="summary-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(250px, 1fr)); gap:15px; margin-top:15px;">` + fResults.map((f, i) => `
            <a href="${f.path}" target="_blank" onclick="recordActivity('download_file', '${f.name}')" class="summary-card active" style="display:flex; align-items:center; gap:10px; padding:15px; background:var(--bg-secondary-color); border:2px solid var(--color-correct); border-radius:10px; text-decoration:none; color:var(--text-color);">
                <div style="background:var(--color-correct); color:#fff; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">${i+1}</div>
                <div><div style="font-weight:bold;">${f.name}</div><div style="font-size:0.8rem; color:var(--color-correct);">📥 اضغط للتحميل</div></div>
            </a>`).join('') + `</div>` : '<p class="placeholder">لا توجد ملفات.</p>';

        const iResults = validImages.filter(img => img);
        iDiv.innerHTML = iResults.length > 0 ? `<div class="gallery-grid">` + iResults.map(img => `<div class="gallery-item"><img src="${img.path}" onclick="window.open('${img.path}', '_blank')"><p>${img.caption||''}</p></div>`).join('') + `</div>` : '<p class="placeholder">لا توجد صور.</p>';

        $('btn-summary-files').onclick = ()=>{ fDiv.style.display='block'; iDiv.style.display='none'; }; 
        $('btn-summary-images').onclick = ()=>{ fDiv.style.display='none'; iDiv.style.display='block'; }; 
        $('btn-summary-files').click();
    } catch(e) { fDiv.innerHTML='<p class="placeholder">الملفات غير متوفرة حالياً.</p>'; }
}

// =================================================================
// 9. صفحة الاختبارات (Quiz Page)
// =================================================================
async function initQuizPage(key) {
    if(!SUBJECTS[key]) return;
    recordActivity('open_quiz_menu', SUBJECTS[key].title);
    const locks = await (async () => { try { const r = await fetch(`${API_URL}/quiz-status`); return r.ok ? await r.json() : {}; } catch { return {}; } })();
    if (locks[key]?.locked) { showError('عذراً', locks[key].message || 'الاختبار مغلق.'); return; }
    $('quiz-title').innerText = SUBJECTS[key].title; 
    const body = $('quiz-body'); showLoading(body);
    let results = []; try { const r = await apiRequest(`/students/${CURRENT_STUDENT_ID}/results`); results = await r.json(); } catch(e){}
    let html = '<div class="levels-grid" style="display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">';
    LEVEL_CONFIG.forEach((lvl, i) => {
        let locked = false, reason = '';
        if (i > 0) {
            const best = results.filter(r => r.quizName.includes(LEVEL_CONFIG[i-1].titleSuffix)).reduce((m, r) => Math.max(m, r.score || 0), 0);
            if (best < LEVEL_CONFIG[i-1].requiredScore) { locked = true; reason = `اجتز ${LEVEL_CONFIG[i-1].name} بنسبة ${LEVEL_CONFIG[i-1].requiredScore}%`; }
        }
        html += `<div class="subject-card" style="${locked?'opacity:0.7':''}"><h3>${lvl.name}</h3><p>${locked?reason:`الحد الأدنى: ${lvl.requiredScore}%`}</p>
            <button class="card-btn" ${locked?'disabled':''} onclick="loadLevelFile('${key}', ${i})">${locked?'🔒 مغلق':'🚀 ابدأ'}</button></div>`;
    });
    body.innerHTML = html + '</div>';
}

window.loadLevelFile = async (key, idx) => {
    const cfg = LEVEL_CONFIG[idx];
    try {
        const res = await fetch(`data_${key}/data_${key}${cfg.suffix}?v=${Date.now()}`);
        if(!res.ok) throw new Error();
        const data = await res.json();
        recordActivity('start_quiz', `${SUBJECTS[key].title} - ${cfg.titleSuffix}`);
        $('results-container').style.display = 'none'; $('quiz-body').style.display = 'block'; $('quiz-footer').style.display = 'block';
        runQuizEngine(data.questions, `${SUBJECTS[key].title} - ${cfg.titleSuffix}`, SUBJECTS[key].id);
    } catch(e) { showToast('الملف غير موجود.', 'error'); }
};

// =================================================================
// 10. محرك الاختبار (Quiz Engine)
// =================================================================
function runQuizEngine(questions, title, subjectId) {
    if (!questions || questions.length === 0) return;
    QUIZ_IN_PROGRESS = true; let idx = 0, correct = 0, incorrectList = [];
    const shuffled = shuffleArray(questions);
    const body = $('quiz-body'), footer = $('quiz-footer'), nextBtn = $('next-btn');
    body.style.display = 'block'; footer.style.display = 'block'; nextBtn.style.display = 'block';
    $('quiz-title').innerText = title;
    body.innerHTML = `<h3 id="q-txt" style="margin-bottom:1.5rem;"></h3><div id="opts" class="options-container"></div><p id="fb" class="feedback"></p>`;
    
    function loadQ() {
        const q = shuffled[idx]; $('q-txt').innerText = q.question; 
        $('question-counter').innerText = `سؤال ${idx+1} / ${shuffled.length}`; 
        $('progress-bar').style.width = `${((idx+1)/shuffled.length)*100}%`;
        const fb = $('fb'); fb.innerText = ''; nextBtn.disabled = true;
        const optsDiv = $('opts'); optsDiv.innerHTML = '';
        const opts = q.type==='tf' ? ['صح','خطأ'] : q.options;
        opts.forEach((txt, i) => {
            const b = document.createElement('button'); b.className = 'option-btn'; b.innerText = txt;
            const isCorr = q.type==='tf' ? ((i===0) === (String(q.answer).toLowerCase()==='true')) : (i===q.answer);
            b.onclick = () => {
                document.querySelectorAll('.option-btn').forEach(btn=>btn.disabled=true);
                if(isCorr) { correct++; b.classList.add('correct'); fb.innerHTML = '✅ ممتاز'; }
                else { b.classList.add('incorrect'); fb.innerHTML = '❌ خطأ'; incorrectList.push(q); 
                    const all = document.querySelectorAll('.option-btn');
                    if(q.type==='tf') all[String(q.answer).toLowerCase()==='true'?0:1].classList.add('correct');
                    else all[q.answer].classList.add('correct');
                }
                nextBtn.disabled = false;
            };
            optsDiv.appendChild(b);
        });
    }
    nextBtn.onclick = () => { if(idx < shuffled.length-1) { idx++; loadQ(); } else { showResults(); } };
    
    async function showResults() {
        QUIZ_IN_PROGRESS = false; body.style.display = 'none'; footer.style.display = 'none';
        const resDiv = $('results-container'); resDiv.style.display = 'flex';
        const percent = Math.round((correct / questions.length) * 100);
        if (!title.includes('مراجعة')) {
            await apiRequest('/quiz-results', { method: 'POST', body: JSON.stringify({ studentId: CURRENT_STUDENT_ID, quizName: title, score: percent, totalQuestions: questions.length, correctAnswers: correct, subjectId: subjectId || getSubjectKey() }) });
        }
        resDiv.innerHTML = `<h2>النتيجة: ${percent}%</h2><button onclick="location.reload()" class="next-btn">🔄 إعادة</button>
            <a href="quiz.html?subject=${getSubjectKey()}" class="card-btn">📂 خروج</a>`;
    }
    loadQ();
}