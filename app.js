/*
 * =================================================================================
 * APP.JS - Version 21.0.0 (Ultimate Fixes + Performance Optimization)
 * تم دمج كافة الإصلاحات: Retry Logic, Timeout, Activity Sync, 404 Handling
 * =================================================================================
 */

// 1. الثوابت والإعدادات
// ✅ التعديل: تم تثبيت الرابط على السيرفر الأونلاين (Production) بناءً على طلب المستخدم (Online Only)
// لن يحاول التطبيق الاتصال بـ Localhost حتى لو تم تشغيله محلياً
const API_URL = 'https://tawal-backend-main.fly.dev';
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
// Throttle Activity Logging
const activityQueue = {};

async function recordActivity(type, name) {
    if (!CURRENT_STUDENT_ID) return;

    // ✅ المشكلة 12: Throttling لمنع تكرار تسجيل نفس النشاط خلال 5 ثوانٍ
    const key = `${type}_${name}`;
    if (activityQueue[key] && Date.now() - activityQueue[key] < 5000) return;
    activityQueue[key] = Date.now();

    try {
        const response = await apiRequest('/log-activity', {
            method: 'POST',
            body: JSON.stringify({ 
                studentId: parseInt(CURRENT_STUDENT_ID), 
                activityType: type, 
                subjectName: name 
            })
        });
        if (!response || !response.ok) console.warn('⚠️ Activity logging failed:', response ? response.status : 'network');
    } catch(e) {
        console.warn('⚠️ Activity logging error:', e.message);
    }
}

// ⚠️ تحذير: هذا تشفير بسيط (Encoding) وليس تشفيرًا أمنيًا. لا تقم بتخزين بيانات حساسة جدًا هنا.
function encryptData(data) { return btoa(JSON.stringify(data)); }
function decryptData(encrypted) { try { return JSON.parse(atob(encrypted)); } catch { return null; } }

function getStudentId() {
    const savedData = decryptData(sessionStorage.getItem(STORAGE_KEY_STUDENT_ID));
    if (savedData && savedData.id) return savedData.id;
    return null;
}

