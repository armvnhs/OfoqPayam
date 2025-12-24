// ==========================================
// ⚠️ تنظیمات SUPABASE
// ==========================================
const SUPABASE_URL = 'https://kpzzfsyzqkvuypseccri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_SO025VlsajUKd5lhl7CBwg_9nvrHvm-';
// ==========================================

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

// المان‌ها
const loginContainer = document.getElementById("login-container");
const chatContainer = document.getElementById("chat-container");
const userInput = document.getElementById("username-input");
const passInput = document.getElementById("password-input");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");
const messagesArea = document.getElementById("messages-area");
const msgInput = document.getElementById("msg-input");

// -------------------------------------------------
// ۱. سیستم لاگین (چک کردن پسورد از دیتابیس)
// -------------------------------------------------
async function login() {
    const u = userInput.value.trim().toLowerCase();
    const p = passInput.value.trim();

    if (!u || !p) {
        showError("لطفاً نام کاربری و رمز عبور را وارد کنید");
        return;
    }

    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // لودینگ
    
    // چک کردن در جدول users
    const { data, error } = await _supabase
        .from('users')
        .select('*')
        .eq('username', u)
        .eq('password', p)
        .maybeSingle();

    if (error) {
        showError("خطا در ارتباط با سرور");
        console.error(error);
    } else if (data) {
        // موفقیت
        currentUser = data.username;
        document.getElementById("current-user-display").innerText = currentUser;
        
        loginContainer.style.display = "none";
        chatContainer.style.display = "flex";
        
        initChat(); // شروع چت
    } else {
        showError("نام کاربری یا رمز عبور اشتباه است");
    }
    
    loginBtn.innerHTML = 'ورود <i class="fas fa-arrow-left"></i>';
}

function showError(msg) {
    loginError.innerText = msg;
    setTimeout(() => loginError.innerText = "", 3000);
}

// -------------------------------------------------
// ۲. مدیریت چت (ارسال، دریافت، حذف)
// -------------------------------------------------

async function initChat() {
    // لود تاریخچه پیام‌ها
    const { data } = await _supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

    if (data) data.forEach(msg => renderMessage(msg));

    // فعال‌سازی Realtime (دریافت پیام و حذف)
    _supabase
        .channel('public:messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
            if (payload.eventType === 'INSERT') {
                renderMessage(payload.new);
            } else if (payload.eventType === 'DELETE') {
                removeMessageFromUI(payload.old.id);
            }
        })
        .subscribe();
}

async function sendMessage() {
    const text = msgInput.value.trim();
    if (!text) return;

    msgInput.value = "";
    
    await _supabase
        .from('messages')
        .insert({ username: currentUser, text: text });
}

async function deleteMessage(id) {
    if(confirm("آیا از حذف این پیام مطمئن هستید؟")) {
        const { error } = await _supabase
            .from('messages')
            .delete()
            .eq('id', id);
            
        if(error) alert("خطا در حذف پیام");
    }
}

// -------------------------------------------------
// ۳. توابع نمایشی (UI)
// -------------------------------------------------

function renderMessage(msg) {
    const isMe = msg.username === currentUser;
    const div = document.createElement("div");
    div.id = `msg-${msg.id}`; // شناسه برای حذف آسان
    div.className = `message-bubble ${isMe ? 'message-right' : 'message-left'}`;

    const date = new Date(msg.created_at);
    const timeStr = `${date.getHours()}:${date.getMinutes().toString().padStart(2,'0')}`;
    
    // دکمه حذف فقط برای پیام‌های خود شخص
    const deleteBtnHtml = isMe ? `<button class="delete-btn" onclick="deleteMessage(${msg.id})"><i class="fas fa-trash"></i></button>` : '';

    div.innerHTML = `
        <div class="msg-header">
            <span>${msg.username}</span>
            ${deleteBtnHtml}
        </div>
        <div>${escapeHtml(msg.text)}</div>
        <span class="msg-time">${timeStr}</span>
    `;

    messagesArea.appendChild(div);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function removeMessageFromUI(id) {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300); // انیمیشن حذف
    }
}

function escapeHtml(text) {
    if (!text) return text;
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// -------------------------------------------------
// رویدادها
// -------------------------------------------------
loginBtn.addEventListener("click", login);
document.getElementById("send-btn").addEventListener("click", sendMessage);
document.getElementById("logout-btn").addEventListener("click", () => location.reload());

msgInput.addEventListener("keypress", (e) => { if(e.key === "Enter") sendMessage(); });
passInput.addEventListener("keypress", (e) => { if(e.key === "Enter") login(); });
