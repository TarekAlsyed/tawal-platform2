/*
 * =================================================================================
 * CONTROL_PANEL.JS - Version 21.0.0 (FULL FUNCTIONALITY UPDATE)
 * تم حل مشكلة زر فك حظر الجهاز وإضافة كافة الأزرار في جدول الطلاب
 * =================================================================================
 */

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
            ">
            <button id="loginBtn" style="
                width:100%; padding:12px; background:linear-gradient(135deg, #667eea, #764ba2);
                color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;
            ">تسجيل الدخول</button>
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
    setInterval(() => { fetchMessages(); fetchLogs(); fetchActivityLogs(); }, 30000);
}

function addLogoutButton() {
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

async function fetchStats() {
    const res = await secureFetch('/admin/stats');
    if (!res) return;
    const data = await res.json();
    if(typeof Chart !== 'undefined') renderCharts(data);

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

// 🔥 التعديل هنا: إضافة زر فك حظر الجهاز (الدرع الأخضر) في عمود الإجراءات 🔥
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
        const safeName = (s.name || '').replace(/'/g, "\\'"); 
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
                            style="padding:6px; border-radius:6px;" 
                            onclick="toggleBlock(${s.id}, ${isBlocked})" 
                            title="${isBlocked ? 'فك حظر الحساب' : 'حظر الحساب'}">
                        <i data-lucide="${isBlocked ? 'unlock' : 'lock'}" style="width:16px; height:16px;"></i>
                    </button>
                    
                    <button class="btn" style="background:#f3f4f6; color:#4b5563; padding:6px; border-radius:6px;" 
                            onclick="blockFP(${s.id})" title="حظر بصمة الجهاز">
                        <i data-lucide="smartphone" style="width:16px; height:16px;"></i>
                    </button>
                    
                    <button class="btn" style="background:#ecfdf5; color:#10b981; padding:6px; border-radius:6px;" 
                            onclick="unblockFP(${s.id})" title="فك حظر بصمة الجهاز">
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

    document.getElementById('student-search-input').addEventListener('input', (e) => {
        const filter = e.target.value.toLowerCase();
        document.querySelectorAll('#students-table tbody tr').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(filter) ? '' : 'none';
        });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function fetchActivityLogs() {
    const container = document.getElementById('activity-logs-container');
    const res = await secureFetch('/admin/activity-logs'); 
    if (!res) return;
    const activities = await res.json();
    let html = `<div class="admin-table-container"><table class="admin-table"><thead><tr><th>الطالب</th><th>النشاط</th><th>التفاصيل</th><th>الوقت</th></tr></thead><tbody>`;
    activities.forEach(a => {
        const type = a.activityType || a.activitytype;
        html += `<tr><td>${a.studentName}</td><td>${ACTIVITY_MAP[type] || type}</td><td>${a.subjectName || a.subjectname || '-'}</td><td>${formatDate(a.date)}</td></tr>`;
    });
    container.innerHTML = html + '</tbody></table></div>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

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
        modalName.innerHTML = `<div>${student.name || 'غير معروف'}</div><div style="font-size:0.85rem; color:#6b7280;">${student.email || ''}</div>`;
        modalStats.innerHTML = `<div class="stats-section" style="grid-template-columns: repeat(3, 1fr); gap:15px;"><div class="summary-box"><p class="summary-label">الاختبارات</p><p class="summary-val">${stats.totalQuizzes || 0}</p></div><div class="summary-box"><p class="summary-label">المعدل</p><p class="summary-val">${stats.averageScore || 0}%</p></div><div class="summary-box"><p class="summary-label">الأفضل</p><p class="summary-val">${stats.bestScore || 0}%</p></div></div>`;
        
        let resultsHtml = results.length === 0 ? '<p class="empty">لا توجد نتائج.</p>' : '<div class="admin-table-container"><table class="admin-table"><thead><tr><th>الاختبار</th><th>النتيجة</th><th>التاريخ</th></tr></thead><tbody>' + 
            results.map(r => `<tr><td>${SUBJECTS_LIST[r.subjectId || r.subjectid] || r.quizName}</td><td>${r.score}%</td><td>${formatDate(r.completedAt || r.completedat)}</td></tr>`).join('') + '</tbody></table></div>';
        modalResults.innerHTML = resultsHtml;
        
        let activityHtml = activityLogs.length === 0 ? '<p class="empty">لا يوجد نشاط.</p>' : '<div class="admin-table-container"><table class="admin-table"><thead><tr><th>النشاط</th><th>التفاصيل</th><th>الوقت</th></tr></thead><tbody>' + 
            activityLogs.map(l => `<tr><td>${ACTIVITY_MAP[l.activitytype] || l.activitytype}</td><td>${l.subjectname || '-'}</td><td>${formatDate(l.timestamp)}</td></tr>`).join('') + '</tbody></table></div>';
        if(modalActivity) modalActivity.innerHTML = activityHtml;
    } catch (e) { console.error(e); }
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

async function fetchMessages() {
    const res = await secureFetch('/admin/messages');
    if (!res) return;
    const msgs = await res.json();
    const container = document.getElementById('messages-container');
    if (msgs.length === 0) { container.innerHTML = '<p class="empty">لا توجد رسائل.</p>'; return; }
    container.innerHTML = msgs.map(m => `
        <div style="padding: 15px; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 12px; background: #fff; border-right: 4px solid ${m.adminreply ? '#10b981' : '#f59e0b'};">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><strong>${m.studentName || 'طالب'}</strong><span>${formatDate(m.createdat)}</span></div>
            <div style="background:#f9fafb; padding:10px; border-radius:8px; margin-bottom:10px;">${m.content}</div>
            ${m.adminreply ? `<div>✅ تم الرد: ${m.adminreply}</div>` : `<div><input type="text" id="reply-${m.id}" placeholder="رد..."><button onclick="sendReply(${m.id})">إرسال</button></div>`}
            <button onclick="deleteMsg(${m.id})" style="color:red; background:none; border:none; cursor:pointer; font-size:0.8rem; margin-top:5px;">حذف</button>
        </div>`).join('');
}

async function fetchLocks() {
    const res = await secureFetch('/quiz-status');
    if (!res) return;
    const locks = await res.json();
    let html = '<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:10px;">';
    for (const [key, name] of Object.entries(SUBJECTS_LIST)) {
        const isLocked = locks[key]?.locked || false;
        html += `<div style="padding: 12px; border: 1px solid #eee; background: ${isLocked ? '#fef2f2' : '#f0fdf4'}; border-radius: 10px; display: flex; justify-content: space-between;">
                <span>${name}</span><input type="checkbox" ${isLocked ? 'checked' : ''} onchange="toggleLock('${key}', this.checked)"></div>`;
    }
    document.getElementById('quiz-locks-container').innerHTML = html + '</div>';
}

async function fetchLogs() {
    const res = await secureFetch('/admin/login-logs');
    if (!res) return;
    const logs = await res.json();
    let html = `<div class="admin-table-container"><table class="admin-table"><thead><tr><th>الطالب</th><th>وقت الدخول</th><th>الحالة</th></tr></thead><tbody>`;
    html += logs.map(l => `<tr><td>${l.name}</td><td>${formatDate(l.logintime)}</td><td>${l.logouttime ? 'غادر' : 'متصل'}</td></tr>`).join('');
    document.getElementById('logs-container').innerHTML = html + '</tbody></table></div>';
}

window.toggleBlock = async (id, currentStatus) => {
    if(!confirm('هل تريد تغيير حالة الحظر؟')) return;
    await secureFetch(`/admin/students/${id}/status`, { method: 'POST', body: JSON.stringify({ isblocked: !currentStatus }) });
    showToast('تم التحديث'); fetchStudents();
};

window.blockFP = async (id) => {
    if(!confirm('هل تريد حظر بصمة جهاز هذا الطالب؟')) return;
    const res = await secureFetch(`/admin/students/${id}/block-fingerprint`, { method: 'POST' });
    if(res && res.ok) showToast('✅ تم حظر الجهاز بنجاح');
};

// وظيفة فك حظر الجهاز
window.unblockFP = async (id) => {
    if(!confirm('هل تريد فك حظر بصمة جهاز هذا الطالب؟')) return;
    const res = await secureFetch(`/admin/students/${id}/unblock-fingerprint`, { method: 'POST' });
    if(res && res.ok) showToast('✅ تم فك حظر الجهاز بنجاح');
};

window.sendReply = async (id) => {
    const input = document.getElementById(`reply-${id}`);
    if(!input.value) return;
    await secureFetch(`/admin/messages/${id}/reply`, { method: 'POST', body: JSON.stringify({ reply: input.value }) });
    showToast('تم الرد'); fetchMessages();
};

window.deleteMsg = async (id) => {
    if(!confirm('حذف الرسالة؟')) return;
    await secureFetch(`/admin/messages/${id}`, { method: 'DELETE' });
    fetchMessages();
};

window.toggleLock = async (key, lock) => {
    await secureFetch(`/admin/quiz-status/${key}`, { method: 'POST', body: JSON.stringify({ locked: lock, message: lock ? 'الاختبار مغلق' : '' }) });
    showToast('تم التحديث'); fetchLocks();
};

window.deleteUser = async (id, name) => {
    if(!confirm(`حذف الطالب ${name} نهائياً؟`)) return;
    const res = await secureFetch(`/admin/students/${id}`, { method: 'DELETE' });
    if(res) { showToast('تم الحذف'); fetchStudents(); fetchStats(); }
};

window.exportToCSV = function() {
    if (!GLOBAL_STUDENTS_DATA.length) return;
    const headers = ['الاسم', 'البريد', 'التاريخ', 'الحالة'];
    const rows = GLOBAL_STUDENTS_DATA.map(s => [s.name, s.email, formatDate(s.createdat), s.isblocked ? 'محظور' : 'نشط'].join(','));
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `students_${new Date().toLocaleDateString()}.csv`;
    link.click();
};

function renderCharts(stats) {
    const ctx = document.getElementById('mainStatsChart');
    if (!ctx || typeof Chart === 'undefined') return;
    if (statsChartInstance) statsChartInstance.destroy();
    statsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['الطلاب', 'الاختبارات', 'المعدل %'],
            datasets: [{ label: 'الأداء العام', data: [stats.totalStudents, stats.totalQuizzes, stats.averageScore], backgroundColor: ['#667eea', '#10b981', '#f59e0b'] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function initTheme() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (localStorage.getItem('admin_theme') === 'dark') document.body.classList.add('dark-mode');
    if (toggleBtn) toggleBtn.onclick = () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('admin_theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    };
}

function setupGlobalSearch() {
    const input = document.getElementById('admin-search-input');
    if(!input) return;
    input.oninput = (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('#students-table tbody tr').forEach(row => { row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none'; });
    };
}