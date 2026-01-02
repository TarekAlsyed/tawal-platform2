/*
 * =================================================================================
 * CONTROL_PANEL.JS - Version 21.0.0 (ULTIMATE ADMIN UPDATE)
 * تم دمج كافة الإصلاحات: SafeName, Null Checks, Device Unblock, Activity Sync
 * =================================================================================
 */

// ✅ التعديل: التأكد من الرابط الصحيح للسيرفر على Fly.io
const API_URL = 'https://tawal-backend-main.fly.dev/api';
let adminToken = localStorage.getItem('admin_token');

// متغير عالمي لتخزين بيانات الطلاب لغرض التصدير
let GLOBAL_STUDENTS_DATA = [];
let statsChartInstance = null; 

const SUBJECTS_LIST = {
    gis_networks: "تطبيقات GIS في الشبكات",
    transport: "جغرافية النقل والمواصلات",
    geo_maps: "الخرائط الجيولوجية",
    projections: "مساقط الخرائط",
    research: "مناهج البحث الجغرافي",
    surveying_texts: "نصوص جغرافية في المساحة",
    arid_lands: "جغرافيا الأراضي الجافة"
};

// خريطة ترجمة الأنشطة (لحل مشكلة النصوص الإنجليزية)
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
// 1. دوال مساعدة (Helpers)
// =================================================================

// ✅ المشكلة 10: تحسين formatDate لمعالجة null وتوحيد صيغة التوقيت
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
// 2. التشغيل والتهيئة (Initialization)
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    // ربط الدوال بالنافذة العالمية (Global Scope)
    window.deleteUser = deleteUser;
    window.toggleBlock = toggleBlock;
    window.blockFP = blockFP;
    window.unblockFP = unblockFP;
    window.showStudentDetails = showStudentDetails;
    window.sendReply = sendReply;
    window.deleteMsg = deleteMsg;
    window.toggleLock = toggleLock;
    window.exportToCSV = exportToCSV;

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
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
    const div = document.createElement('div');
    div.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background-color: #f3f4f6; display:flex; justify-content:center; align-items:center; z-index:10000; font-family:'Inter', 'Cairo', sans-serif;`;
    div.innerHTML = `
        <div style="background:white; padding:40px; border-radius:16px; width:100%; max-width:400px; text-align:center; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
            <div style="margin-bottom:20px; width:60px; height:60px; background:linear-gradient(135deg, #667eea, #764ba2); border-radius:12px; display:inline-flex; align-items:center; justify-content:center; color:white; font-size:1.5rem;">🛡️</div>
            <h2 style="color:#111827; margin-bottom:10px; font-weight:700;">Admin Panel</h2>
            <p style="color:#6b7280; margin-bottom:30px; font-size:0.9rem;">يرجى تسجيل الدخول للمتابعة</p>
            <div style="text-align:right; margin-bottom:8px; font-size:0.85rem; font-weight:600; color:#374151;">كلمة المرور</div>
            <input type="password" id="passInput" placeholder="••••••••" style="width:100%; padding:12px 15px; margin-bottom:20px; border:1px solid #d1d5db; border-radius:8px; outline:none; transition:0.2s;">
            <button id="loginBtn" style="width:100%; padding:12px; background:linear-gradient(135deg, #667eea, #764ba2); color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;">تسجيل الدخول</button>
            <p id="loginErr" style="color:#ef4444; margin-top:15px; display:none; font-size:0.9rem; background:#fee2e2; padding:10px; border-radius:6px;"></p>
        </div>`;
    document.body.appendChild(div);

    const btn = document.getElementById('loginBtn');
    const inp = document.getElementById('passInput');
    const err = document.getElementById('loginErr');

    const handleLogin = async () => {
        const password = inp.value;
        if (!password) return;
        btn.innerText = 'جاري التحقق...';
        btn.disabled = true;
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
        }
    };
    btn.onclick = handleLogin;
    inp.onkeypress = (e) => { if (e.key === 'Enter') handleLogin(); };
}

