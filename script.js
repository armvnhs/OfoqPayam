const SUPABASE_URL = 'https://kpzzfsyzqkvuypseccri.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtwenpmc3l6cWt2dXlwc2VjY3JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0OTA3NjYsImV4cCI6MjA4MjA2Njc2Nn0.dkN5v2HRmhGNHzWchc-ZFiCGfxAMKw4X1bsFcwukc7I';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// المان‌ها
const loginPage = document.getElementById('loginPage');
const chatPage = document.getElementById('chatPage');
const loginForm = document.getElementById('loginForm');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const messagesList = document.getElementById('messagesList');
const themeColorInput = document.getElementById('themeColorInput');
const loginStatus = document.getElementById('loginStatus');

let currentUser = null;

// ۱. مدیریت رنگ تم (ذخیره در حافظه)
const savedColor = localStorage.getItem('themeColor');
if (savedColor) {
    document.documentElement.style.setProperty('--accent-color', savedColor);
    themeColorInput.value = savedColor;
}

themeColorInput.addEventListener('input', (e) => {
    const color = e.target.value;
    document.documentElement.style.setProperty('--accent-color', color);
    localStorage.setItem('themeColor', color);
});

// ۲. لاگین (رفع مشکل پریدن صفحه)
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // ⛔ جلوگیری از رفرش شدن صفحه

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    loginStatus.innerText = "⏳ در حال اتصال...";
    loginStatus.style.color = "yellow";

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (error || !data) {
            throw new Error("نام کاربری یا رمز عبور اشتباه است (یا اینترنت قطع است)");
        }

        currentUser = data;
        loginStatus.innerText = "✅ ورود موفق!";
        loginStatus.style.color = "lightgreen";
        
        // انتقال به صفحه چت
        setTimeout(() => {
            loginPage.classList.add('hidden');
            chatPage.classList.remove('hidden');
            document.getElementById('displayUsername').innerText = currentUser.username;
            loadMessages();
            setupRealtime();
        }, 1000);

    } catch (err) {
        console.error(err);
        loginStatus.innerText = "❌ خطا: " + err.message;
        loginStatus.style.color = "#ed4245";
    }
});

// ۳. ارسال پیام
async function sendMessage() {
    const text = msgInput.value.trim();
    if (!text) return;

    // پاک کردن ورودی سریع برای حس بهتر
    msgInput.value = '';

    const { error } = await supabase
        .from('messages')
        .insert([{ 
            content: text, 
            sender: currentUser.username,
            is_admin: currentUser.username === 'admin'
        }]);

    if (error) alert("خطا در ارسال: " + error.message);
}

sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// ۴. دریافت پیام‌ها
async function loadMessages() {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    messagesList.innerHTML = '';
    data.forEach(msg => appendMessage(msg));
    scrollToBottom();
}

// ۵. نمایش پیام در صفحه (استایل دیسکورد)
function appendMessage(msg) {
    const isMe = msg.sender === currentUser.username;
    const div = document.createElement('div');
    div.className = `message ${isMe ? 'my-message' : ''}`;
    div.id = `msg-${msg.id}`;

    // دکمه حذف فقط برای خود شخص
    let deleteBtnHtml = '';
    if (isMe) {
        deleteBtnHtml = `<button class="delete-btn" onclick="deleteMessage('${msg.id}')">حذف</button>`;
    }

    // تولید رنگ اواتار رندوم بر اساس نام
    const avatarColor = msg.sender === 'admin' ? '#ed4245' : 'var(--accent-color)';

    div.innerHTML = `
        <div class="msg-avatar" style="background-color: ${avatarColor}"></div>
        <div class="msg-content-wrapper">
            <div class="msg-header">
                <span class="msg-sender">${msg.sender}</span>
                <span class="msg-time">${new Date(msg.created_at).toLocaleTimeString('fa-IR')}</span>
                ${deleteBtnHtml}
            </div>
            <div class="msg-text">${msg.content}</div>
        </div>
    `;

    messagesList.appendChild(div);
    scrollToBottom();
}

// ۶. حذف پیام
window.deleteMessage = async (id) => {
    if(!confirm("مطمئنی میخوای پاکش کنی؟")) return;
    
    const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id);

    if (error) alert("خطا در حذف: " + error.message);
    else document.getElementById(`msg-${id}`).remove();
};

// ۷. ریل‌تایم (دریافت آنی)
function setupRealtime() {
    supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            appendMessage(payload.new);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, payload => {
            const el = document.getElementById(`msg-${payload.old.id}`);
            if (el) el.remove();
        })
        .subscribe();
}

function scrollToBottom() {
    messagesList.scrollTop = messagesList.scrollHeight;
}

// خروج
document.getElementById('logoutBtn').addEventListener('click', () => {
    location.reload();
});
