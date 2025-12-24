// ==========================================
// تنظیمات اتصال (اطلاعات خود را اینجا بگذارید)
// ==========================================
const SUPABASE_URL = 'https://kpzzfsyzqkvuypseccri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_SO025VlsajUKd5lhl7CBwg_9nvrHvm-';
// ==========================================

// چک کردن وجود کتابخانه Supabase
if (typeof supabase === 'undefined') {
    alert("کتابخانه Supabase لود نشد! لطفا اینترنت خود را چک کنید یا از VPN استفاده کنید.");
}

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// عناصر
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const userIn = document.getElementById('username');
const passIn = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const errorMsg = document.getElementById('login-error');
const msgList = document.getElementById('message-list');
const msgInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const currentUserSpan = document.getElementById('current-user');

let myUsername = null;

// --- تابع لاگین ---
async function handleLogin() {
    const username = userIn.value.trim().toLowerCase(); // تبدیل به حروف کوچک
    const password = passIn.value.trim();

    if (!username || !password) {
        errorMsg.textContent = "لطفا همه فیلدها را پر کنید.";
        return;
    }

    loginBtn.textContent = "در حال بررسی...";
    loginBtn.disabled = true;
    errorMsg.textContent = "";

    try {
        // دریافت کاربر از دیتابیس
        const { data, error } = await sb
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            // لاگین موفق
            myUsername = data.username;
            currentUserSpan.textContent = myUsername;
            loginScreen.classList.add('hidden');
            chatScreen.classList.remove('hidden');
            startChat();
        } else {
            errorMsg.textContent = "نام کاربری یا رمز عبور اشتباه است.";
            loginBtn.textContent = "ورود ➜";
            loginBtn.disabled = false;
        }

    } catch (err) {
        console.error(err);
        errorMsg.textContent = "خطا در اتصال: " + err.message;
        loginBtn.textContent = "ورود ➜";
        loginBtn.disabled = false;
    }
}

loginBtn.addEventListener('click', handleLogin);


// --- شروع چت ---
function startChat() {
    loadMessages();
    
    // دریافت پیام زنده
    sb.channel('public:messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
          console.log('تغییر جدید:', payload);
          if (payload.eventType === 'INSERT') {
              displayMessage(payload.new);
          } else if (payload.eventType === 'DELETE') {
              // اگر پیامی حذف شد، لیست را رفرش کن (ساده‌ترین راه)
              const el = document.getElementById(`msg-${payload.old.id}`);
              if (el) el.remove();
          }
      })
      .subscribe();
}

// --- لود کردن پیام‌های قبلی ---
async function loadMessages() {
    const { data, error } = await sb
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

    if (!error && data) {
        msgList.innerHTML = '';
        data.forEach(displayMessage);
    }
}

// --- نمایش یک پیام ---
function displayMessage(msg) {
    const li = document.createElement('li');
    li.id = `msg-${msg.id}`;
    
    const isMe = msg.sender === myUsername;
    li.className = isMe ? 'me' : 'other';

    let deleteBtn = '';
    if (isMe) {
        deleteBtn = `<button class="delete-btn" onclick="deleteMsg(${msg.id})">×</button>`;
    }

    // فرمت ساعت
    const time = new Date(msg.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit'});

    li.innerHTML = `
        <div class="msg-header">
            <span>${msg.sender}</span>
            <span>${time}</span>
        </div>
        ${deleteBtn}
        <div>${msg.content}</div>
    `;

    msgList.appendChild(li);
    msgList.scrollTop = msgList.scrollHeight;
}

// --- ارسال پیام ---
sendBtn.addEventListener('click', async () => {
    const text = msgInput.value.trim();
    if (!text) return;

    // خالی کردن فیلد سریع برای حس بهتر
    msgInput.value = '';

    const { error } = await sb
        .from('messages')
        .insert([{ sender: myUsername, content: text }]);

    if (error) {
        alert("خطا در ارسال پیام!");
        msgInput.value = text; // برگرداندن متن در صورت خطا
    }
});

// اینتر برای ارسال
msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});

// --- حذف پیام ---
window.deleteMsg = async function(id) {
    if(!confirm('حذف شود؟')) return;
    
    await sb.from('messages').delete().eq('id', id);
    // حذف از صفحه به صورت خودکار توسط ریل‌تایم انجام میشود
}

// --- خروج ---
document.getElementById('logout-btn').addEventListener('click', () => {
    location.reload();
});
