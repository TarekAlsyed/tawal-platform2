/*
 * =================================================================================
 * CONTROL_PANEL.JS - Version 21.0.0 (FULL FUNCTIONALITY UPDATE)
 * =================================================================================
 */

const API_URL = 'https://tawal-backend2-production.up.railway.app/api';
let adminToken = localStorage.getItem('admin_token');

// متغير عالمي لتخزين بيانات الطلاب لغرض التصدير (تمت إضافته للميزة الجديدة)
let GLOBAL_STUDENTS_DATA = [];
let statsChartInstance = null; // لتخزين كائن الرسم البياني

const SUBJECTS_LIST = {
    gis_networks: "تطبيقات GIS في الشبكات",
    transport: "جغرافية النقل والمواصلات",
    geo_maps: "الخرائط الجيولوجية",
    projections: "مساقط الخرائط",
    research: "مناهج البحث الجغرافي",
    surveying_texts: "نصوص جغرافية في المساحة",
    arid_lands: "جغرافيا الأراضي الجافة"
};

const ACTIVITY_MAP = {
    'quiz_completed': '📝 أنهى اختبار',
    'view_home': '🏠 دخل الرئيسية',
    'view_summary': '📖 فتح ملخص',
    'open_quiz_menu': '🧠 فتح قائمة اختبار',
    'start_quiz': '🚀 بدأ اختبار',
    'download_file': '📥 حمل ملف',
    'view_files_tab': '📂 استعرض الملفات',
    'view_gallery_tab': '🖼️ استعرض الصور'
};

// =================================================================
// دوال مساعدة
// =================================================================
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        let safeDate = dateString.replace(' ', 'T');
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

async function secureFetch(endpoint, opts = {}) {
    const headers = { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${adminToken}`, 
        ...opts.headers 
    };
    try {
        const res = await fetch(`${API_URL}${endpoint}`, { ...opts, headers });
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('admin_token');
            location.reload(); 
            return null;
        }
        return res;
    } catch (e) {
        console.error("خطأ في الاتصال:", e);
        return null;
    }
}

// دالة عرض التنبيهات (Toast) التي تمت إضافتها لدعم التصميم الجديد
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = type === 'error' ? 'var(--danger)' : 'var(--accent-gradient)';
    toast.innerHTML = type === 'error' ? `❌ ${message}` : `✅ ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideInLeft 0.3s reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// =================================================================
// التشغيل والتهيئة
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    // ربط الدوال بالـ Window لتكون متاحة للـ HTML
    window.deleteUser = deleteUser;
    window.toggleBlock = toggleBlock;
    window.blockFP = blockFP;
    window.unblockFP = unblockFP;
    window.showStudentDetails = showStudentDetails;
    window.sendReply = sendReply;
    window.deleteMsg = deleteMsg;
    window.toggleLock = toggleLock;
    window.exportToCSV = exportToCSV; // تمت الإضافة

    // تفعيل الأيقونات المبدئي
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // تهيئة الثيم والبحث (الميزات الجديدة)
    initTheme();
    setupGlobalSearch();

    if (!adminToken) showLoginScreen();
    else initializeDashboard();
    
    const modal = document.getElementById('student-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; };
    window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };
});

