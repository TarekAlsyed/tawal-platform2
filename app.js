/*
 * =================================================================================
 * APP.JS - Version 21.0.0 (Enhanced UI + Real Stats)
 * =================================================================================
 */

// 1. الثوابت والإعدادات
const API_URL = 'https://tawal-backend2-production.up.railway.app/api';
const STORAGE_KEY_STUDENT_ID = 'tawal_student_id_v2';
const STORAGE_KEY_USER = 'tawal_user_data_v2';
const STORAGE_KEY_FP = 'tawal_device_fp_fixed';

// إعدادات الكاش والمواد
const DATA_CACHE = new Map();
const CACHE_DURATION = 2 * 60 * 1000;
const DEFAULT_SUBJECT = 'gis_networks';

// المتغيرات العامة
let CURRENT_STUDENT_ID = null; // سيتم تعيينه عبر دالة آمنة
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

// المواد الدراسية (مع الأيقونات الأصلية)
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

// 🔥 دالة التنبيهات الجديدة (Toast Notification) بدلاً من alert
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    // إضافة أيقونة حسب النوع
    let icon = '🔔';
    if(type === 'error') icon = '❌';
    if(type === 'success') icon = '✅';
    
    toast.innerHTML = `<span style="font-size:1.2rem">${icon}</span> <span>${message}</span>`;
    
    // تخصيص اللون حسب النوع
    if(type === 'error') toast.style.background = 'var(--color-incorrect)';
    if(type === 'success') toast.style.background = 'var(--primary-gradient)';
    
    document.body.appendChild(toast);
    
    // تشغيل صوت خفيف (اختياري)
    // const audio = new Audio('notification.mp3'); audio.play().catch(()=>{});

    setTimeout(() => {
        toast.style.animation = 'slideInLeft 0.3s reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 🔥 دالة التتبع الجديدة (Activity Logger)
async function recordActivity(type, name) {
    if (!CURRENT_STUDENT_ID) return;
    try {
        console.log(`📡 Recording: ${type} - ${name}`);
        // نستخدم fetch بدون انتظار (Fire and Forget) لعدم تعطيل الطالب
        fetch(`${API_URL}/log-activity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: CURRENT_STUDENT_ID, activityType: type, subjectName: name })
        }).catch(e => console.warn('Logging failed', e));
    } catch(e) {}
}

// ✅ دوال التشفير والحفظ الآمن
function encryptData(data) {
    return btoa(JSON.stringify(data));
}
function decryptData(encrypted) {
    try { return JSON.parse(atob(encrypted)); } catch { return null; }
}
function getStudentId() {
    const savedData = decryptData(localStorage.getItem(STORAGE_KEY_STUDENT_ID));
    if (savedData && savedData.id) return savedData.id;
    return null;
}
function saveStudentId(id) {
    localStorage.setItem(STORAGE_KEY_STUDENT_ID, encryptData({ id: id, timestamp: Date.now() }));
    CURRENT_STUDENT_ID = id;
}

// تعيين المعرف الحالي عند التحميل
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

// 🔥 تحديث دالة التحميل لدعم Skeleton Loader
function showLoading(el, msg='جاري التحميل...') { 
    // إذا كان العنصر هو شبكة المواد، نعرض الـ Skeleton
    if(el.id === 'subjects-grid') {
        el.innerHTML = `
            <div class="skeleton-card" style="height:280px"></div>
            <div class="skeleton-card" style="height:280px"></div>
            <div class="skeleton-card" style="height:280px"></div>
        `;
    } else {
        el.innerHTML = `<div style="text-align:center;padding:3rem;"><div class="spinner"></div><p>${msg}</p></div>`; 
    }
}

function validateEmail(email) { 
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
    return re.test(String(email).toLowerCase()); 
}

function showError(title, message) { 
    const qc = document.querySelector('.quiz-container'); 
    const msg = `<p class="placeholder" style="color:var(--color-incorrect); text-align:center; padding:3rem;">${message}</p>`; 
    if (qc) qc.innerHTML = `<div class="quiz-header"><h2>${title}</h2></div><div class="quiz-body">${msg}</div>`; 
    else showToast(`${title}: ${message}`, 'error'); // تم التحديث لاستخدام Toast
}

// ✅ إصلاح معالجة التواريخ لتتوافق مع PostgreSQL
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        let safeDate = dateString.replace(' ', 'T');
        if (!safeDate.includes('Z') && !safeDate.includes('+')) {
            safeDate += 'Z';
        }
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
// 3. الاتصال بالسيرفر (API)
// =================================================================
async function apiRequest(endpoint, opts={}) {
    try {
        const res = await fetch(`${API_URL}${endpoint}`, { 
            ...opts, 
            headers: { 'Content-Type': 'application/json', ...opts.headers } 
        });
        
        if (res.status === 403) {
            const data = await res.json().catch(() => ({}));
            // إذا كان الخطأ بسبب الحظر فقط، نعرض الشاشة الحمراء
            if (data.error === 'Device Blocked' || data.error === 'Account Blocked' || data.error === 'جهاز محظور') {
                document.body.innerHTML = `
                    <div style="height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;background:#000;color:#e74c3c;text-align:center;padding:20px;z-index:99999;position:fixed;top:0;left:0;width:100%;">
                        <div style="font-size:5rem;">⛔</div>
                        <h1 style="margin:20px 0;">تم حظر الجهاز</h1>
                        <p style="font-size:1.2rem;">تم منع وصولك إلى المنصة.</p>
                    </div>`;
                throw new Error('Blocked');
            }
        }

        if (res.status === 429) {
            console.warn('Server busy (429), retrying silently...');
            return null; 
        }

        // ✅ تجاهل أخطاء 500 المؤقتة وعدم اعتبارها سبباً للخروج
        if (res.status >= 500) {
            console.warn(`Server Error (${res.status}) at ${endpoint}. Retrying later...`);
            return null; 
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
    } catch (err) { 
        if(err.message !== 'Blocked') console.error('API Error:', err); 
        // لا نعيد رمي الخطأ (throw err) لكي لا يتوقف التطبيق بالكامل، بل نعيد null ليتم التعامل معه
        return null; 
    }
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
    
    // التحقق الصامت
    try {
        await apiRequest('/verify-fingerprint', { 
            method: 'POST', 
            body: JSON.stringify({ fingerprint: savedFp }) 
        });
    } catch(e) {}
    
    return savedFp;
}

// =================================================================
// 5. بدء التطبيق (Initialization)
// =================================================================
document.addEventListener('DOMContentLoaded', async () => {
    initThemeToggle();
    
    // 🔥 تفعيل العدادات في الهيرو سكشن (التحسين الجديد: جلب بيانات حقيقية)
    if (document.getElementById('total-students')) {
        fetch(`${API_URL}/public-stats`)
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Stats API not available');
            })
            .then(stats => {
                // ✅ إذا نجح الاتصال، نعرض الأرقام الحقيقية من السيرفر
                animateCounter(document.getElementById('total-students'), stats.totalStudents || 0, 2000);
                animateCounter(document.getElementById('total-quizzes'), stats.totalQuizzes || 0, 2500);
            })
            .catch(e => {
                // ⚠️ في حالة فشل الاتصال (أو أن السيرفر لم يحدث بعد)، نعرض الأرقام الافتراضية
                console.log('Using dummy stats (Server update needed)');
                animateCounter(document.getElementById('total-students'), 1250, 2000); 
                animateCounter(document.getElementById('total-quizzes'), 5400, 2500);
            });
    }

    // 🔥 تفعيل حالة Active لزر Dashboard
    if (window.location.href.includes('dashboard.html')) {
        const dashLink = document.querySelector('.dashboard-link');
        if(dashLink) dashLink.classList.add('active');
    }

    FINGERPRINT_ID = await getFingerprint();

    // تسجيل الدخول التلقائي
    if (CURRENT_STUDENT_ID) {
        try {
            // محاولة تسجيل الدخول، حتى لو فشلت لن نمسح البيانات
            await apiRequest('/login', { 
                method:'POST', 
                body: JSON.stringify({ studentId: CURRENT_STUDENT_ID, fingerprint: FINGERPRINT_ID }) 
            });
        } catch(e) {
            console.warn('Background login check failed, but keeping session active.');
        }
    }

    // التحقق من حالة الحساب (بدون مسح تلقائي إلا في حالة الحظر الصريح)
    await verifyStudent();

    // إذا لم يكن هناك طالب مسجل، فقط حينها نطلب التسجيل
    if (!CURRENT_STUDENT_ID) {
        if (!(await registerStudent(FINGERPRINT_ID))) return;
    }

    // التوجيه للصفحات
    const key = getSubjectKey();
    if ($('subjects-grid')) initIndexPage();
    else if ($('quiz-body')) initQuizPage(key);
    else if ($('summary-content-files')) initSummaryPage(key);
    else if ($('dashboard-content')) initDashboardPage();
});

// 🔥🔥🔥 إصلاح: التحقق الذكي ومسح الجلسة إذا كان الطالب محذوفاً 🔥🔥🔥
async function verifyStudent() {
    if (!CURRENT_STUDENT_ID) return false;
    try { 
        const res = await apiRequest(`/students/${CURRENT_STUDENT_ID}`); 
        
        // إذا فشل الاتصال بالسيرفر بسبب خطأ 500 أو غيره، نعيد تحميل الصفحة للتسجيل من جديد
        if (!res) {
            console.warn('Student check failed. Resetting...');
            localStorage.clear();
            location.reload();
            return false;
        }
        
        const s = await res.json(); 
        
        // 🔥 فحص مهم جداً: إذا عاد السيرفر ببيانات فارغة، فهذا يعني أن الطالب حُذف
        if (!s || !s.id) {
            console.warn('Student removed from server. Logging out...');
            localStorage.clear();
            location.reload(); // إعادة تحميل لإظهار شاشة التسجيل
            return false; 
        }
        
        // الحالة الوحيدة التي نمسح فيها البيانات: إذا قال السيرفر صراحة "أنت محظور"
        if (s.isblocked) { 
            localStorage.clear(); 
            showToast('⛔ تم حظر هذا الحساب من قبل الإدارة.', 'error');
            setTimeout(() => location.reload(), 2000);
            return false; 
        } 
        
        USER_DATA = s; 
        return true; 
    } catch (e) { 
        // في حالة الخطأ الجسيم، نمسح ونعيد التحميل
        localStorage.clear();
        location.reload();
        return false; 
    }
}

async function registerStudent(fp) {
    const n = prompt('أهلاً بك في Tawal Academy 🎓\nالرجاء كتابة الاسم:'); 
    if (!n || n.trim().length < 2) return false;
    
    const e = prompt('الرجاء كتابة البريد الإلكتروني:'); 
    if (!e || !validateEmail(e)) { showToast("البريد غير صحيح", 'error'); return false; }
    
    try {
        const res = await apiRequest(`/students/register`, { 
            method: 'POST', 
            body: JSON.stringify({name:n, email:e, fingerprint:fp}) 
        });
        
        if(!res) return false;
        const d = await res.json();
        
        // حفظ البيانات بشكل آمن
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

// 🔥🔥 إضافة دالة تسجيل الخروج 🔥🔥
window.logoutStudent = async () => {
    // تم التحديث لاستخدام confirm المتصفح أو Toast حسب الرغبة، سنبقي confirm للأمان
    if(!confirm('هل أنت متأكد من تسجيل الخروج؟ 🚪')) return;
    
    if (CURRENT_STUDENT_ID) {
        // إرسال طلب تسجيل الخروج للسيرفر
        try {
            await apiRequest('/logout', { 
                method: 'POST', 
                body: JSON.stringify({ studentId: CURRENT_STUDENT_ID }) 
            });
        } catch(e) { console.error('Logout error', e); }
    }
    
    // مسح البيانات وإعادة التحميل
    localStorage.clear();
    showToast('تم تسجيل الخروج بنجاح', 'success');
    setTimeout(() => location.href = 'index.html', 1000);
};

// =================================================================
// 6. الصفحة الرئيسية (Index Page) - 🔥 Major Update 🔥
// =================================================================
function initThemeToggle() { 
    const b = $('theme-toggle-btn'); 
    if (localStorage.getItem('theme')==='light') document.body.classList.add('light-mode'); 
    if(b) b.onclick = () => { 
        document.body.classList.toggle('light-mode'); 
        localStorage.setItem('theme', document.body.classList.contains('light-mode')?'light':'dark'); 
    }; 
}

// دالة تحريك العدادات الجديدة
function animateCounter(element, target, duration = 2000) {
    if (!element) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = Math.ceil(target).toLocaleString();
            clearInterval(timer);
        } else {
            element.textContent = Math.ceil(start).toLocaleString();
        }
    }, 16);
}

async function initIndexPage() { 
    const g = $('subjects-grid'); 
    if(!g) return; 
    
    // 🔥 تسجيل الدخول للصفحة الرئيسية
    recordActivity('view_home', 'الصفحة الرئيسية');

    // 🔥 إضافة زر تسجيل الخروج في الهيدر (إذا لم يكن موجوداً في HTML)
    const header = document.querySelector('.main-header');
    if (header && !document.getElementById('student-logout-btn') && !document.querySelector('button[onclick="window.logoutStudent()"]')) {
        // نتحقق أولاً هل الزر موجود بالفعل من كود HTML الجديد أم لا
        // إذا كان موجوداً لا نضيفه، إذا لم يكن نضيفه كاحتياط
    }

    showLoading(g); 
    const logoEl = document.querySelector('.main-header .logo'); 
    if(logoEl) logoEl.innerHTML = LOGO_SVG + ' Tawal Academy'; 
    
    // ✅ جلب حالة القفل بشكل صحيح
    let locks = {};
    try {
        const res = await fetch(`${API_URL}/quiz-status`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if(res.ok) locks = await res.json();
        else console.warn('Failed to load quiz locks');
    } catch(e) { console.error('Error loading locks', e); }

    g.innerHTML=''; 
    
    // 🔥 إنشاء البطاقات بالتصميم الجديد (3D Tilt & Progress Rings)
    for(const k in SUBJECTS){ 
        const s = SUBJECTS[k]; 
        const lockData = locks[k] || { locked: false, message: '' };
        const isLocked = lockData.locked === true;
        
        // حساب نسبة الإتمام (محاولة جلبها من USER_DATA إذا كانت متوفرة)
        // في المستقبل يمكن ربطها بـ API /stats لكل مادة
        let completionRate = 0; 
        if (USER_DATA && USER_DATA.progress && USER_DATA.progress[k]) {
             completionRate = USER_DATA.progress[k];
        }
        
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
                
                <div class="card-meta">
                    <span class="meta-item">📊 ${completionRate}% مكتمل</span>
                </div>
                
                <div class="card-actions">
                    ${quizAction}
                    <a href="summary.html?subject=${k}" class="card-btn btn-summary">📖 الملخصات</a>
                </div>
            </div>`; 
    }

    // 🔥 تفعيل تأثير 3D Tilt يدوياً (بدون مكتبات خارجية)
    document.querySelectorAll('[data-tilt]').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -10; // Max rotation 10deg
            const rotateY = ((x - centerX) / centerX) * 10;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        });
    });

    // ✅ تفعيل نظام البحث
    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
        const newSearchBar = searchBar.cloneNode(true);
        searchBar.parentNode.replaceChild(newSearchBar, searchBar);
        
        newSearchBar.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.subject-card');
            let hasResults = false;
            
            cards.forEach(card => {
                const title = card.querySelector('.card-title').textContent.toLowerCase();
                if (title.includes(query)) {
                    card.style.display = 'flex';
                    hasResults = true;
                } else {
                    card.style.display = 'none';
                }
            });
            const noResultsMsg = document.getElementById('no-results-message');
            if(noResultsMsg) noResultsMsg.style.display = hasResults ? 'none' : 'block';
        });
    }
}

