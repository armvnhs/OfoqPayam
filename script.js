// تنظیمات اتصال Supabase
const SUPABASE_URL = 'https://kpzzfsyzqkvuypseccri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_SO025VlsajUKd5lhl7CBwg_9nvrHvm-'; 

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// متغیرهای وضعیت
let currentUser = null;

// المنت‌های HTML
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const msgContainer = document.getElementById('messages-container');
const msgForm = document.getElementById('message-form');
const msgInput = document.getElementById('message-input');
const logoutBtn = document.getElementById('logout-btn');

// --- ۱. مدیریت لاگین ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = 'در حال بررسی هویت...';
    
    const username = document.getElementById('username').value.toLowerCase().trim();
    const password = document.getElementById('password').value;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (error || !data) {
            throw new Error('نام کاربری یا رمز عبور اشتباه است.');
        }

        currentUser = data;
        switchToChat();
    } catch (err) {
        console.error(err);
        if(err.message.includes('fetch')) {
            loginError.textContent = 'خطا در اتصال: لطفاً VPN را چک کنید.';
        } else {
            loginError.textContent = err.message;
        }
    }
});

function switchToChat() {
    loginScreen.classList.remove('active');
    chatScreen.classList.add('active');
    document.getElementById('current-user-display').textContent = currentUser.username;
    loadMessages();
    setupRealtime();
}

// --- ۲. مدیریت پیام‌ها ---
async function loadMessages() {
    msgContainer.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> در حال رمزگشایی پیام‌ها...</div>';
    
    const { data, error } = await supabase
        .from('messages')
        .select('*, users(username)')
        .order('created_at', { ascending: true });

    msgContainer.innerHTML = ''; // پاک کردن لودینگ
    
    if (error) {
        msgContainer.innerHTML = '<p style="text-align:center; color:red">خطا در دریافت پیام‌ها</p>';
        return;
    }

    data.forEach(msg => renderMessage(msg));
    scrollToBottom();
}

function renderMessage(msg) {
    // تعیین اینکه پیام مال خودمان است یا دیگران
    const isMe = msg.user_id === currentUser.id;
    const div = document.createElement('div');
    
    // کلاس me برای راست‌چین (آبی)، other برای چپ‌چین (تیره)
    div.className = `message ${isMe ? 'me' : 'other'}`;
    div.id = `msg-${msg.id}`;

    // زمان پیام
    const time = new Date(msg.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const senderName = isMe ? 'خودم' : (msg.users?.username || 'ناشناس');

    // ساخت محتوای پیام
    let htmlContent = `
        <div class="msg-header">
            <span class="msg-sender">${senderName}</span>
            <span class="msg-time">${time}</span>
        </div>
        <div class="msg-body">${escapeHtml(msg.content)}</div>
    `;

    // اگر پیام برای خودم بود، دکمه حذف اضافه کن
    if (isMe) {
        htmlContent += `<button onclick="deleteMessage(${msg.id})" class="delete-btn" title="حذف پیام"><i class="fa-solid fa-trash"></i></button>`;
    }

    div.innerHTML = htmlContent;
    msgContainer.appendChild(div);
}

// --- ۳. ارسال پیام ---
msgForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = msgInput.value.trim();
    if (!text) return;

    // پاک کردن موقت اینپوت برای حس سرعت
    msgInput.value = '';

    const { error } = await supabase
        .from('messages')
        .insert([{ user_id: currentUser.id, content: text }]);

    if (error) alert('خطا در ارسال: ' + error.message);
});

// --- ۴. حذف پیام ---
window.deleteMessage = async (id) => {
    if (!confirm('آیا این پیام حذف شود؟')) return;

    // حذف بصری سریع
    const el = document.getElementById(`msg-${id}`);
    if(el) el.style.opacity = '0.5';

    const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id); // امنیت: فقط پیام خود کاربر

    if (error) {
        alert('خطا در حذف');
        if(el) el.style.opacity = '1';
    }
};

// --- ۵. ریل‌تایم (آپدیت آنی) ---
function setupRealtime() {
    supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
            // دریافت نام کاربری فرستنده جدید
            const { data } = await supabase.from('users').select('username').eq('id', payload.new.user_id).single();
            const msg = { ...payload.new, users: data };
            renderMessage(msg);
            scrollToBottom();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
            const el = document.getElementById(`msg-${payload.old.id}`);
            if (el) el.remove();
        })
        .subscribe();
}

// ابزارها
function scrollToBottom() {
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

function escapeHtml(text) {
    if (!text) return text;
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

logoutBtn.addEventListener('click', () => {
    location.reload();
});