function saveStudentId(id) {
    sessionStorage.setItem(STORAGE_KEY_STUDENT_ID, encryptData({ id: id, timestamp: Date.now() }));
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

function encodePath(url) {
    if (!url) return '';
    if (url.includes('%')) return url;
    const parts = url.split('/');
    return parts.map((p, idx) => (idx === 0 && p === '') ? '' : encodeURIComponent(p)).join('/');
}

// ✅ المشكلة 10: تحسين تنسيق التاريخ والوقت لضمان العمل على جميع المتصفحات
function formatDate(dateString) {
    if (!dateString || dateString === 'null' || dateString === 'undefined') return '-';
    try {
        // دعم الـ Timestamps والأرقام
        const d = new Date(isNaN(dateString) ? dateString : Number(dateString));
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

            const res = await fetch(`${API_URL}/api${endpoint}`, { 
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
    let savedFp = sessionStorage.getItem(STORAGE_KEY_FP);
    if (!savedFp) {
        savedFp = 'fp_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        sessionStorage.setItem(STORAGE_KEY_FP, savedFp);
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
        if (res && res.status === 404) {
            console.warn('❌ Student session invalid (404). Resetting...');
            localStorage.clear();
            location.reload();
            return false;
        }

        // إذا فشل الاتصال (res is null) أو حدث خطأ في السيرفر (500)، لا تقم بمسح البيانات
        if (!res || !res.ok) {
            console.warn('⚠️ Server validation failed but keeping session (Network/Server Error)');
            return true; // نفترض أن الطالب موجود مؤقتاً لتجنب تسجيل الخروج أثناء مشاكل الشبكة
        }
        
        const s = await res.json(); 
        if (!s || !s.id) {
            // بيانات غير مفهومة، ربما خطأ في الرد
            console.warn('⚠️ Invalid data received, skipping validation');
            return true; 
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
        if(e.message === 'Blocked') {
            localStorage.clear();
            return false;
        }
        // في حالة أخطاء الشبكة (Offline) أو Timeout، لا نمسح البيانات
        console.warn('⚠️ Validation skipped due to error:', e.message);
        return true; 
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
        sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(d)); 
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
    try {
        sessionStorage.removeItem(STORAGE_KEY_STUDENT_ID);
        sessionStorage.removeItem(STORAGE_KEY_USER);
        sessionStorage.removeItem(STORAGE_KEY_FP);
    } catch(e) {}
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
    await recordActivity('view_home', 'الصفحة الرئيسية');
    showLoading(g); 
    const logoEl = document.querySelector('.main-header .logo'); 
    if(logoEl) logoEl.innerHTML = LOGO_SVG + ' Tawal Academy'; 
    
    let locks = {};
    try {
        const res = await apiRequest(`/quiz-status`);
        if(res.ok) locks = await res.json();
    } catch(e) {}

    let subjectsFromDB = {};
    try {
        const subjectsRes = await apiRequest(`/public/subjects`);
        if (subjectsRes.ok) {
            const dbSubjects = await subjectsRes.json();
            dbSubjects.forEach(s => {
                subjectsFromDB[s.id] = {
                    id: s.id,
                    title: s.title,
                    icon: s.icon_data || SUBJECTS[s.id]?.icon || '📚'
                };
            });
            console.log('✅ Loaded subjects from database:', Object.keys(subjectsFromDB).length);
        }
    } catch(e) {
        console.warn('⚠️ Failed to load subjects from database, using static list');
    }
    
    const finalSubjects = Object.keys(subjectsFromDB).length > 0 ? subjectsFromDB : SUBJECTS;

    try {
        const statsRes = await apiRequest(`/public/stats`);
        if (statsRes.ok) {
            const stats = await statsRes.json();
            const studentsEl = document.getElementById('total-students');
            const quizzesEl = document.getElementById('total-quizzes');
            const subjectsEl = document.querySelector('.hero-stats .stat-item:nth-child(3) .stat-number');
            if (studentsEl) animateCounter(studentsEl, stats.totalStudents || 0);
            if (quizzesEl) animateCounter(quizzesEl, stats.totalQuizzes || 0);
            if (subjectsEl) animateCounter(subjectsEl, Object.keys(finalSubjects).length || 0);
        }
    } catch (e) {
        console.error('فشل تحميل الإحصائيات:', e);
    }

    g.innerHTML=''; 
    for(const k in finalSubjects){ 
        const s = finalSubjects[k]; 
        const lockData = locks[k] || { locked: false, message: '' };
        const isLocked = lockData.locked === true;
        let completionRate = (USER_DATA && USER_DATA.progress) ? (USER_DATA.progress[k] || 0) : 0;
        let lockBadge = isLocked ? `<span class="lock-badge">🔒 مغلق</span>` : '';
        let quizAction = isLocked 
            ? `<button disabled class="card-btn disabled" title="${lockData.message}">⛔ ${lockData.message}</button>`
            : `<a href="quiz.html?subject=${k}" class="card-btn btn-quiz">🧠 ابدأ الاختبار</a>`;

        const iconHTML = typeof s.icon === 'string' && s.icon.startsWith('<svg') 
            ? s.icon 
            : `<div style="font-size:2.5rem">${s.icon}</div>`;

        g.innerHTML += `
            <div class="subject-card modern-card" data-tilt>
                ${lockBadge}
                <div class="card-icon-wrapper">
                    <div class="progress-ring" style="--progress: ${completionRate}">
                        <div class="card-icon">${iconHTML}</div>
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
        const [statsRes, resultsRes, groupsRes, myGroupsRes] = await Promise.all([ 
            apiRequest(`/students/${CURRENT_STUDENT_ID}/stats`), 
            apiRequest(`/students/${CURRENT_STUDENT_ID}/results`),
            apiRequest(`/groups`),
            apiRequest(`/students/${CURRENT_STUDENT_ID}/groups`)
        ]);
        const stats = statsRes ? await statsRes.json() : {};
        const groups = groupsRes ? await groupsRes.json() : [];
        const myGroups = myGroupsRes ? await myGroupsRes.json() : [];
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
        const myGroupsHtml = (myGroups && myGroups.length) ? myGroups.map(g => `
            <div style="padding:10px;border:1px solid var(--border-color);border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-weight:700">${g.name}</div>
                    <div style="font-size:.85rem;color:#6b7280">${g.description||''}</div>
                    <div style="font-size:.8rem;color:#9ca3af">نقاطك: ${g.points||0} • نقاط المجموعة: ${g.total_points||0}</div>
                </div>
                <div style="display:flex;gap:8px;">
                    <a href="javascript:void(0)" onclick="window.viewGroup(${g.id})" class="card-btn">عرض</a>
                    <button onclick="window.leaveGroup(${g.id})" class="card-btn" style="background:var(--color-incorrect);color:#fff;">مغادرة</button>
                </div>
            </div>
        `).join('') : '<p class="placeholder">لم تنضم لأي مجموعة بعد.</p>';
        const allGroupsHtml = (groups && groups.length) ? groups.map(g => `
            <div style="padding:10px;border:1px solid var(--border-color);border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-weight:700">${g.name}</div>
                    <div style="font-size:.85rem;color:#6b7280">${g.description||''}</div>
                    <div style="font-size:.8rem;color:#9ca3af">الأعضاء: ${g.members_count||0} • النقاط: ${g.total_points||0}</div>
                </div>
                <div>
                    <button onclick="window.joinGroup(${g.id})" class="card-btn">انضمام</button>
                </div>
            </div>
        `).join('') : '<p class="placeholder">لا توجد مجموعات حتى الآن.</p>';
        html += `<div class="subject-card" style="margin-top:20px;">
            <h3>👥 مجموعاتي</h3>
            <div id="my-groups-container" style="display:flex;flex-direction:column;gap:10px;">${myGroupsHtml}</div>
        </div>`;
        html += `<div class="subject-card" style="margin-top:20px;">
            <h3>🏫 كل المجموعات</h3>
            <div id="groups-container" style="display:flex;flex-direction:column;gap:10px;">${allGroupsHtml}</div>
            <div style="margin-top:12px;border-top:1px solid var(--border-color);padding-top:12px;">
                <h4 style="margin:0 0 8px 0;">➕ إنشاء مجموعة</h4>
                <input id="group-name" type="text" placeholder="اسم المجموعة" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-bottom:8px;">
                <textarea id="group-desc" rows="2" placeholder="وصف مختصر" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-bottom:8px;"></textarea>
                <button id="create-group-btn" class="card-btn">إنشاء</button>
                <p id="group-status" style="font-size:.9rem;margin-top:6px;"></p>
            </div>
        </div>`;
        c.innerHTML = html;
        setupMessaging();
        setupGroups();
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

function setupGroups() {
    const btn = $('create-group-btn');
    const nameInp = $('group-name');
    const descInp = $('group-desc');
    const status = $('group-status');
    if (btn) {
        btn.onclick = async () => {
            const name = (nameInp && nameInp.value.trim()) || '';
            const description = (descInp && descInp.value.trim()) || '';
            if (!name) return;
            btn.disabled = true; btn.innerText = 'جاري الإنشاء...';
            try {
                const res = await apiRequest('/groups', { method: 'POST', body: JSON.stringify({ name, description, studentId: CURRENT_STUDENT_ID }) });
                if (res && res.ok) {
                    status.innerText = 'تم الإنشاء';
                    await initDashboardPage();
                } else {
                    status.innerText = 'فشل الإنشاء';
                }
            } catch { status.innerText = 'خطأ في الاتصال'; }
            finally { btn.disabled = false; btn.innerText = 'إنشاء'; setTimeout(()=>status.innerText='',3000); }
        };
    }
    window.joinGroup = async (gid) => {
        try {
            const res = await apiRequest(`/groups/${gid}/join`, { method: 'POST', body: JSON.stringify({ studentId: CURRENT_STUDENT_ID }) });
            if (res && res.ok) await initDashboardPage();
        } catch {}
    };
    window.leaveGroup = async (gid) => {
        try {
            const res = await apiRequest(`/groups/${gid}/leave`, { method: 'DELETE', body: JSON.stringify({ studentId: CURRENT_STUDENT_ID }) });
            if (res && res.ok) await initDashboardPage();
        } catch {}
    };
    window.viewGroup = async (gid) => {
        try {
            const [postsRes, lbRes] = await Promise.all([
                apiRequest(`/groups/${gid}/posts`),
                apiRequest(`/groups/${gid}/leaderboard`)
            ]);
            const posts = postsRes ? await postsRes.json() : [];
            const lb = lbRes ? await lbRes.json() : [];
            const container = $('my-groups-container');
            if (container) {
                const postsHtml = posts.length ? posts.map(p => `
                    <div style="padding:10px;border:1px solid var(--border-color);border-radius:8px;">
                        <div style="font-weight:700">${p.author||'طالب'}</div>
                        <div style="font-size:.95rem;color:#374151">${p.content}</div>
                        <div style="font-size:.8rem;color:#9ca3af">${formatDate(p.created_at)}</div>
                    </div>
                `).join('') : '<p class="placeholder">لا توجد منشورات.</p>';
                const lbHtml = lb.length ? `<table class="admin-table" style="width:100%;"><thead><tr><th>الطالب</th><th>النقاط</th></tr></thead><tbody>${
                    lb.map(r => `<tr><td>${r.name||'طالب'}</td><td>${r.points||0}</td></tr>`).join('')
                }</tbody></table>` : '<p class="placeholder">لا توجد نتائج.</p>';
                const postComposer = `
                    <div style="display:flex;gap:8px;margin-top:8px;">
                        <input id="post-content" type="text" placeholder="اكتب منشوراً..." style="flex:1;padding:8px;border:1px solid #ddd;border-radius:8px;">
                        <button id="post-send" class="card-btn">نشر</button>
                    </div>
                `;
                container.innerHTML = `
                    <div class="subject-card" style="margin-top:10px;">
                        <h3>منشورات المجموعة</h3>
                        <div>${postsHtml}</div>
                        ${postComposer}
                        <div id="post-status" style="font-size:.9rem;margin-top:6px;"></div>
                        <h3 style="margin-top:16px;">لوحة نقاط الأعضاء</h3>
                        <div>${lbHtml}</div>
                    </div>
                `;
                const postBtn = $('post-send');
                const postInp = $('post-content');
                const pStatus = $('post-status');
                if (postBtn) {
                    postBtn.onclick = async () => {
                        const content = (postInp && postInp.value.trim()) || '';
                        if (!content) return;
                        postBtn.disabled = true; postBtn.innerText = 'جاري النشر...';
                        try {
                            const res = await apiRequest(`/groups/${gid}/posts`, { method: 'POST', body: JSON.stringify({ studentId: CURRENT_STUDENT_ID, content }) });
                            if (res && res.ok) { pStatus.innerText = 'تم النشر'; await window.viewGroup(gid); }
                            else pStatus.innerText = 'فشل النشر';
                        } catch { pStatus.innerText = 'خطأ في الاتصال'; }
                        finally { postBtn.disabled = false; postBtn.innerText = 'نشر'; setTimeout(()=>pStatus.innerText='',3000); }
                    };
                }
            }
        } catch {}
    };
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
    await recordActivity('view_summary', title);
    
    const fDiv = $('summary-content-files');
    const iDiv = $('summary-content-images');
    
    fDiv.innerHTML = '<div style="text-align:center; padding:3rem;"><div class="spinner"></div><p>جاري التحميل...</p></div>';
    
    try {
        const [filesRes, imagesRes] = await Promise.all([
            apiRequest(`/public/subjects/${key}/files`),
            apiRequest(`/public/subjects/${key}/images`)
        ]);
        
        const files = filesRes.ok ? await filesRes.json() : [];
        const images = imagesRes.ok ? await imagesRes.json() : [];
        
        fDiv.innerHTML = files.length > 0 
            ? `<div class="summary-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(250px, 1fr)); gap:15px; margin-top:15px;">` 
            + files.map((f, i) => `
                <a href="${API_URL}${encodePath(f.file_path)}" target="_blank" onclick="recordActivity('download_file', '${f.file_name}')" 
                   class="summary-card active" style="display:flex; align-items:center; gap:10px; padding:15px; background:var(--bg-secondary-color); border:2px solid var(--color-correct); border-radius:10px; text-decoration:none; color:var(--text-color);">
                    <div style="background:var(--color-correct); color:#fff; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">${i+1}</div>
                    <div><div style="font-weight:bold;">${f.file_name}</div><div style="font-size:0.8rem; color:var(--color-correct);">📥 اضغط للتحميل</div></div>
                </a>
            `).join('') + `</div>` 
            : '<p class="placeholder">لا توجد ملفات.</p>';
        
        iDiv.innerHTML = images.length > 0 
            ? `<div class="gallery-grid">` 
            + images.map(img => `
                <div class="gallery-item">
                    <img src="${API_URL}${encodePath(img.image_path)}" onclick="window.open('${API_URL}${encodePath(img.image_path)}', '_blank')">
                </div>
            `).join('') + `</div>` 
            : '<p class="placeholder">لا توجد صور.</p>';
        
        $('btn-summary-files').onclick = () => { fDiv.style.display='block'; iDiv.style.display='none'; }; 
        $('btn-summary-images').onclick = () => { fDiv.style.display='none'; iDiv.style.display='block'; }; 
        $('btn-summary-files').click();
        
    } catch(e) { 
        console.error('Summary Load Error:', e);
        fDiv.innerHTML = '<p class="placeholder">تعذر تحميل البيانات. يرجى المحاولة لاحقاً.</p>'; 
    }
}

// =================================================================
// 9. صفحة الاختبارات (Quiz Page)
// =================================================================
async function initQuizPage(key) {
    if(!SUBJECTS[key]) return;
    await recordActivity('open_quiz_menu', SUBJECTS[key].title);
    const locks = await (async () => { try { const r = await apiRequest(`/quiz-status`); return r && r.ok ? await r.json() : {}; } catch { return {}; } })();
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
    const levelNumber = cfg.id;
    
    try {
        const apiRes = await apiRequest(`/admin/subjects/${key}/questions?level=${levelNumber}`);
        
        let questions = [];
        
        if (apiRes.ok) {
            const dbQuestions = await apiRes.json();
            
            if (dbQuestions && dbQuestions.length > 0) {
                questions = dbQuestions.map(q => ({
                    type: q.type,
                    question: q.question,
                    options: q.type === 'mc' ? JSON.parse(q.options || '[]') : null,
                    answer: JSON.parse(q.answer),
                    difficulty: q.difficulty,
                    topic: q.topic
                }));
                
                console.log(`✅ Loaded ${questions.length} questions from database for Level ${levelNumber}`);
            }
        }
        
        if (questions.length === 0) {
            console.warn(`⚠️ No questions in database for Level ${levelNumber}, trying local file...`);
            const localRes = await fetch(`data_${key}/data_${key}${cfg.suffix}?v=${Date.now()}`);
            if (localRes.ok) {
                const data = await localRes.json();
                questions = data.questions || [];
                console.log(`✅ Loaded ${questions.length} questions from local JSON file`);
            }
        }
        
        if (questions.length === 0) {
            throw new Error('لا توجد أسئلة متاحة لهذا المستوى');
        }
        
        await recordActivity('start_quiz', `${SUBJECTS[key].title} - ${cfg.titleSuffix}`);
        $('results-container').style.display = 'none'; 
        $('quiz-body').style.display = 'block'; 
        $('quiz-footer').style.display = 'block';
        runQuizEngine(questions, `${SUBJECTS[key].title} - ${cfg.titleSuffix}`, key);
        
    } catch(e) { 
        console.error('Quiz Load Error:', e);
        showToast('فشل تحميل الاختبار: ' + e.message, 'error'); 
    }
};

// =================================================================
// 10. محرك الاختبار (Quiz Engine)
// =================================================================
function runQuizEngine(questions, title, subjectId) {
    if (!questions || questions.length === 0) return;
    QUIZ_IN_PROGRESS = true; let idx = 0, correct = 0, incorrectList = [];
    const startTime = Date.now();
    const perQuestionTimes = [];
    const shuffled = shuffleArray(questions);
    const body = $('quiz-body'), footer = $('quiz-footer'), nextBtn = $('next-btn');
    body.style.display = 'block'; footer.style.display = 'block'; nextBtn.style.display = 'block';
    $('quiz-title').innerText = title;
    body.innerHTML = `<h3 id="q-txt" style="margin-bottom:1.5rem;"></h3><div id="opts" class="options-container"></div><p id="fb" class="feedback"></p>`;
    
    function loadQ() {
        const qStart = Date.now();
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
                const chosenIndex = i;
                if(isCorr) { correct++; b.classList.add('correct'); fb.innerHTML = '✅ ممتاز'; }
                else { b.classList.add('incorrect'); fb.innerHTML = '❌ خطأ'; 
                    let corrText = '';
                    if(q.type==='tf') corrText = String(q.answer).toLowerCase()==='true' ? 'صح' : 'خطأ';
                    else corrText = Array.isArray(q.options) && q.options[q.answer] !== undefined ? q.options[q.answer] : '';
                    const chosenText = q.type==='tf' ? (i===0?'صح':'خطأ') : txt;
                    incorrectList.push({ question: q.question, correct: corrText, chosen: chosenText });
                    const all = document.querySelectorAll('.option-btn');
                    if(q.type==='tf') all[String(q.answer).toLowerCase()==='true'?0:1].classList.add('correct');
                    else all[q.answer].classList.add('correct');
                }
                nextBtn.disabled = false;
                const dt = Math.max(0, Math.round((Date.now() - qStart)/1000));
                perQuestionTimes.push(dt);
            };
            optsDiv.appendChild(b);
        });
    }
    nextBtn.onclick = () => { if(idx < shuffled.length-1) { idx++; loadQ(); } else { showResults(); } };
    
    async function showResults() {
        QUIZ_IN_PROGRESS = false; body.style.display = 'none'; footer.style.display = 'none';
        const resDiv = $('results-container'); resDiv.style.display = 'flex';
        const percent = Math.round((correct / questions.length) * 100);
        const wrongCount = questions.length - correct;
        const elapsed = Math.max(0, Date.now() - startTime);
        const totalSeconds = Math.round(elapsed / 1000);
        const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const ss = String(totalSeconds % 60).padStart(2, '0');
        const timeSpent = `${mm}:${ss}`;
        let saveResp = null;
        if (!title.includes('مراجعة')) {
            const payload = { studentId: CURRENT_STUDENT_ID, quizName: title, score: percent, totalQuestions: questions.length, correctAnswers: correct, subjectId: subjectId || getSubjectKey(), timeSpentSeconds: totalSeconds, questionTimes: perQuestionTimes, wrongAnswers: incorrectList };
            try {
                const r = await apiRequest('/quiz-results', { method: 'POST', body: JSON.stringify(payload) });
                saveResp = await r.json();
            } catch(e) {}
        }
        const grade = (() => {
            if (percent >= 90) return { letter: 'A+', color: '#10b981', label: 'ممتاز' };
            if (percent >= 85) return { letter: 'A', color: '#059669', label: 'ممتاز' };
            if (percent >= 80) return { letter: 'B+', color: '#3b82f6', label: 'جيد جداً' };
            if (percent >= 75) return { letter: 'B', color: '#2563eb', label: 'جيد جداً' };
            if (percent >= 70) return { letter: 'C+', color: '#f59e0b', label: 'جيد' };
            if (percent >= 65) return { letter: 'C', color: '#d97706', label: 'جيد' };
            return { letter: 'D', color: '#ef4444', label: 'مقبول' };
        })();
        const badges = [];
        if (percent >= 90) badges.push({ icon: '⭐', name: 'النجم الساطع', desc: 'أكثر من 90%' });
        else if (percent >= 75) badges.push({ icon: '🏅', name: 'مثابر', desc: 'أكثر من 75%' });
        else if (percent >= 50) badges.push({ icon: '🎯', name: 'متقدم', desc: 'أكثر من 50%' });
        const wrongListHtml = incorrectList.map(q => {
            let ansTxt = '';
            ansTxt = q.correct || '';
            return `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:8px;">
                <div style="font-weight:700;color:#1f2937">${q.question}</div>
                <div style="font-size:.9rem;color:#6b7280">الإجابة الصحيحة: <span style="font-weight:600;color:#10b981">${ansTxt}</span></div>
                ${q.chosen?`<div style="font-size:.9rem;color:#9ca3af">إجابتك: ${q.chosen}</div>`:''}
            </div>`;
        }).join('');
        const badgesHtml = badges.length ? `
            <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;padding:14px;margin-bottom:12px;">
                <h4 style="margin:0 0 8px 0;color:#92400e">إنجازات جديدة</h4>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    ${badges.map(b=>`<div style="background:#fff;padding:10px;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,.08);display:flex;gap:8px;align-items:center;">
                        <span style="font-size:1.4rem">${b.icon}</span>
                        <div><div style="font-weight:700;color:#92400e">${b.name}</div><div style="font-size:.85rem;color:#78350f">${b.desc}</div></div>
                    </div>`).join('')}
                </div>
            </div>` : '';
        const xpCoinsHtml = (() => {
            const p = saveResp && saveResp.progress ? saveResp.progress : null;
            if (!p) return '';
            return `
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:16px;width:100%;max-width:900px;">
                    <div style="background:#ecfdf5;border:1px solid #d1fae5;border-radius:12px;padding:14px;text-align:center">
                        <div id="xp-count" style="font-size:1.4rem;font-weight:700;color:#10b981">${p.xp}</div>
                        <div style="font-size:.9rem;color:#6b7280">XP الإجمالي</div>
                    </div>
                    <div style="background:#fff7ed;border:1px solid #ffedd5;border-radius:12px;padding:14px;text-align:center">
                        <div style="font-size:1.4rem;font-weight:700;color:#f59e0b">${p.coins}</div>
                        <div style="font-size:.9rem;color:#6b7280">العملات</div>
                    </div>
                    <div style="background:#eef2ff;border:1px solid #e0e7ff;border-radius:12px;padding:14px;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>المستوى</span><span style="font-weight:700;color:#667eea">${p.level}</span></div>
                        <div style="height:10px;background:#e5e7eb;border-radius:999px;overflow:hidden">
                            <div style="width:${Math.min(100,(p.xp%1000)/10)}%;height:100%;background:linear-gradient(135deg,#667eea,#764ba2)"></div>
                        </div>
                    </div>
                </div>`;
        })();
        const diffBuckets = (() => {
            const easy = perQuestionTimes.filter(t => t <= 15).length;
            const med = perQuestionTimes.filter(t => t > 15 && t <= 30).length;
            const hard = perQuestionTimes.filter(t => t > 30).length;
            const total = Math.max(1, easy + med + hard);
            return [
                { label:'سهل', count: easy, color:'#10b981', pct: Math.round((easy/total)*100) },
                { label:'متوسط', count: med, color:'#f59e0b', pct: Math.round((med/total)*100) },
                { label:'صعب', count: hard, color:'#ef4444', pct: Math.round((hard/total)*100) }
            ];
        })();
        resDiv.innerHTML = `
            <div style="text-align:center;margin-bottom:16px;">
                <div style="font-size:3rem;font-weight:800;background:var(--primary-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${percent}%</div>
                <div style="color:#6b7280;margin-top:6px;">النتيجة النهائية</div>
                <div style="display:inline-block;padding:.4rem 1rem;background:${grade.color};color:#fff;border-radius:999px;font-weight:700;margin-top:8px;">${grade.letter} - ${grade.label}</div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px;width:100%;max-width:900px;">
                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:14px;text-align:center">
                    <div style="font-size:1.4rem;font-weight:700;color:#4b5563">${questions.length}</div>
                    <div style="font-size:.9rem;color:#6b7280">إجمالي الأسئلة</div>
                </div>
                <div style="background:#ecfdf5;border:1px solid #d1fae5;border-radius:12px;padding:14px;text-align:center">
                    <div style="font-size:1.4rem;font-weight:700;color:#10b981">${correct}</div>
                    <div style="font-size:.9rem;color:#6b7280">إجابات صحيحة</div>
                </div>
                <div style="background:#fef2f2;border:1px solid #fee2e2;border-radius:12px;padding:14px;text-align:center">
                    <div style="font-size:1.4rem;font-weight:700;color:#ef4444">${wrongCount}</div>
                    <div style="font-size:.9rem;color:#6b7280">إجابات خاطئة</div>
                </div>
                <div style="background:#eff6ff;border:1px solid #dbeafe;border-radius:12px;padding:14px;text-align:center">
                    <div style="font-size:1.4rem;font-weight:700;color:#3b82f6">${timeSpent}</div>
                    <div style="font-size:.9rem;color:#6b7280">الوقت المستغرق</div>
                </div>
            </div>
            <div style="width:100%;max-width:900px;margin-bottom:16px;">
                <h4 style="margin:0 0 8px 0;color:#1f2937">🎯 تحليل الصعوبة (مستند إلى زمن الإجابة)</h4>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
                    ${diffBuckets.map(d=>`
                        <div>
                            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                                <span style="font-weight:600;color:#4b5563">${d.label}</span>
                                <span style="font-weight:700;color:${d.color}">${d.pct}% (${d.count})</span>
                            </div>
                            <div style="height:10px;background:#e5e7eb;border-radius:999px;overflow:hidden">
                                <div style="width:${d.pct}%;height:100%;background:${d.color};border-radius:999px"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ${xpCoinsHtml}
            ${badgesHtml}
            ${wrongCount>0?`<div style="width:100%;max-width:900px;text-align:right;margin-bottom:12px;">
                <h4 style="margin:0 0 8px 0;color:#1f2937">أسئلة تحتاج مراجعة</h4>
                ${wrongListHtml}
            </div>`:''}
            <div style="display:flex;gap:10px;margin-top:10px;">
                <button onclick="location.reload()" class="next-btn">🔄 إعادة</button>
                <a href="quiz.html?subject=${getSubjectKey()}" class="card-btn">📂 خروج</a>
                <button id="export-pdf-btn" class="next-btn">📄 تصدير PDF</button>
            </div>
        `;
        const exportBtn = document.getElementById('export-pdf-btn');
        if (exportBtn) exportBtn.onclick = () => { window.print(); };
        const aiBtn = document.getElementById('ai-help-btn');
        const aiModal = document.getElementById('ai-modal');
        const aiClose = document.getElementById('ai-modal-close');
        const aiOk = document.getElementById('ai-modal-ok');
        if (aiBtn && aiModal && aiClose && aiOk) {
            aiBtn.onclick = async () => {
                aiModal.style.display = 'block';
                const content = document.getElementById('ai-content');
                content.innerHTML = '<div class="spinner">جاري التحليل...</div>';
                const studentData = { score: percent, totalQuestions: questions.length, correctAnswers: correct, wrongAnswers: incorrectList, timeBreakdown: { totalSeconds, perQuestion: perQuestionTimes } };
                try {
                    const r = await apiRequest('/ai/recommendations', { method: 'POST', body: JSON.stringify({ studentData }) });
                    const data = r ? await r.json() : null;
                    const recs = (data && data.recommendations) ? data.recommendations : [];
                    content.innerHTML = recs.length ? `
                        <div>
                            <h4 style="margin:0 0 8px 0;color:#1f2937">توصيات ذكية</h4>
                            <div style="display:flex;flex-direction:column;gap:8px;">
                                ${recs.map(r=>`<div style="background:#f3f4f6;padding:12px;border-radius:10px;border-left:4px solid #667eea;color:#4b5563">${r.text}</div>`).join('')}
                            </div>
                        </div>` : '<p>لا توجد توصيات حالياً.</p>';
                } catch(e) { content.innerHTML = '<p>تعذر الحصول على توصيات.</p>'; }
            };
            aiClose.onclick = () => { aiModal.style.display = 'none'; };
            aiOk.onclick = () => { aiModal.style.display = 'none'; };
        }
        if (saveResp && saveResp.newBadge) {
            const m = document.getElementById('badge-modal');
            const closeBtn = document.getElementById('badge-modal-close');
            const okBtn = document.getElementById('badge-modal-ok');
            m.style.display = 'block';
            closeBtn.onclick = () => { m.style.display = 'none'; };
            okBtn.onclick = () => { m.style.display = 'none'; };
        }
        if (percent >= 85) {
            const colors = ['#ffd700','#10b981','#3b82f6','#f59e0b','#8b5cf6'];
            for (let i=0; i<60; i++) {
                const c = document.createElement('div');
                c.className = 'confetti';
                c.style.left = Math.random()*100+'vw';
                c.style.backgroundColor = colors[Math.floor(Math.random()*colors.length)];
                c.style.animationDelay = (Math.random()*0.8)+'s';
                c.style.transform = `rotate(${Math.random()*360}deg)`;
                document.body.appendChild(c);
                setTimeout(()=>{ if(c.parentNode) c.parentNode.removeChild(c); }, 3500);
            }
        }
    }
    loadQ();
}