function showLoginScreen() {
    document.body.innerHTML = '';
    // تصميم شاشة تسجيل دخول مودرن
    const div = document.createElement('div');
    div.style.cssText = `
        position:fixed; top:0; left:0; width:100%; height:100%;
        background-color: #f3f4f6;
        display:flex; justify-content:center; align-items:center;
        z-index:10000; font-family:'Inter', 'Cairo', sans-serif;
    `;
    div.innerHTML = `
        <div style="
            background:white; padding:40px; border-radius:16px; width:100%; max-width:400px;
            text-align:center; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;
        ">
            <div style="margin-bottom:20px; width:60px; height:60px; background:linear-gradient(135deg, #667eea, #764ba2); border-radius:12px; display:inline-flex; align-items:center; justify-content:center; color:white; font-size:1.5rem;">
                🛡️
            </div>
            <h2 style="color:#111827; margin-bottom:10px; font-weight:700;">Admin Panel</h2>
            <p style="color:#6b7280; margin-bottom:30px; font-size:0.9rem;">يرجى تسجيل الدخول للمتابعة</p>
            
            <div style="text-align:right; margin-bottom:8px; font-size:0.85rem; font-weight:600; color:#374151;">كلمة المرور</div>
            <input type="password" id="passInput" placeholder="••••••••" style="
                width:100%; padding:12px 15px; margin-bottom:20px;
                border:1px solid #d1d5db; border-radius:8px; outline:none; transition:0.2s;
                font-family:inherit;
            ">
            
            <button id="loginBtn" style="
                width:100%; padding:12px; background:linear-gradient(135deg, #667eea, #764ba2);
                color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;
                transition: transform 0.1s;
            ">تسجيل الدخول</button>
            
            <p id="loginErr" style="color:#ef4444; margin-top:15px; display:none; font-size:0.9rem; background:#fee2e2; padding:10px; border-radius:6px;"></p>
        </div>`;
    document.body.appendChild(div);

    // إضافة تأثير بسيط عند التركيز
    const inp = document.getElementById('passInput');
    inp.onfocus = () => inp.style.borderColor = '#667eea';
    inp.onblur = () => inp.style.borderColor = '#d1d5db';

    const btn = document.getElementById('loginBtn');
    const err = document.getElementById('loginErr');

    const handleLogin = async () => {
        const password = inp.value;
        if (!password) return;
        btn.innerText = 'جاري التحقق...';
        btn.disabled = true;
        btn.style.opacity = '0.7';
        try {
            const res = await fetch(`${API_URL}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('admin_token', data.token);
                location.reload();
            } else {
                throw new Error(data.error || 'كلمة المرور غير صحيحة');
            }
        } catch (e) {
            err.innerText = '❌ ' + e.message;
            err.style.display = 'block';
            btn.innerText = 'تسجيل الدخول';
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    };

    btn.onclick = handleLogin;
    inp.onkeypress = (e) => { if (e.key === 'Enter') handleLogin(); };
}

function initializeDashboard() {
    addLogoutButton();
    loadAllData();
    setInterval(() => { fetchMessages(); fetchLogs(); fetchActivityLogs(); }, 30000);
}

function addLogoutButton() {
    // تم نقل زر الخروج للـ Sidebar في التصميم الجديد، ولكن سنبقيه هنا احتياطياً
    // إذا لم يكن موجوداً في الـ DOM
    // الوظيفة الأساسية هي التفاعل مع الزر الموجود في الـ Sidebar (تمت إضافته في HTML)
    const logoutLinks = document.querySelectorAll('a[href="index.html"]'); 
    logoutLinks.forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            if(confirm('هل تريد تسجيل الخروج؟')) {
                localStorage.removeItem('admin_token');
                location.reload();
            }
        };
    });
}

async function loadAllData() {
    await Promise.all([
        fetchStats(), 
        fetchStudents(), 
        fetchMessages(), 
        fetchLocks(), 
        fetchActivityLogs(), 
        fetchLogs()
    ]);
}

// =================================================================
// جلب البيانات (UI Updated)
// =================================================================

async function fetchStats() {
    const res = await secureFetch('/admin/stats');
    if (!res) return;
    const data = await res.json();
    
    // تحديث الرسم البياني (Chart.js)
    if(typeof Chart !== 'undefined') renderCharts(data);

    // استخدام Grid System الجديد للبطاقات
    document.getElementById('stats-container').innerHTML = `
        <div class="stats-section" style="grid-template-columns: repeat(3, 1fr);">
            <div class="summary-box" style="border-bottom: 4px solid #667eea;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="summary-label">إجمالي الطلاب</div>
                    <i data-lucide="users" style="color:#667eea; opacity:0.8;"></i>
                </div>
                <div class="summary-val">${data.totalStudents}</div>
                <div style="font-size:0.75rem; color:green; margin-top:5px;">+ نشطين</div>
            </div>
            
            <div class="summary-box" style="border-bottom: 4px solid #10b981;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="summary-label">الاختبارات المنجزة</div>
                    <i data-lucide="file-check" style="color:#10b981; opacity:0.8;"></i>
                </div>
                <div class="summary-val">${data.totalQuizzes}</div>
                <div style="font-size:0.75rem; color:#6b7280; margin-top:5px;">اختبار مكتمل</div>
            </div>
            
            <div class="summary-box" style="border-bottom: 4px solid #f59e0b;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="summary-label">متوسط الدرجات</div>
                    <i data-lucide="bar-chart-2" style="color:#f59e0b; opacity:0.8;"></i>
                </div>
                <div class="summary-val">${data.averageScore}%</div>
                <div style="font-size:0.75rem; color:#6b7280; margin-top:5px;">أداء عام</div>
            </div>
        </div>
        
        <div style="position: relative; height: 300px; width: 100%; display: ${statsChartInstance ? 'block' : 'none'};" id="chart-wrapper-inner">
             <canvas id="mainStatsChart"></canvas>
        </div>`;
        
    // إعادة تفعيل الأيقونات
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    // إعادة رسم الشارت بعد تحديث الـ DOM
    if(typeof Chart !== 'undefined') setTimeout(() => renderCharts(data), 100);
}

async function fetchStudents() {
    const res = await secureFetch('/admin/students');
    if (!res) return;
    const students = await res.json();
    
    // حفظ البيانات في المتغير العالمي للتصدير
    GLOBAL_STUDENTS_DATA = students;
    
    const container = document.getElementById('students-container');
    if (students.length === 0) {
        container.innerHTML = '<p class="empty">لا يوجد طلاب مسجلين.</p>';
        return;
    }

    let html = `
        <div style="margin-bottom:20px; position:relative;">
            <i data-lucide="search" style="position:absolute; right:12px; top:12px; width:18px; color:#9ca3af;"></i>
            <input type="text" id="student-search-input" placeholder="بحث عن طالب (بالاسم أو البريد)..." 
            style="width:100%; padding:10px 40px 10px 10px; border:1px solid #e5e7eb; border-radius:10px; outline:none; font-family:inherit;">
        </div>
        
        <div class="admin-table-container">
        <table class="admin-table" id="students-table">
            <thead>
                <tr>
                    <th><i data-lucide="user" style="width:16px; vertical-align:middle;"></i> الاسم</th>
                    <th><i data-lucide="mail" style="width:16px; vertical-align:middle;"></i> البريد</th>
                    <th><i data-lucide="calendar" style="width:16px; vertical-align:middle;"></i> التسجيل</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                </tr>
            </thead>
            <tbody>`;

    students.forEach(s => {
        const isBlocked = s.isblocked; 
        const safeName = s.name.replace(/'/g, "\\'"); 
        html += `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:32px; height:32px; background:#e0e7ff; color:#4e54c8; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.8rem;">
                            ${s.name.charAt(0)}
                        </div>
                        <span class="clickable-student" onclick="showStudentDetails(${s.id})">${s.name}</span>
                    </div>
                </td>
                <td style="color:#6b7280; font-size:0.9rem;">${s.email}</td>
                <td style="font-size:0.85rem; color:#9ca3af;">${formatDate(s.createdat)}</td>
                <td><span class="badge ${isBlocked ? 'bg-red' : 'bg-green'}">${isBlocked ? 'محظور' : 'نشط'}</span></td>
                <td style="display:flex; gap:8px;">
                    <button class="btn ${isBlocked ? 'btn-green' : 'btn-red'}" 
                            style="padding:6px; border-radius:6px;" 
                            onclick="toggleBlock(${s.id}, ${isBlocked})" 
                            title="${isBlocked ? 'فك الحظر' : 'حظر الطالب'}">
                        <i data-lucide="${isBlocked ? 'unlock' : 'lock'}" style="width:16px; height:16px;"></i>
                    </button>
                    
                    <button class="btn" style="background:#f3f4f6; color:#4b5563; padding:6px; border-radius:6px;" 
                            onclick="blockFP(${s.id})" title="حظر الجهاز">
                        <i data-lucide="smartphone" style="width:16px; height:16px;"></i>
                    </button>
                    
                    <button class="btn" style="background:#ecfdf5; color:#10b981; padding:6px; border-radius:6px;" 
                            onclick="unblockFP(${s.id})" title="فك حظر الجهاز">
                        <i data-lucide="shield-check" style="width:16px; height:16px;"></i>
                    </button>
                    
                    <button class="btn" style="background:#fee2e2; color:#ef4444; padding:6px; border-radius:6px;" 
                            onclick="deleteUser(${s.id}, '${safeName}')" title="حذف نهائي">
                        <i data-lucide="trash-2" style="width:16px; height:16px;"></i>
                    </button>
                </td>
            </tr>`;
    });
    container.innerHTML = html + '</tbody></table></div>';

    // Search Logic
    document.getElementById('student-search-input').addEventListener('input', (e) => {
        const filter = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#students-table tbody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(filter) ? '' : 'none';
        });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function fetchActivityLogs() {
    const container = document.getElementById('activity-logs-container');
    container.innerHTML = '<div class="spinner">جاري التحديث...</div>';
    
    const res = await secureFetch('/admin/activity-logs'); 
    
    if (!res) {
        container.innerHTML = '<p class="empty">فشل تحميل الأنشطة.</p>';
        return;
    }
    
    const activities = await res.json();
    
    if (activities.length === 0) {
        container.innerHTML = '<p class="empty">لا توجد أنشطة حديثة.</p>';
        return;
    }

    let html = `
    <div class="admin-table-container">
    <table class="admin-table">
        <thead>
            <tr>
                <th>الطالب</th>
                <th>النشاط</th>
                <th>التفاصيل</th>
                <th>الوقت</th>
            </tr>
        </thead>
        <tbody>`;
    
    activities.forEach(a => {
        const type = a.activityType || a.activitytype;
        const displayType = ACTIVITY_MAP[type] || type; 
        const subject = a.subjectName || a.subjectname || '-';
        const score = a.score !== null && a.score !== undefined ? `<span class="badge bg-green" style="font-size:0.75rem;">${a.score}%</span>` : '';
        
        // تعيين أيقونة حسب النشاط
        let icon = 'activity';
        if(type.includes('quiz')) icon = 'file-text';
        if(type.includes('login')) icon = 'log-in';
        
        html += `<tr>
            <td style="font-weight:600; color:#374151;">${a.studentName}</td>
            <td>
                <div style="display:flex; align-items:center; gap:6px;">
                    <i data-lucide="${icon}" style="width:14px; color:#6b7280;"></i>
                    <span>${displayType}</span>
                </div>
            </td>
            <td>${subject} ${score}</td>
            <td style="font-size:0.8rem; color:#9ca3af;">${formatDate(a.date)}</td>
        </tr>`;
    });
    container.innerHTML = html + '</tbody></table></div>';
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// 🔥 تحديث: عرض تفاصيل الطالب (تصميم Modal محسن)
window.showStudentDetails = async (studentId) => {
    const modal = document.getElementById('student-modal');
    const modalName = document.getElementById('modal-student-name');
    const modalStats = document.getElementById('modal-stats-container');
    const modalResults = document.getElementById('modal-results-container');
    const modalActivity = document.getElementById('modal-activity-container'); // التأكد من وجوده في الـ HTML الجديد
    
    modalName.innerText = 'جاري التحميل...';
    modalStats.innerHTML = '<div class="spinner">جاري التحميل...</div>';
    modalResults.innerHTML = '<div class="spinner">جاري التحميل...</div>';
    if(modalActivity) modalActivity.innerHTML = '<div class="spinner">جاري التحميل...</div>';
    
    modal.style.display = 'block';

    try {
        const [student, stats, results, activityLogs, loginLogs] = await Promise.all([
            secureFetch(`/students/${studentId}`).then(r => r ? r.json() : {}),
            secureFetch(`/students/${studentId}/stats`).then(r => r ? r.json() : {}),
            secureFetch(`/students/${studentId}/results`).then(r => r ? r.json() : []),
            secureFetch(`/students/${studentId}/activity`).then(r => r ? r.json() : []),
            secureFetch(`/students/${studentId}/logs`).then(r => r ? r.json() : [])
        ]);

        // Header Update
        modalName.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px;">
                <div style="width:50px; height:50px; background:#e0e7ff; color:#4e54c8; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; font-weight:bold;">
                    ${student.name ? student.name.charAt(0) : '?'}
                </div>
                <div>
                    <div style="font-size:1.2rem; font-weight:bold;">${student.name || 'غير معروف'}</div>
                    <div style="font-size:0.85rem; color:#6b7280;">${student.email || ''}</div>
                </div>
            </div>`;

        // Stats Update
        modalStats.innerHTML = `
            <div class="stats-section" style="grid-template-columns: repeat(3, 1fr); gap:15px; margin-bottom:0;">
                <div class="summary-box" style="padding:15px; background:#f9fafb;">
                    <p class="summary-label">عدد الاختبارات</p>
                    <p class="summary-val" style="font-size:1.5rem; color:#4e54c8;">${stats.totalQuizzes || 0}</p>
                </div>
                <div class="summary-box" style="padding:15px; background:#f9fafb;">
                    <p class="summary-label">المعدل التراكمي</p>
                    <p class="summary-val" style="font-size:1.5rem; color:#10b981;">${stats.averageScore || 0}%</p>
                </div>
                <div class="summary-box" style="padding:15px; background:#f9fafb;">
                    <p class="summary-label">أفضل درجة</p>
                    <p class="summary-val" style="font-size:1.5rem; color:#f59e0b;">${stats.bestScore || 0}%</p>
                </div>
            </div>`;

        // 1. نتائج الاختبارات
        let resultsHtml = '';
        if (results.length === 0) {
            resultsHtml = '<p class="empty">لم يقم بأي اختبار بعد.</p>';
        } else {
            resultsHtml = '<div class="admin-table-container"><table class="admin-table"><thead><tr><th>الاختبار</th><th>النتيجة</th><th>التاريخ</th></tr></thead><tbody>';
            results.forEach(r => {
                const subjectId = r.subjectId || r.subjectid;
                const quizName = r.quizName || r.quizname;
                const completedAt = r.completedAt || r.completedat;
                const subjectName = SUBJECTS_LIST[subjectId] || quizName;
                const scoreColor = r.score >= 90 ? '#10b981' : r.score >= 75 ? '#3b82f6' : r.score >= 50 ? '#f59e0b' : '#ef4444';
                
                resultsHtml += `<tr>
                    <td>${subjectName}</td>
                    <td><span style="background:${scoreColor}20; color:${scoreColor}; padding:2px 8px; border-radius:4px; font-weight:bold;">${r.score}%</span></td>
                    <td style="font-size:0.85rem; color:#9ca3af;">${formatDate(completedAt)}</td>
                </tr>`;
            });
            resultsHtml += '</tbody></table></div>';
        }
        modalResults.innerHTML = resultsHtml;

        // 2. سجل النشاط (مدمج: نشاط + دخول)
        let activityHtml = '';
        if (!activityLogs || activityLogs.length === 0) {
            activityHtml = '<p class="empty">لا يوجد نشاط مسجل.</p>';
        } else {
            activityHtml = '<div class="admin-table-container" style="max-height:300px; overflow-y:auto;"><table class="admin-table"><thead><tr><th>النشاط</th><th>التفاصيل</th><th>الوقت</th></tr></thead><tbody>';
            activityLogs.forEach(l => {
                const type = l.activitytype || l.activityType;
                const displayType = ACTIVITY_MAP[type] || type; 
                const subject = l.subjectname || l.subjectName || '-';
                const score = l.score !== null && l.score !== undefined ? `<span style="color:green; font-weight:bold;">(${l.score}%)</span>` : '';
                
                activityHtml += `<tr>
                    <td>${displayType}</td>
                    <td>${subject} ${score}</td>
                    <td style="font-size:0.85rem; direction:ltr; text-align:right; color:#9ca3af;">${formatDate(l.timestamp)}</td>
                </tr>`;
            });
            activityHtml += '</tbody></table></div>';
        }
        
        if(modalActivity) {
            modalActivity.style.display = 'block'; // Ensure it's visible
            modalActivity.innerHTML = activityHtml;
        }

    } catch (e) {
        console.error('❌ [Student Details] Error:', e);
        modalStats.innerHTML = '<p class="empty">فشل تحميل البيانات.</p>';
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

async function fetchMessages() {
    const res = await secureFetch('/admin/messages');
    if (!res) return;
    const msgs = await res.json();
    
    const container = document.getElementById('messages-container');
    if (msgs.length === 0) {
        container.innerHTML = '<p class="empty">لا توجد رسائل جديدة.</p>';
        return;
    }

    // تصميم يشبه Inbox بسيط
    container.innerHTML = msgs.map(m => `
        <div style="
            padding: 15px; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 12px;
            background: #fff; transition: 0.2s; border-right: 4px solid ${m.adminreply ? '#10b981' : '#f59e0b'};
        ">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="width:24px; height:24px; background:#f3f4f6; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.75rem;">👤</div>
                    <strong style="font-size:0.9rem;">${m.studentName || 'طالب'}</strong>
                </div>
                <span style="font-size:0.75rem; color:#9ca3af;">${formatDate(m.createdat)}</span>
            </div>
            
            <div style="background:#f9fafb; padding:10px; border-radius:8px; font-size:0.9rem; color:#374151; margin-bottom:10px;">
                ${m.content}
            </div>
            
            ${m.adminreply 
                ? `<div style="background:#ecfdf5; padding:8px; border-radius:6px; color:#065f46; font-size:0.85rem; display:flex; gap:5px;">
                     <i data-lucide="check-circle" style="width:14px;"></i> تم الرد: ${m.adminreply}
                   </div>`
                : `<div style="display:flex; gap:8px;">
                     <input type="text" id="reply-${m.id}" placeholder="اكتب ردك هنا..." style="flex:1; padding:8px; border:1px solid #d1d5db; border-radius:6px; font-size:0.85rem;">
                     <button onclick="sendReply(${m.id})" style="background:#4e54c8; color:white; border:none; padding:0 12px; border-radius:6px; cursor:pointer;">إرسال</button>
                   </div>`
            }
            
            <div style="text-align:left; margin-top:8px;">
                <button onclick="deleteMsg(${m.id})" style="background:none; border:none; color:#ef4444; font-size:0.75rem; cursor:pointer; text-decoration:underline;">حذف الرسالة</button>
            </div>
        </div>`).join('');
        
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function fetchLocks() {
    const res = await secureFetch('/quiz-status');
    if (!res) return;
    const locks = await res.json();
    
    let html = '<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:10px;">';
    for (const [key, name] of Object.entries(SUBJECTS_LIST)) {
        const isLocked = locks[key]?.locked || false;
        
        // تصميم كروت صغيرة للتبديل
        html += `
            <div style="
                padding: 12px; border: 1px solid ${isLocked ? '#fee2e2' : '#ecfdf5'}; 
                background: ${isLocked ? '#fef2f2' : '#f0fdf4'};
                border-radius: 10px; display: flex; justify-content: space-between; align-items: center;
            ">
                <span style="font-size:0.85rem; font-weight:600; color:#374151;">${name}</span>
                <label class="toggle-switch" style="position: relative; display: inline-block; width: 34px; height: 20px;">
                    <input type="checkbox" ${isLocked ? 'checked' : ''} onchange="toggleLock('${key}', this.checked)" style="opacity: 0; width: 0; height: 0;">
                    <span style="
                        position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; 
                        background-color: ${isLocked ? '#ef4444' : '#ccc'}; border-radius: 34px; transition: .4s;
                    "></span>
                    <span style="
                        position: absolute; content: ''; height: 14px; width: 14px; left: 3px; bottom: 3px; 
                        background-color: white; border-radius: 50%; transition: .4s;
                        transform: ${isLocked ? 'translateX(14px)' : 'translateX(0)'};
                    "></span>
                </label>
            </div>`;
    }
    document.getElementById('quiz-locks-container').innerHTML = html + '</div>';
}

async function fetchLogs() {
    const res = await secureFetch('/admin/login-logs');
    if (!res) return;
    const logs = await res.json();
    
    let html = `
    <div class="admin-table-container">
    <table class="admin-table">
        <thead><tr><th>الطالب</th><th>وقت الدخول</th><th>الحالة</th></tr></thead>
        <tbody>`;
    
    html += logs.map(l => `
        <tr>
            <td style="font-weight:600;">${l.name}</td>
            <td style="direction:ltr; text-align:right; font-size:0.85rem; color:#6b7280;">${formatDate(l.logintime)}</td>
            <td>
                ${l.logouttime 
                    ? `<span style="color:#9ca3af; font-size:0.8rem;">غادر ${formatDate(l.logouttime).split(' ')[1]}</span>` 
                    : '<span class="badge bg-green">متصل</span>'}
            </td>
        </tr>`).join('');
    document.getElementById('logs-container').innerHTML = html + '</tbody></table></div>';
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// =================================================================
// الإجراءات (بقيت كما هي مع تحديث الرسائل فقط إذا لزم الأمر)
// =================================================================
window.toggleBlock = async (id, currentStatus) => {
    if(!confirm(currentStatus ? 'هل أنت متأكد من فك حظر الطالب؟' : 'هل أنت متأكد من حظر الطالب؟')) return;
    await secureFetch(`/admin/students/${id}/status`, { 
        method: 'POST', body: JSON.stringify({ isblocked: !currentStatus }) 
    });
    showToast(currentStatus ? 'تم فك الحظر بنجاح' : 'تم حظر الطالب بنجاح');
    fetchStudents();
};

window.blockFP = async (id) => {
    if(!confirm('هل أنت متأكد من حظر بصمة جهاز هذا الطالب؟')) return;
    const res = await secureFetch(`/admin/students/${id}/block-fingerprint`, { method: 'POST' });
    if(res && res.ok) showToast('✅ تم حظر الجهاز بنجاح');
};

window.unblockFP = async (id) => {
    if(!confirm('هل أنت متأكد من فك حظر جهاز هذا الطالب؟')) return;
    const res = await secureFetch(`/admin/students/${id}/unblock-fingerprint`, { method: 'POST' });
    if(res && res.ok) showToast('✅ تم فك حظر الجهاز بنجاح');
};

window.sendReply = async (id) => {
    const input = document.getElementById(`reply-${id}`);
    if(!input.value) return;
    await secureFetch(`/admin/messages/${id}/reply`, { 
        method: 'POST', body: JSON.stringify({ reply: input.value }) 
    });
    showToast('تم إرسال الرد بنجاح');
    fetchMessages();
};

window.deleteMsg = async (id) => {
    if(!confirm('هل تريد حذف هذه الرسالة نهائياً؟')) return;
    await secureFetch(`/admin/messages/${id}`, { method: 'DELETE' });
    showToast('تم حذف الرسالة');
    fetchMessages();
};

window.toggleLock = async (key, lock) => {
    const msg = lock ? 'عذراً، الاختبار مغلق حالياً.' : '';
    await secureFetch(`/admin/quiz-status/${key}`, { 
        method: 'POST', body: JSON.stringify({ locked: lock, message: msg }) 
    });
    showToast(lock ? 'تم قفل الاختبار' : 'تم فتح الاختبار');
    // إعادة تحميل القفل لتحديث اللون
    fetchLocks();
};

window.deleteUser = async (id, name) => {
    if(!confirm(`⚠️ تحذير!\n\nهل أنت متأكد تماماً من حذف الطالب: (${name})؟\n\nسيتم مسح جميع بياناته ونتائجه نهائياً ولا يمكن التراجع.`)) return;
    try {
        const res = await secureFetch(`/admin/students/${id}`, { method: 'DELETE' });
        if(res && res.ok) {
            showToast('✅ تم حذف الطالب بنجاح.');
            fetchStudents(); 
            fetchStats();
        } else {
            showToast('❌ فشل الحذف.', 'error');
        }
    } catch(e) {
        console.error(e);
        showToast('❌ خطأ في الاتصال.', 'error');
    }
};

// =================================================================
// 🆕 وظائف جديدة (تمت إضافتها للإصدار 21.0.0)
// =================================================================

// 1. تصدير البيانات إلى CSV
window.exportToCSV = function() {
    if (!GLOBAL_STUDENTS_DATA || GLOBAL_STUDENTS_DATA.length === 0) {
        showToast('لا توجد بيانات طلاب للتصدير', 'error');
        return;
    }
    
    // إعداد الترويسة
    const headers = ['ID', 'الاسم', 'البريد الإلكتروني', 'تاريخ التسجيل', 'الحالة', 'محظور'];
    const csvRows = [];
    csvRows.push(headers.join(','));

    // إضافة الصفوف
    GLOBAL_STUDENTS_DATA.forEach(s => {
        // تنظيف البيانات من الفواصل لتجنب كسر CSV
        const name = `"${s.name}"`; 
        const email = `"${s.email}"`;
        const date = `"${formatDate(s.createdat)}"`;
        const status = s.isblocked ? 'محظور' : 'نشط';
        
        csvRows.push([s.id, name, email, date, status, s.isblocked].join(','));
    });

    // إنشاء الملف
    const csvString = '\uFEFF' + csvRows.join('\n'); // إضافة BOM لدعم العربية في Excel
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    
    // إنشاء رابط وتفعيله
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `students_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('تم تحميل ملف CSV بنجاح');
};

// 2. تفعيل الرسم البياني (Chart.js)
function renderCharts(stats) {
    const ctx = document.getElementById('mainStatsChart');
    if (!ctx) return;
    
    // إظهار الحاوية
    const wrapper = document.getElementById('chart-wrapper-inner');
    if(wrapper) wrapper.style.display = 'block';

    if (statsChartInstance) statsChartInstance.destroy(); // تدمير القديم لتجنب التكرار

    statsChartInstance = new Chart(ctx, {
        type: 'bar', // نوع الرسم (عمودي)
        data: {
            labels: ['الطلاب المسجلين', 'الاختبارات المكتملة', 'متوسط الدرجات (%)'],
            datasets: [{
                label: 'نظرة عامة على الأداء',
                data: [stats.totalStudents, stats.totalQuizzes, stats.averageScore],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.6)',
                    'rgba(16, 185, 129, 0.6)',
                    'rgba(245, 158, 11, 0.6)'
                ],
                borderColor: [
                    'rgba(102, 126, 234, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(245, 158, 11, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'تحليل البيانات الفوري' }
            }
        }
    });
}

// 3. تهيئة الوضع الليلي (Dark Mode)
function initTheme() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    const savedTheme = localStorage.getItem('admin_theme');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    
    if (toggleBtn) {
        toggleBtn.onclick = () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('admin_theme', isDark ? 'dark' : 'light');
            showToast(isDark ? 'تم تفعيل الوضع الليلي 🌙' : 'تم تفعيل الوضع النهاري ☀️');
        };
    }
}

// 4. البحث العام (Top Bar Search)
function setupGlobalSearch() {
    const searchInput = document.getElementById('admin-search-input');
    if(!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        
        // فلترة جداول الطلاب
        const studentRows = document.querySelectorAll('#students-table tbody tr');
        if(studentRows) {
            studentRows.forEach(row => {
                row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
            });
        }
        
        // يمكنك توسيع البحث ليشمل الرسائل والسجلات هنا إذا أردت
    });
}