function initializeDashboard() {
    addLogoutButton();
    loadAllData();
    // تحديث البيانات كل 30 ثانية
    setInterval(() => { fetchMessages(); fetchLogs(); fetchActivityLogs(); }, 30000);
}

function addLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            if(confirm('هل تريد تسجيل الخروج؟')) {
                localStorage.removeItem('admin_token');
                window.location.href = 'index.html';
            }
        };
    }
}

async function loadAllData() {
    await Promise.all([fetchStats(), fetchStudents(), fetchMessages(), fetchLocks(), fetchActivityLogs(), fetchLogs()]);
}

// =================================================================
// 3. جلب البيانات (Data Fetching)
// =================================================================

async function fetchStats() {
    const res = await secureFetch('/admin/stats');
    if (!res) return;
    const data = await res.json();
    
    document.getElementById('stats-container').innerHTML = `
        <div class="stats-section" style="grid-template-columns: repeat(3, 1fr);">
            <div class="summary-box" style="border-bottom: 4px solid #667eea;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="summary-label">إجمالي الطلاب</div>
                    <i data-lucide="users" style="color:#667eea; opacity:0.8;"></i>
                </div>
                <div class="summary-val">${data.totalStudents}</div>
            </div>
            <div class="summary-box" style="border-bottom: 4px solid #10b981;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="summary-label">الاختبارات المنجزة</div>
                    <i data-lucide="file-check" style="color:#10b981; opacity:0.8;"></i>
                </div>
                <div class="summary-val">${data.totalQuizzes}</div>
            </div>
            <div class="summary-box" style="border-bottom: 4px solid #f59e0b;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="summary-label">متوسط الدرجات</div>
                    <i data-lucide="bar-chart-2" style="color:#f59e0b; opacity:0.8;"></i>
                </div>
                <div class="summary-val">${data.averageScore}%</div>
            </div>
        </div>
        <div style="position: relative; height: 300px; width: 100%;" id="chart-wrapper-inner">
             <canvas id="mainStatsChart"></canvas>
        </div>`;
        
    if (typeof lucide !== 'undefined') lucide.createIcons();
    if(typeof Chart !== 'undefined') setTimeout(() => renderCharts(data), 100);
}

