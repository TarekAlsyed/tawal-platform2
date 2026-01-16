/*
 * Service Worker (sw.js) for Tawal Academy
 * v19.0.0 (Emergency Update - Force Cache Reset)
 * ---------------------------------------------------------
 * هذا الملف مسؤول عن:
 * 1. جعل الموقع يعمل بدون إنترنت (Offline Mode).
 * 2. تخزين الملفات الأساسية (HTML, CSS, JS) في الكاش.
 * 3. تحديث الملفات تلقائياً عند تغيير رقم الإصدار (CACHE_NAME).
 * ---------------------------------------------------------
 */

// (*** هام: تم تغيير الرقم إلى v52 لإجبار المتصفح على نسيان الكاش القديم تماماً ***)
const CACHE_NAME = 'tawal-academy-cache-v60'; 
const DATA_CACHE_NAME = 'tawal-data-cache-v27';
const FONT_CACHE = 'tawal-fonts-cache-v6';

// تأكد أن هذا المسار يطابق اسم المستودع الخاص بك على GitHub
// تم التعديل ليكون نسبيًا ليعمل في أي بيئة (Localhost/Production)
const BASE_PATH = './'; 

// قائمة الملفات التي سيتم تخزينها (تم تحديث أرقام الإصدارات لـ 20.0.0)
const CORE_FILES_TO_CACHE = [
    `${BASE_PATH}index.html`,
    `${BASE_PATH}quiz.html`,
    `${BASE_PATH}summary.html`,
    `${BASE_PATH}dashboard.html`,
    `${BASE_PATH}control_panel.html`,
    `${BASE_PATH}style.css?v=22.0.0`,          
    `${BASE_PATH}app.js?v=22.0.0`,             
    `${BASE_PATH}control_panel.js?v=21.0.0`    // ✅ النسخة الجديدة التي تخفي القسم الزائد
];

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap';

// 1. مرحلة التثبيت (Install Event)
// يتم فيها تحميل وتخزين الملفات الأساسية
self.addEventListener('install', (event) => {
    // هذا السطر مهم جداً: يجبر السيرفر وركر الجديد على استبدال القديم فوراً
    self.skipWaiting();

    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then((cache) => {
                console.log('SW: Caching core files (v19.0.0)...');
                return cache.addAll(CORE_FILES_TO_CACHE);
            }),
            caches.open(FONT_CACHE).then((cache) => {
                return cache.add(FONT_URL);
            })
        ])
    );
});

// 2. مرحلة التفعيل (Activate Event)
// يتم فيها حذف الكاش القديم لتوفير المساحة وتحميل الجديد
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // حذف أي كاش لا يطابق الاسم الجديد (تنظيف كل النسخ القديمة)
                    if (cacheName !== CACHE_NAME && cacheName !== FONT_CACHE && cacheName !== DATA_CACHE_NAME) {
                        console.log('SW: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('SW: Now controlling the page immediately');
            return self.clients.claim(); // السيطرة على الصفحات المفتوحة فوراً
        }) 
    );
});

// 3. مرحلة جلب البيانات (Fetch Event)
// تحديد كيفية الاستجابة للطلبات (من الكاش أو من الإنترنت)
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // ✅ استثناء طلبات API من الكاش نهائياً (Network Only) مع استجابة واضحة
    if (requestUrl.pathname.includes('/api/')) {
        event.respondWith(fetch(event.request));
        return; 
    }

    // أ. استراتيجية الخطوط (Cache First)
    // نبحث في الكاش أولاً، إذا لم نجد نحمل من النت ونخزن
    if (requestUrl.href === FONT_URL) {
        event.respondWith(
            caches.match(event.request, { cacheName: FONT_CACHE }).then((response) => {
                return response || fetch(event.request).then((networkResponse) => {
                    caches.open(FONT_CACHE).then((cache) => cache.put(event.request, networkResponse.clone()));
                    return networkResponse;
                });
            })
        );
        return;
    }
    
    // ب. استراتيجية ملفات البيانات JSON (Network First with Cache Fallback)
    // نحاول جلب أحدث نسخة من النت، إذا فشلنا (أوفلاين) نستخدم الكاش
    if (requestUrl.pathname.includes('/data_') && requestUrl.pathname.endsWith('.json')) {
        event.respondWith(
            caches.open(DATA_CACHE_NAME).then((cache) => {
                return fetch(event.request).then((networkResponse) => {
                    // تحديث الكاش بالنسخة الجديدة
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                }).catch(() => {
                    // في حالة الأوفلاين، هات القديم
                    return cache.match(event.request);
                });
            })
        );
        return;
    }

    // ج. استراتيجية الملفات الأساسية (Cache First)
    // الآن مع تغيير اسم الكاش في الأعلى، سيتم إجبار المتصفح على جلب الملفات الجديدة
    event.respondWith(
        caches.match(event.request, { cacheName: CACHE_NAME }).then((response) => {
            return response || fetch(event.request);
        })
    );
});