// =================================================================
// 7. لوحة الطالب والرسائل (Dashboard)
// =================================================================
async function initDashboardPage() {
    const c = $('dashboard-content'); 
    if(!CURRENT_STUDENT_ID) { c.innerHTML='<p class="dashboard-empty-state">سجل دخول أولاً.</p>'; return; } 
    showLoading(c);

    try {
        const [stats, res] = await Promise.all([ 
            apiRequest(`/students/${CURRENT_STUDENT_ID}/stats`).then(r=>r?r.json():{}), 
            apiRequest(`/students/${CURRENT_STUDENT_ID}/results`).then(r=>r?r.json():[]) 
        ]);

        let html = `<div class="dashboard-header" style="margin-bottom:2rem"><h2>أهلاً ${USER_DATA ? USER_DATA.name : 'يا بطل'} 👋</h2></div>`;
        
        html += `<div class="dashboard-summary-grid">
            <div class="summary-box"><p class="summary-box-label">الاختبارات</p><p class="summary-box-value">${stats.totalQuizzes||0}</p></div>
            <div class="summary-box"><p class="summary-box-label">المتوسط</p><p class="summary-box-value">${stats.averageScore||0}%</p></div>
            <div class="summary-box"><p class="summary-box-label">الأفضل</p><p class="summary-box-value">${stats.bestScore||0}%</p></div>
        </div>`;
        
        // 🔥 زر خروج إضافي في لوحة التحكم
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
    const btn = $('send-msg-btn');
    const txt = $('support-msg');
    const status = $('msg-status');
    const limitDisplay = $('msg-limit-count');
    const msgList = $('my-messages-list');

    async function refreshMessages() {
        try {
            const res = await apiRequest(`/students/${CURRENT_STUDENT_ID}/messages`);
            if(!res) return;
            const data = await res.json();
            
            // تحديث العداد
            limitDisplay.innerText = data.remaining;
            
            if (data.remaining <= 0) { 
                btn.disabled = true; 
                btn.innerText = '⛔ نفذ الرصيد اليوم'; 
                txt.disabled = true; 
                txt.placeholder = 'نفذ رصيدك اليومي';
            } else { 
                btn.disabled = false; 
                btn.innerText = '📤 إرسال'; 
                txt.disabled = false; 
                txt.placeholder = 'اكتب رسالتك...';
            }
            
            msgList.innerHTML = data.messages.length === 0 
                ? '<p style="color:#777;text-align:center;">لا توجد رسائل.</p>' 
                : data.messages.map(msg => `
                    <div style="background:var(--bg-color); border:1px solid var(--border-color); border-radius:8px; padding:10px; margin-bottom:10px;">
                        <p style="font-weight:bold; color:var(--text-color);">أنت:</p>
                        <p style="background:var(--bg-secondary-color); padding:8px; border-radius:5px;">${msg.content}</p>
                        ${msg.adminreply ? `<div style="margin-top:5px; border-top:1px solid #eee; padding-top:5px;"><p style="font-weight:bold; color:var(--color-correct);">الرد:</p><p style="color:var(--color-correct);">${msg.adminreply}</p></div>` : '<small style="color:#999">في الانتظار...</small>'}
                        <small style="display:block; color:#ccc; margin-top:5px; font-size:0.7rem;">${formatDate(msg.createdat)}</small>
                    </div>
                `).join('');
        } catch(e) { console.error(e); }
    }

    btn.onclick = async () => {
        const msg = txt.value.trim(); 
        if(!msg) { status.innerText = '⚠️ اكتب رسالة أولاً'; return; }
        
        btn.disabled = true; btn.innerText = 'جاري الإرسال...';
        
        try {
            const res = await apiRequest('/messages', { method: 'POST', body: JSON.stringify({ studentId: CURRENT_STUDENT_ID, message: msg }) });
            
            if (res && res.status === 429) { 
                status.innerText = '⛔ تجاوزت الحد المسموح.'; 
                status.style.color = 'red'; 
                refreshMessages(); 
                return; 
            }
            
            if(res && res.ok) { 
                const result = await res.json();
                status.innerText = `✅ تم الإرسال! (${result.remaining} رسالة متبقية)`; 
                status.style.color = 'green'; 
                
                // ✅ تحديث العداد فوراً
                limitDisplay.innerText = result.remaining;

                txt.value = ''; 
                
                // ✅ تحديث فوري للقائمة والعداد
                await refreshMessages(); 
            }
        } catch(e) { 
            status.innerText = '❌ خطأ في الإرسال'; 
            status.style.color = 'red'; 
        } finally {
            if (btn.innerText !== '⛔ نفذ الرصيد اليوم') {
                btn.disabled = false;
                btn.innerText = '📤 إرسال';
            }
            setTimeout(() => status.innerText = '', 3000);
        }
    };
    refreshMessages();
}

// =================================================================
// 8. الملخصات (Summary) - 🔥 دالة الفحص الذكي (Smart Check) 🔥
// =================================================================

// 1. دالة مساعدة لفحص وجود الرابط (Check URL)
async function checkResourceExists(url) {
    try {
        // نستخدم HEAD للتأكد من وجود الملف
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        return false;
    }
}

async function initSummaryPage(key) {
    if(!SUBJECTS[key]) return;
    const subjectTitle = SUBJECTS[key].title;
    $('summary-title').innerText = subjectTitle;
    
    // 🔥 تسجيل دخول صفحة الملخصات
    recordActivity('view_summary', subjectTitle);
    
    const fDiv = $('summary-content-files'); 
    const iDiv = $('summary-content-images');
    
    // عرض رسالة "جاري الفحص"
    fDiv.innerHTML = '<div style="text-align:center; padding:3rem;"><div class="spinner"></div><p style="margin-top:10px;color:var(--primary-color);">جاري فحص الملفات المتوفرة...</p></div>';

    try {
        // جلب ملف JSON الأساسي الذي يحتوي على قائمة الملفات
        const res = await fetch(`data_${key}/data_${key}_summary.json?v=${Date.now()}`);
        if(!res.ok) throw new Error(); 
        const d = await res.json();
        
        // --- مرحلة الفحص الذكي (The Filter) ---
        
        // 1. فحص ملفات PDF/Word
        let validFiles = [];
        if (d.files && d.files.length > 0) {
            // نستخدم Promise.all لفحص كل الملفات بالتوازي (أسرع)
            const fileChecks = d.files.map(async (file) => {
                const exists = await checkResourceExists(file.path);
                return exists ? file : null; // لو موجود رجعه، لو لأ رجع null
            });
            const results = await Promise.all(fileChecks);
            validFiles = results.filter(f => f !== null); // تصفية النتائج الـ null
        }

        // 2. فحص الصور
        let validImages = [];
        if (d.images && d.images.length > 0) {
            const imageChecks = d.images.map(async (img) => {
                const exists = await checkResourceExists(img.path);
                return exists ? img : null;
            });
            const results = await Promise.all(imageChecks);
            validImages = results.filter(img => img !== null);
        }

        // --- مرحلة العرض (Rendering) ---

        // بناء HTML للملفات الصالحة فقط
        let filesHtml = '';
        if (validFiles.length > 0) {
            filesHtml = '<div class="summary-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(250px, 1fr)); gap:15px; margin-top:15px;">';
            validFiles.forEach((file, index) => {
                 // 🔥 إضافة تسجيل تحميل الملف عند الضغط
                 filesHtml += `
                    <a href="${file.path}" target="_blank" onclick="recordActivity('download_file', '${file.name} - ${subjectTitle}')" class="summary-card active" style="display:flex; align-items:center; gap:10px; padding:15px; background:var(--bg-secondary-color); border:2px solid var(--color-correct); border-radius:10px; text-decoration:none; color:var(--text-color); transition:transform 0.2s;">
                        <div style="background:var(--color-correct); color:#fff; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:1.2rem;">${index+1}</div>
                        <div>
                            <div style="font-weight:bold; font-size:1rem;">${file.name}</div>
                            <div style="font-size:0.8rem; color:var(--color-correct);">📥 اضغط للتحميل</div>
                        </div>
                    </a>`;
            });
            filesHtml += '</div>';
        } else {
            filesHtml = '<p class="placeholder">لا توجد ملفات متاحة حالياً.</p>';
        }
        fDiv.innerHTML = filesHtml;

        // بناء HTML للصور الصالحة فقط
        let imagesHtml = '';
        if (validImages.length > 0) {
            imagesHtml = '<div class="gallery-grid">';
            validImages.forEach(img => {
                imagesHtml += `<div class="gallery-item" style="display:block"><img src="${img.path}" onclick="window.open('${img.path}', '_blank')" style="cursor:pointer"><p>${img.caption||''}</p></div>`;
            });
            imagesHtml += '</div>';
        } else {
            imagesHtml = '<p class="placeholder">لا توجد صور في المعرض حالياً.</p>';
        }
        iDiv.innerHTML = imagesHtml;

        // 🔥 تسجيل التبديل بين الملفات والصور
        $('btn-summary-files').onclick = ()=>{ 
            fDiv.style.display='block'; iDiv.style.display='none'; 
            recordActivity('view_files_tab', subjectTitle);
        }; 
        $('btn-summary-images').onclick = ()=>{ 
            fDiv.style.display='none'; iDiv.style.display='block'; 
            recordActivity('view_gallery_tab', subjectTitle);
        }; 
        $('btn-summary-files').click();
    
    } catch(e) { 
        console.error(e);
        fDiv.innerHTML='<p class="placeholder" style="color:red">عذراً، لم يتم العثور على فهرس الملفات.</p>'; 
        iDiv.innerHTML=''; 
    }
}

// =================================================================
// 9. صفحة الاختبارات (Quiz Page Logic)
// =================================================================
async function initQuizPage(key) {
    if(!SUBJECTS[key]) return;
    const subjectTitle = SUBJECTS[key].title;
    
    // 🔥 تسجيل دخول صفحة الاختبارات (قبل البدء)
    recordActivity('open_quiz_menu', subjectTitle);

    // فحص القفل
    const locks = await checkQuizLockStatus(); 
    if (locks[key]?.locked) { 
        showError('عذراً', locks[key].message || 'الاختبار مغلق مؤقتاً.'); 
        return; 
    }

    $('quiz-title').innerText = subjectTitle; 
    const body = $('quiz-body'); 
    showLoading(body, 'جاري تحميل المستويات...');
    
    let results = []; 
    try { 
        const r = await apiRequest(`/students/${CURRENT_STUDENT_ID}/results`); 
        results = await r.json(); 
    } catch(e){}
    
    let html = '<div class="levels-grid" style="display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">';
    
    LEVEL_CONFIG.forEach((lvl, i) => {
        let locked = false; let lockReason = '';
        if (i > 0) {
            const prev = LEVEL_CONFIG[i-1]; 
            const prevAtts = results.filter(r => r.quizName.includes(prev.titleSuffix)); 
            const best = prevAtts.reduce((max, r) => Math.max(max, (r.score || 0)), 0); 
            
            if (best < prev.requiredScore) { 
                locked = true; 
                lockReason = `يجب اجتياز ${prev.name} بنسبة ${prev.requiredScore}%`; 
            }
        }
        
        html += `
            <div class="subject-card" style="${locked?'opacity:0.7':''}">
                <h3>${lvl.name}</h3>
                <p style="font-size:0.9rem;color:var(--text-color-light)">${locked ? lockReason : `الحد الأدنى: ${lvl.requiredScore}%`}</p>
                <button class="card-btn" style="width:100%;margin-top:10px;${locked?'background:var(--bg-tertiary-color);cursor:not-allowed':''}" ${locked?'disabled':''} onclick="loadLevelFile('${key}', ${i})">
                    ${locked ? '🔒 مغلق' : '🚀 ابدأ الاختبار'}
                </button>
            </div>`;
    });
    body.innerHTML = html + '</div>';
}

async function checkQuizLockStatus() {
    try {
        const res = await fetch(`${API_URL}/quiz-status`);
        return res.ok ? await res.json() : {};
    } catch (e) { return {}; }
}

window.loadLevelFile = async (key, idx) => {
    const locks = await checkQuizLockStatus(); 
    if (locks[key]?.locked) { showToast(locks[key].message || 'الاختبار مغلق.', 'error'); setTimeout(()=>location.reload(),1000); return; }
    
    const cfg = LEVEL_CONFIG[idx]; 
    try { 
        const res = await fetch(`data_${key}/data_${key}${cfg.suffix}?v=${Date.now()}`); 
        if(!res.ok) throw new Error(); 
        const data = await res.json(); 
        
        // 🔥 تسجيل بدء الاختبار الفعلي
        recordActivity('start_quiz', `${SUBJECTS[key].title} - ${cfg.titleSuffix}`);

        $('results-container').style.display = 'none';
        $('quiz-body').style.display = 'block';
        $('quiz-footer').style.display = 'block';
        
        runQuizEngine(data.questions, `${SUBJECTS[key].title} - ${cfg.titleSuffix}`, SUBJECTS[key].id); 
    } catch(e) { showToast('ملف الأسئلة غير موجود.', 'error'); }
};

// =================================================================
// 10. محرك الاختبار (Quiz Engine)
// =================================================================
function runQuizEngine(questions, title, subjectId) {
    if (!questions || questions.length === 0) { showToast("لا توجد أسئلة!", 'error'); return; }
    
    QUIZ_IN_PROGRESS = true; 
    let idx = 0; 
    let correct = 0; // عدد الإجابات الصحيحة
    let incorrectList = []; 
    let qStart = 0; 
    const shuffled = shuffleArray(questions);
    
    const body = $('quiz-body'); 
    const footer = $('quiz-footer'); 
    const nextBtn = $('next-btn');
    
    body.style.display = 'block'; 
    footer.style.display = 'block'; 
    nextBtn.style.display = 'block';
    $('quiz-title').innerText = title;
    
    body.innerHTML = `<h3 id="q-txt" style="margin-bottom:1.5rem;line-height:1.6"></h3><div id="opts" class="options-container"></div><p id="fb" class="feedback"></p>`;
    
    function loadQ() {
        if(idx >= shuffled.length) { showResults(); return; }
        
        const q = shuffled[idx]; 
        $('q-txt').innerText = q.question; 
        $('question-counter').innerText = `سؤال ${idx+1} / ${shuffled.length}`; 
        $('progress-bar').style.width = `${((idx+1)/shuffled.length)*100}%`;
        
        const fb = $('fb'); 
        fb.innerText = ''; 
        fb.className = 'feedback'; 
        
        nextBtn.disabled = true; 
        nextBtn.innerText = idx===shuffled.length-1 ? 'إنهاء 🏁' : 'التالي ⬅️'; 
        qStart = Date.now(); 
        
        const optsDiv = $('opts'); 
        optsDiv.innerHTML = '';
        const opts = q.type==='tf' ? ['صح','خطأ'] : q.options;
        
        opts.forEach((txt, i) => { 
            const b = document.createElement('button'); 
            b.className = 'option-btn'; 
            b.innerText = txt; 
            const isCorr = q.type==='tf' ? ((i===0) === (String(q.answer).toLowerCase()==='true')) : (i===q.answer); 
            b.onclick = () => check(b, isCorr); 
            optsDiv.appendChild(b); 
        });
    }
    
    function check(btn, isCorr) {
        document.querySelectorAll('.option-btn').forEach(b=>b.disabled=true); 
        
        if(isCorr) { 
            correct++; 
            btn.classList.add('correct'); 
            $('fb').innerHTML = '✅ <b>ممتاز!</b>'; 
            $('fb').classList.add('correct'); 
        } else { 
            btn.classList.add('incorrect'); 
            $('fb').innerHTML = '❌ <b>خطأ</b>'; 
            $('fb').classList.add('incorrect'); 
            incorrectList.push(shuffled[idx]); 
            
            const all = document.querySelectorAll('.option-btn'); 
            const q = shuffled[idx]; 
            if(q.type==='tf') { 
                all[String(q.answer).toLowerCase()==='true'?0:1].classList.add('correct'); 
            } else { 
                all[q.answer].classList.add('correct'); 
            } 
        }
        nextBtn.disabled = false;
    }
    
    nextBtn.onclick = () => { if(idx < shuffled.length-1) { idx++; loadQ(); } else { showResults(); } };
    
    function showResults() {
        QUIZ_IN_PROGRESS = false; 
        body.style.display = 'none'; 
        footer.style.display = 'none'; 
        const resDiv = $('results-container'); 
        resDiv.style.display = 'flex'; 
        resDiv.style.flexDirection = 'column';

        // ✅ حساب النسبة المئوية
        const percent = Math.round((correct / questions.length) * 100);

        // ✅ حفظ النسبة المئوية في السيرفر
        if (!title.includes('مراجعة')) {
            saveQuizResult(title, percent, questions.length, correct, subjectId);
        }
        
        let grade = { text: 'يحتاج تركيز 📉', color: '#e74c3c' }; 
        if(percent>=90) grade={text:'أسطوري 🏆',color:'#27ae60'}; 
        else if(percent>=75) grade={text:'ممتاز 🌟',color:'#2980b9'}; 
        else if(percent>=50) grade={text:'جيد 👍',color:'#f39c12'};

        // تحليل الذكاء الاصطناعي
        let aiFeedback = '';
        if (incorrectList.length > 0) {
            const topicCounts = {}; const difficultyCounts = {};
            incorrectList.forEach(q => { 
                const topic = q.topic || 'عام'; 
                const diff = q.difficulty || 'غير محدد'; 
                topicCounts[topic] = (topicCounts[topic] || 0) + 1; 
                difficultyCounts[diff] = (difficultyCounts[diff] || 0) + 1; 
            });
            const weakTopic = Object.keys(topicCounts).reduce((a, b) => topicCounts[a] > topicCounts[b] ? a : b);
            aiFeedback = `
                <div style="background: white !important; border: 1px solid #ccc; padding: 20px; border-radius: 10px; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); color: #333 !important;">
                    <h3 style="color: #2c3e50 !important; margin-bottom: 10px;">🤖 تحليل الأداء</h3>
                    <ul style="list-style: none; padding: 0; color: #333 !important;">
                        <li style="margin-bottom: 8px;">⚠️ <strong>نقطة الضعف:</strong> معظم أخطائك في جزئية <strong>"${weakTopic}"</strong>.</li>
                        ${difficultyCounts['سهل'] ? `<li style="color: #c0392b !important;">🚨 انتبه! لديك أخطاء في أسئلة سهلة.</li>` : ''}
                        <li style="margin-top: 10px;">📚 <strong>نصيحة:</strong> راجع ملخص "${weakTopic}" وحاول مجدداً.</li>
                    </ul>
                </div>`;
        } else {
            aiFeedback = `
                <div style="background: #e8f8f5 !important; border: 1px solid #2ecc71; padding: 20px; border-radius: 10px; margin: 20px 0; color: #333 !important;">
                    <h3 style="color: #27ae60 !important;">🤖 تحليل مثالي!</h3>
                    <p style="color: #333 !important;">أداؤك متقن في جميع المواضيع. استمر!</p>
                </div>`;
        }

        let errorHTML = '';
        if (incorrectList.length > 0) {
            errorHTML = `
                <div style="width:100%;">
                    <details open style="border:1px solid #ddd;border-radius:8px;margin-bottom:10px;">
                        <summary style="background:#f8f9fa;padding:10px;cursor:pointer;font-weight:bold; color:#333;">📋 تفاصيل الأخطاء (${incorrectList.length})</summary>
                        <div style="padding:10px;background:#fff;">
                            ${incorrectList.map(q => { 
                                const rightAns = q.type==='tf' ? (String(q.answer)==='true'?'صح':'خطأ') : q.options[q.answer]; 
                                return `
                                    <div style="border-bottom:1px solid #eee;padding:10px 0;">
                                        <p style="font-weight:bold;color:#c0392b;">❌ ${q.question}</p>
                                        <p style="color:#7f8c8d;font-size:0.9rem;">${q.topic ? 'موضوع: '+q.topic : ''}</p>
                                        <p style="color:#27ae60;font-weight:bold;">✅ الإجابة: ${rightAns}</p>
                                    </div>`; 
                            }).join('')}
                        </div>
                    </details>
                    <button id="retry-mistakes-btn" class="card-btn" style="background:#e74c3c;width:100%;">🔁 إعادة اختبار الأخطاء</button>
                </div>`;
        }

        // إضافة Confetti عند النجاح الكبير
        const confettiHTML = percent >= 90 ? 
            `<div class="confetti" style="left:10%; animation-delay:0s"></div>
             <div class="confetti" style="left:30%; animation-delay:0.5s"></div>
             <div class="confetti" style="left:50%; animation-delay:1s"></div>
             <div class="confetti" style="left:70%; animation-delay:1.5s"></div>
             <div class="confetti" style="left:90%; animation-delay:2s"></div>` : '';

        resDiv.innerHTML = `
            ${confettiHTML}
            <div style="width:120px;height:120px;border-radius:50%;background:conic-gradient(${grade.color} ${percent*3.6}deg, #eee 0deg);display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;">
                <div style="width:100px;height:100px;background:var(--bg-secondary-color);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:bold; color:var(--text-color)">${percent}%</div>
            </div>
            <h2 style="color:${grade.color};margin-bottom:10px;">${grade.text}</h2>
            <h3 style="margin-bottom:20px; color:var(--text-color)">النتيجة النهائية: ${percent}%</h3>
            ${aiFeedback}
            ${errorHTML}
            <div style="margin-top:20px;display:flex;flex-direction:column;gap:10px;width:100%;">
                <button onclick="location.reload()" class="next-btn" style="width:100%">🔄 إعادة الاختبار بالكامل</button>
                <a href="quiz.html?subject=${getSubjectKey()}" class="card-btn" style="text-align:center;background:var(--bg-tertiary-color);color:var(--text-color-light);">📂 خروج للقائمة</a>
            </div>`;

        if (incorrectList.length > 0) { 
            setTimeout(() => { 
                const rb = document.getElementById('retry-mistakes-btn'); 
                if(rb) { 
                    rb.onclick = () => { 
                        resDiv.style.display='none'; 
                        runQuizEngine(incorrectList, `${title} (مراجعة)`, subjectId); 
                    }; 
                } 
            }, 100);
        }
    }
    loadQ();
}

async function saveQuizResult(quizName, score, total, correct, subjectId) { 
    if (!CURRENT_STUDENT_ID) return; 
    try { 
        await apiRequest('/quiz-results', { 
            method: 'POST', 
            body: JSON.stringify({ 
                studentId: CURRENT_STUDENT_ID, 
                quizName, 
                score, // الآن يحمل النسبة المئوية
                totalQuestions: total, 
                correctAnswers: correct, 
                subjectId: subjectId || getSubjectKey() 
            }) 
        }); 
    } catch (e) { console.error(e); } 
}