// ✅ المشكلة 1 و المشكلة المفقودة: إصلاح الأسماء وإضافة زر فك حظر الجهاز
async function fetchStudents() {
    const res = await secureFetch('/admin/students');
    if (!res) return;
    const students = await res.json();
    GLOBAL_STUDENTS_DATA = students;
    
    const container = document.getElementById('students-container');
    if (students.length === 0) {
        container.innerHTML = '<p class="empty">لا يوجد طلاب مسجلين.</p>';
        return;
    }

    let html = `
        <div style="margin-bottom:20px; position:relative;">
            <i data-lucide="search" style="position:absolute; right:12px; top:12px; width:18px; color:#9ca3af;"></i>
            <input type="text" id="student-search-input" placeholder="بحث عن طالب..." 
            style="width:100%; padding:10px 40px 10px 10px; border:1px solid #e5e7eb; border-radius:10px;">
        </div>
        <div class="admin-table-container">
        <table class="admin-table" id="students-table">
            <thead>
                <tr>
                    <th>الاسم</th>
                    <th>البريد</th>
                    <th>التسجيل</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                </tr>
            </thead>
            <tbody>`;

    students.forEach(s => {
        const isBlocked = s.isblocked; 
        // ✅ المشكلة 1: استخدام &#39; بدلاً من \' لعدم كسر الـ HTML
        const safeNameForJS = (s.name || '').replace(/'/g, "&#39;"); 
        
        html += `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:32px; height:32px; background:#e0e7ff; color:#4e54c8; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">
                            ${s.name ? s.name.charAt(0) : '?'}
                        </div>
                        <span class="clickable-student" onclick="showStudentDetails(${s.id})">${s.name}</span>
                    </div>
                </td>
                <td style="color:#6b7280; font-size:0.9rem;">${s.email}</td>
                <td style="font-size:0.85rem; color:#9ca3af;">${formatDate(s.createdat)}</td>
                <td><span class="badge ${isBlocked ? 'bg-red' : 'bg-green'}">${isBlocked ? 'محظور' : 'نشط'}</span></td>
                <td style="display:flex; gap:8px;">
                    <button class="btn ${isBlocked ? 'btn-green' : 'btn-red'}" 
                            onclick="toggleBlock(${s.id}, ${isBlocked})" 
                            title="${isBlocked ? 'فك حظر الحساب' : 'حظر الحساب'}">
                        <i data-lucide="${isBlocked ? 'unlock' : 'lock'}" style="width:16px;"></i>
                    </button>
                    
                    <button class="btn" style="background:#f3f4f6; color:#4b5563;" 
                            onclick="blockFP(${s.id})" title="حظر بصمة الجهاز">
                        <i data-lucide="smartphone" style="width:16px;"></i>
                    </button>
                    
                    <button class="btn" style="background:#ecfdf5; color:#10b981;" 
                            onclick="unblockFP(${s.id})" title="فك حظر بصمة الجهاز">
                        <i data-lucide="shield-check" style="width:16px;"></i>
                    </button>
                    
                    <button class="btn" style="background:#fee2e2; color:#ef4444;" 
                            onclick="deleteUser(${s.id}, '${safeNameForJS}')" title="حذف نهائي">
                        <i data-lucide="trash-2" style="width:16px;"></i>
                    </button>
                </td>
            </tr>`;
    });
    container.innerHTML = html + '</tbody></table></div>';

    document.getElementById('student-search-input').addEventListener('input', (e) => {
        const filter = e.target.value.toLowerCase();
        document.querySelectorAll('#students-table tbody tr').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(filter) ? '' : 'none';
        });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ✅ المشكلة "undefined" في سجل الأنشطة: توحيد مسميات الحقول
async function fetchActivityLogs() {
    const container = document.getElementById('activity-logs-container');
    const res = await secureFetch('/admin/activity-logs'); 
    if (!res) return;
    const activities = await res.json();
    
    // ✅ المشكلة 8: عرض رسالة عند عدم وجود بيانات
    if (!activities || activities.length === 0) {
        container.innerHTML = '<div class="placeholder" style="text-align:center; padding:2rem; color:var(--text-secondary);">📭 لا توجد سجلات أنشطة حديثة</div>';
        return;
    }

    let html = `
        <div class="admin-table-container">
            <table class="admin-table">
                <thead>
                    <tr><th>الطالب</th><th>النشاط</th><th>التفاصيل</th><th>الوقت</th></tr>
                </thead>
                <tbody>`;
                
    activities.forEach(a => {
        // ✅ حل مشكلة الـ undefined بفحص كلا المسميين (Case-sensitive check) & Normalization
        let rawType = a.activityType || a.activitytype || '';
        if (typeof rawType === 'string') rawType = rawType.toLowerCase();

        const subject = a.subjectName || a.subjectname || '-';
        const student = a.studentName || a.studentname || 'غير معروف';
        const date = a.date || a.timestamp || a.createdat;
        
        // تحسين عرض اسم النشاط
        let displayType = ACTIVITY_MAP[rawType] || rawType || 'نشاط غير معروف';
        
        // إذا كان النوع بالإنجليزية ولم يوجد في الخريطة، حاول تحسين عرضه
        if (displayType === rawType && /^[a-z_]+$/i.test(rawType)) {
            displayType = rawType.replace(/_/g, ' ');
        }

        html += `
            <tr>
                <td style="font-weight:600;">${student}</td>
                <td>${displayType}</td>
                <td>${subject}</td>
                <td style="color:#9ca3af;">${formatDate(date)}</td>
            </tr>`;
    });
    container.innerHTML = html + '</tbody></table></div>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ✅ المشكلة 6: تحسين عرض تفاصيل الطالب مع إضافة Null Checks وفلترة "undefined"
window.showStudentDetails = async (studentId) => {
    const modal = document.getElementById('student-modal');
    const modalName = document.getElementById('modal-student-name');
    const modalStats = document.getElementById('modal-stats-container');
    const modalResults = document.getElementById('modal-results-container');
    const modalActivity = document.getElementById('modal-activity-container');
    
    modalName.innerText = 'جاري التحميل...';
    modal.style.display = 'block';

    try {
        const [student, stats, results, activityLogs] = await Promise.all([
            secureFetch(`/students/${studentId}`).then(r => r ? r.json() : {}),
            secureFetch(`/students/${studentId}/stats`).then(r => r ? r.json() : {}),
            secureFetch(`/students/${studentId}/results`).then(r => r ? r.json() : []),
            secureFetch(`/students/${studentId}/activity`).then(r => r ? r.json() : [])
        ]);

        modalName.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px;">
                <div style="width:50px; height:50px; background:#e0e7ff; color:#4e54c8; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; font-weight:bold;">
                    ${student.name ? student.name.charAt(0) : '?'}
                </div>
                <div>
                    <div>${student.name || 'غير معروف'}</div>
                    <div style="font-size:0.85rem; color:#6b7280;">${student.email || ''}</div>
                </div>
            </div>`;

        modalStats.innerHTML = `
            <div class="stats-section" style="grid-template-columns: repeat(3, 1fr); gap:15px; margin-bottom:0;">
                <div class="summary-box"> <p class="summary-label">الاختبارات</p><p class="summary-val">${stats.totalQuizzes || 0}</p></div>
                <div class="summary-box"><p class="summary-label">المعدل</p><p class="summary-val">${stats.averageScore || 0}%</p></div>
                <div class="summary-box"><p class="summary-label">الأفضل</p><p class="summary-val">${stats.bestScore || 0}%</p></div>
            </div>`;

        // ✅ معالجة النتائج بفحص الحقول بدقة
        let resultsHtml = '';
        if (!results || !Array.isArray(results) || results.length === 0) {
            resultsHtml = '<p class="empty">لم يقم بأي اختبار بعد.</p>';
        } else {
            resultsHtml = '<div class="admin-table-container"><table class="admin-table"><thead><tr><th>الاختبار</th><th>النتيجة</th><th>التاريخ</th></tr></thead><tbody>';
            results.filter(r => r).forEach(r => {
                const sId = r.subjectId || r.subjectid;
                const score = Math.max(0, Math.min(100, parseInt(r.score) || 0));
                const color = score >= 90 ? '#10b981' : score >= 50 ? '#3b82f6' : '#ef4444';
                resultsHtml += `
                    <tr>
                        <td>${SUBJECTS_LIST[sId] || r.quizName || r.quizname || 'اختبار'}</td>
                        <td><span style="background:${color}20; color:${color}; padding:2px 8px; border-radius:4px; font-weight:bold;">${score}%</span></td>
                        <td style="font-size:0.85rem; color:#9ca3af;">${formatDate(r.completedAt || r.completedat)}</td>
                    </tr>`;
            });
            resultsHtml += '</tbody></table></div>';
        }
        modalResults.innerHTML = resultsHtml;

        // ✅ معالجة سجل الأنشطة الفرعي
        let activityHtml = '';
        if (!activityLogs || activityLogs.length === 0) {
            activityHtml = '<p class="empty">لا يوجد نشاط مسجل مؤخراً.</p>';
        } else {
            activityHtml = '<div class="admin-table-container" style="max-height:300px; overflow-y:auto;"><table class="admin-table"><thead><tr><th>النشاط</th><th>التفاصيل</th><th>الوقت</th></tr></thead><tbody>';
            activityLogs.forEach(l => {
                const type = l.activitytype || l.activityType;
                const subject = l.subjectname || l.subjectName || '-';
                activityHtml += `<tr><td>${ACTIVITY_MAP[type] || type}</td><td>${subject}</td><td>${formatDate(l.timestamp || l.date)}</td></tr>`;
            });
            activityHtml += '</tbody></table></div>';
        }
        if(modalActivity) modalActivity.innerHTML = activityHtml;

    } catch (e) { 
        console.error("Error loading student details:", e);
        modalStats.innerHTML = '<p class="empty">فشل تحميل البيانات.</p>'; 
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

async function fetchMessages() {
    const res = await secureFetch('/admin/messages');
    if (!res) return;
    const msgs = await res.json();
    const container = document.getElementById('messages-container');
    if (msgs.length === 0) { container.innerHTML = '<p class="empty">لا توجد رسائل دعم فني.</p>'; return; }
    container.innerHTML = msgs.map(m => `
        <div style="padding: 15px; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 12px; background: #fff; border-right: 4px solid ${m.adminreply ? '#10b981' : '#f59e0b'};">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <strong>${m.studentName || m.studentname || 'طالب'}</strong>
                <span style="font-size:0.75rem; color:#9ca3af;">${formatDate(m.createdat)}</span>
            </div>
            <div style="background:#f9fafb; padding:10px; border-radius:8px; margin-bottom:10px; color:#374151;">${m.content}</div>
            ${m.adminreply ? `<div style="color:var(--color-correct); font-size:0.9rem;">✅ تم الرد: ${m.adminreply}</div>` : `
                <div style="display:flex; gap:10px;">
                    <input type="text" id="reply-${m.id}" placeholder="اكتب ردك هنا..." style="flex:1; padding:8px; border:1px solid #ddd; border-radius:6px;">
                    <button class="btn btn-green" onclick="sendReply(${m.id})">إرسال</button>
                </div>`}
            <button onclick="deleteMsg(${m.id})" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:0.8rem; margin-top:10px;">حذف الرسالة</button>
        </div>`).join('');
}

async function fetchLocks() {
    const res = await secureFetch('/quiz-status');
    if (!res) return;
    const locks = await res.json();
    let html = '<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:10px;">';
    for (const [key, name] of Object.entries(SUBJECTS_LIST)) {
        const isLocked = locks[key]?.locked || false;
        html += `
            <div style="padding: 12px; border: 1px solid #eee; background: ${isLocked ? '#fef2f2' : '#f0fdf4'}; border-radius: 10px; display: flex; justify-content: space-between; align-items:center;">
                <span style="font-size:0.9rem;">${name}</span>
                <input type="checkbox" ${isLocked ? 'checked' : ''} onchange="toggleLock('${key}', this.checked)" style="width:18px; height:18px; cursor:pointer;">
            </div>`;
    }
    document.getElementById('quiz-locks-container').innerHTML = html + '</div>';
}

async function fetchLogs() {
    const res = await secureFetch('/admin/login-logs');
    if (!res) return;
    const logs = await res.json();
    let html = `<div class="admin-table-container"><table class="admin-table"><thead><tr><th>الطالب</th><th>وقت الدخول</th><th>الحالة</th></tr></thead><tbody>`;
    html += logs.map(l => `
        <tr>
            <td>${l.name || l.studentname}</td>
            <td>${formatDate(l.logintime)}</td>
            <td><span class="badge ${l.logouttime ? 'bg-gray' : 'bg-green'}">${l.logouttime ? 'غادر' : 'متصل حالياً'}</span></td>
        </tr>`).join('');
    document.getElementById('logs-container').innerHTML = html + '</tbody></table></div>';
}

// =================================================================
// 4. إجراءات الإدارة (Admin Actions)
// =================================================================

window.toggleBlock = async (id, currentStatus) => {
    if(!confirm('هل تريد تغيير حالة حظر هذا الحساب؟')) return;
    await secureFetch(`/admin/students/${id}/status`, { method: 'POST', body: JSON.stringify({ isblocked: !currentStatus }) });
    showToast('تم تحديث حالة الحساب'); 
    fetchStudents();
};

window.blockFP = async (id) => {
    if(!confirm('هل تريد حظر بصمة جهاز هذا الطالب؟')) return;
    const res = await secureFetch(`/admin/students/${id}/block-fingerprint`, { method: 'POST' });
    if(res && res.ok) showToast('✅ تم حظر الجهاز بنجاح');
};

// ✅ الميزة المضافة: فك حظر الجهاز
window.unblockFP = async (id) => {
    if(!confirm('هل تريد فك حظر بصمة جهاز هذا الطالب؟')) return;
    const res = await secureFetch(`/admin/students/${id}/unblock-fingerprint`, { method: 'POST' });
    if(res && res.ok) showToast('✅ تم فك حظر الجهاز بنجاح');
    else if(res) showToast('فشل فك الحظر، قد لا يكون محظوراً', 'error');
};

window.sendReply = async (id) => {
    const input = document.getElementById(`reply-${id}`);
    if(!input || !input.value.trim()) return;
    const res = await secureFetch(`/admin/messages/${id}/reply`, { method: 'POST', body: JSON.stringify({ reply: input.value.trim() }) });
    if(res) { showToast('تم إرسال الرد'); fetchMessages(); }
};

window.deleteMsg = async (id) => {
    if(!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
    const res = await secureFetch(`/admin/messages/${id}`, { method: 'DELETE' });
    if(res) { showToast('تم الحذف'); fetchMessages(); }
};

window.toggleLock = async (key, lock) => {
    await secureFetch(`/admin/quiz-status/${key}`, { method: 'POST', body: JSON.stringify({ locked: lock, message: lock ? 'هذا الاختبار مغلق حالياً بقرار من الإدارة.' : '' }) });
    showToast(`تم ${lock ? 'قفل' : 'فتح'} اختبار ${SUBJECTS_LIST[key]}`); 
    fetchLocks();
};

window.deleteUser = async (id, name) => {
    if(!confirm(`⚠️ تحذير: سيتم حذف الطالب "${name}" وكافة نتائجه نهائياً. هل أنت متأكد؟`)) return;
    const res = await secureFetch(`/admin/students/${id}`, { method: 'DELETE' });
    if(res) { showToast('تم حذف الطالب بنجاح'); fetchStudents(); fetchStats(); }
};

// =================================================================
// 5. ميزات إضافية (Charts, CSV, Theme)
// =================================================================

window.exportToCSV = function() {
    if (!GLOBAL_STUDENTS_DATA.length) { showToast('لا توجد بيانات لتصديرها', 'error'); return; }
    const headers = ['الاسم', 'البريد', 'تاريخ التسجيل', 'الحالة'];
    const rows = GLOBAL_STUDENTS_DATA.map(s => [
        s.name, 
        s.email, 
        formatDate(s.createdat).replace(',', ''), 
        s.isblocked ? 'محظور' : 'نشط'
    ].join(','));
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Tawal_Academy_Students_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast('جاري تصدير البيانات...');
};

function renderCharts(stats) {
    const ctx = document.getElementById('mainStatsChart');
    if (!ctx || typeof Chart === 'undefined') return;
    if (statsChartInstance) statsChartInstance.destroy();
    
    statsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['الطلاب', 'الاختبارات', 'المعدل العام %'],
            datasets: [{ 
                label: 'إحصائيات المنصة', 
                data: [stats.totalStudents, stats.totalQuizzes, stats.averageScore], 
                backgroundColor: ['rgba(102, 126, 234, 0.7)', 'rgba(16, 185, 129, 0.7)', 'rgba(245, 158, 11, 0.7)'],
                borderColor: ['#667eea', '#10b981', '#f59e0b'],
                borderWidth: 1 
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'نظرة عامة على أداء المنصة' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function initTheme() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    const savedTheme = localStorage.getItem('admin_theme');
    if (savedTheme === 'dark') document.body.classList.add('dark-mode');
    if (toggleBtn) {
        toggleBtn.onclick = () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('admin_theme', isDark ? 'dark' : 'light');
        };
    }
}

function setupGlobalSearch() {
    const input = document.getElementById('admin-search-input');
    if(!input) return;
    input.oninput = (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('#students-table tbody tr').forEach(row => { 
            row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none'; 
        });
    };
}