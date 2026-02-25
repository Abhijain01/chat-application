let currentUser = null;
let activePartner = null;
let activeChatType = "direct"; // "direct" or "group"
let ws = null;
let contacts = new Set(["Bot_Support"]); // Mock a default contact
let groups = []; // Store list of {id, name}

// DOM Elements
const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-screen");
const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username-input");
const currentUserDisplay = document.getElementById("current-user-display");
const myAvatar = document.getElementById("my-avatar");

const contactsContainer = document.getElementById("contacts-container");
const emptyState = document.getElementById("empty-state");
const activeContactInfo = document.getElementById("active-contact-info");
const partnerNameDisplay = document.getElementById("partner-name");
const partnerAvatar = document.getElementById("partner-avatar");
const inputArea = document.getElementById("input-area");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const messagesContainer = document.getElementById("messages-container");
const logoutBtn = document.getElementById("logout-btn");

// Group Modal Elements
const groupModal = document.getElementById("group-modal");
const showGroupModalBtn = document.getElementById("show-group-modal-btn");
const closeGroupModalBtn = document.getElementById("close-group-modal");
const createGroupForm = document.getElementById("create-group-form");
const groupNameInput = document.getElementById("group-name-input");
const groupMembersInput = document.getElementById("group-members-input");

// Initialization
function init() {
    loginForm.addEventListener("submit", handleLogin);
    messageForm.addEventListener("submit", sendMessage);
    logoutBtn.addEventListener("click", handleLogout);

    // Add logic for searching/adding a new contact
    const searchInput = document.getElementById("search-contact");
    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                const newContact = searchInput.value.trim();
                if (newContact && newContact !== currentUser) {
                    ensureContactExists(newContact);
                    selectContact(newContact, "direct");
                    searchInput.value = '';
                }
            }
        });
    }

    // Modal Events
    if (showGroupModalBtn) {
        showGroupModalBtn.addEventListener("click", () => groupModal.classList.remove("hidden"));
        closeGroupModalBtn.addEventListener("click", () => {
            groupModal.classList.add("hidden");
            createGroupForm.reset();
        });
        createGroupForm.addEventListener("submit", handleCreateGroup);
    }
}

// Helpers
function getInitials(name) {
    return name.substring(0, 2).toUpperCase();
}

function formatTime(dateString) {
    const d = new Date(dateString);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();
    const username = usernameInput.value.trim();
    if (!username) return;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: 'password' })
        });

        const data = await response.json();
        currentUser = data.user_id;

        // Setup UI
        currentUserDisplay.textContent = currentUser;
        myAvatar.textContent = getInitials(currentUser);

        // Fetch Previous Contacts
        try {
            const contactsRes = await fetch(`/contacts/${currentUser}`);
            if (contactsRes.ok) {
                const historyContacts = await contactsRes.json();
                historyContacts.forEach(c => contacts.add(c));
            }
        } catch (e) {
            console.error("Failed to load contacts history:", e);
        }

        // Fetch Groups
        try {
            const groupsRes = await fetch(`/groups/${currentUser}`);
            if (groupsRes.ok) {
                groups = await groupsRes.json();
            }
        } catch (e) {
            console.error("Failed to load user groups:", e);
        }

        // Switch Screens
        loginScreen.classList.add("hidden");
        setTimeout(() => {
            chatScreen.classList.remove("hidden");
            renderContacts();
            connectWebSocket();
        }, 500);

    } catch (error) {
        console.error("Login failed:", error);
        alert("Failed to login to the server");
    }
}

function handleLogout() {
    if (ws) ws.close();
    currentUser = null;
    activePartner = null;
    groups = [];
    messagesContainer.innerHTML = '';
    messagesContainer.appendChild(emptyState);
    emptyState.style.display = 'block';

    activeContactInfo.classList.add('hidden');
    inputArea.classList.add('hidden');

    chatScreen.classList.add("hidden");
    setTimeout(() => {
        loginScreen.classList.remove("hidden");
        usernameInput.value = '';
    }, 500);
}

// Group Creation
async function handleCreateGroup(e) {
    e.preventDefault();
    const name = groupNameInput.value.trim();
    let membersArray = groupMembersInput.value.split(",")
        .map(m => m.trim().toLowerCase())
        .filter(m => m !== "");

    // Always include the creator
    if (!membersArray.includes(currentUser)) {
        membersArray.push(currentUser);
    }

    if (!name || membersArray.length < 2) {
        alert("Enter a group name and at least one other member.");
        return;
    }

    try {
        const response = await fetch('/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, members: membersArray })
        });

        if (response.ok) {
            const newGroup = await response.json();
            groups.push(newGroup);
            groupModal.classList.add("hidden");
            createGroupForm.reset();
            renderContacts();
            selectContact(newGroup.id, "group", newGroup.name);

            // Auto-send a system message to wake up other offline/unaware clients
            if (ws) {
                const payload = {
                    receiver_id: newGroup.id,
                    content: `${currentUser} created the group "${name}". Say hi! 👋`,
                    chat_type: "group"
                };
                ws.send(JSON.stringify(payload));
                appendMessage(payload.content, true, null, true);
            }

        }
    } catch (e) {
        console.error("Failed to create group", e);
    }
}

// Global scope to track unread counts (mock)
const unreadCounts = {};

// Contacts Management
function renderContacts() {
    contactsContainer.innerHTML = '';

    // Render Groups First
    groups.forEach(group => {
        const hasUnread = unreadCounts[group.id] ? "font-weight: bold; color: #10b981;" : "";
        const div = document.createElement("div");
        div.className = `contact-item group-item ${group.id === activePartner ? 'active' : ''}`;
        div.innerHTML = `
            <div class="avatar"><i class="fa-solid fa-users"></i></div>
            <div class="user-info">
                <h3 style="${hasUnread}">${group.name}</h3>
                <span class="status-indicator">${unreadCounts[group.id] ? "New Message!" : "Group Chat"}</span>
            </div>
        `;
        div.addEventListener("click", () => selectContact(group.id, "group", group.name));
        contactsContainer.appendChild(div);
    });

    // Render Direct Contacts
    contacts.forEach(contact => {
        if (contact === currentUser) return; // Don't list self

        const div = document.createElement("div");
        div.className = `contact-item ${contact === activePartner ? 'active' : ''}`;
        div.innerHTML = `
            <div class="avatar">${getInitials(contact)}</div>
            <div class="user-info">
                <h3>${contact}</h3>
                <span class="status-indicator">Click to chat</span>
            </div>
        `;

        div.addEventListener("click", () => selectContact(contact, "direct"));
        contactsContainer.appendChild(div);
    });
}

function ensureContactExists(userId) {
    if (!contacts.has(userId) && userId !== currentUser) {
        contacts.add(userId);
        renderContacts();
    }
}

async function selectContact(partnerId, chatType, groupName = "") {
    activePartner = partnerId;
    activeChatType = chatType;

    if (chatType === "group" && unreadCounts[partnerId]) {
        unreadCounts[partnerId] = false;
    }

    renderContacts(); // update active class

    // Update Header
    activeContactInfo.classList.remove("hidden");
    inputArea.classList.remove("hidden");
    partnerNameDisplay.textContent = chatType === "group" ? groupName : partnerId;

    if (chatType === "group") {
        partnerAvatar.innerHTML = '<i class="fa-solid fa-users"></i>';
        partnerAvatar.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    } else {
        partnerAvatar.innerHTML = getInitials(partnerId);
        partnerAvatar.style.background = 'linear-gradient(135deg, #4f46e5, #8b5cf6)';
    }

    // Hide empty state
    emptyState.style.display = "none";

    // Fetch History
    try {
        const endpoint = chatType === "group"
            ? `/history/group/${partnerId}`
            : `/history/${currentUser}/${partnerId}`;

        const response = await fetch(endpoint);
        const history = await response.json();

        // Clear message container (except empty state which is hidden)
        Array.from(messagesContainer.children).forEach(child => {
            if (child.id !== 'empty-state') child.remove();
        });

        history.forEach(msg => {
            // Include sender name in group chats if it's not us
            const prefix = (chatType === "group" && msg.sender_id !== currentUser) ? `<strong>${msg.sender_id}:</strong> ` : "";
            appendMessage(prefix + msg.content, msg.sender_id === currentUser, msg.timestamp);
        });

        scrollToBottom();
    } catch (error) {
        console.error("Failed to load history:", error);
    }
}

// Messages Rendering
function appendMessage(text, isMe, timestampStr, animate = false) {
    const div = document.createElement("div");
    div.className = `message ${isMe ? 'msg-me' : 'msg-other'}`;
    if (!animate) div.style.animation = 'none'; // skip animation for bulk history load

    const timeText = timestampStr ? formatTime(timestampStr) : formatTime(new Date());
    const tickIcon = isMe ? `<i class="fa-solid fa-check-double" style="margin-left: 5px;"></i>` : '';

    div.innerHTML = `
        <div class="msg-bubble">${text}</div>
        <div class="msg-time">${timeText} ${tickIcon}</div>
    `;

    messagesContainer.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// WebSocket Logic
function connectWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    ws = new WebSocket(`${protocol}//${host}/ws/${currentUser}`);

    ws.onopen = () => console.log("WebSocket Connected");

    ws.onmessage = (event) => {
        let rawData = event.data;

        try {
            const data = JSON.parse(rawData);

            // Handle Ack
            if (data.status === "sent") {
                // We already optimistically appended the message, nothing to do unless we want to update read receipts
                return;
            }

            // Handle Incoming Chat Message (from router)
            // Router dumps raw JSON message model
            const senderId = data.sender_id;
            const receiverId = data.receiver_id;
            const content = data.content;
            const timestamp = data.timestamp;
            const cType = data.chat_type;

            if (cType === "group") {
                // If it's a group we are actively looking at
                if (activeChatType === "group" && receiverId === activePartner) {
                    const prefix = senderId !== currentUser ? `<strong>${senderId}:</strong> ` : "";
                    appendMessage(prefix + content, false, timestamp, true);
                } else {
                    console.log(`New group message in ${receiverId} from ${senderId}`);
                    unreadCounts[receiverId] = true;
                    // Fetch groups again just in case someone added us to a new group
                    fetch(`/groups/${currentUser}`).then(r => r.json()).then(newGroups => {
                        groups = newGroups;
                        renderContacts();
                    });
                }
            } else {
                ensureContactExists(senderId);

                if (senderId === activePartner && activeChatType === "direct") {
                    appendMessage(content, false, timestamp, true);
                } else {
                    // Show notification / badge
                    console.log(`New message from ${senderId}: ${content}`);
                }
            }

        } catch (e) {
            console.error("WS Parse error or received non-JSON text:", e);
        }
    };

    ws.onclose = () => {
        console.log("WebSocket Disconnected");
    };
}

function sendMessage(e) {
    e.preventDefault();
    if (!ws || !activePartner) return;

    const text = messageInput.value.trim();
    if (!text) return;

    const payload = {
        receiver_id: activePartner,
        content: text,
        chat_type: activeChatType
    };

    // Send over socket
    ws.send(JSON.stringify(payload));

    // Optimistic UI Append
    appendMessage(text, true, null, true);

    if (activeChatType === "direct") {
        ensureContactExists(activePartner);
    }

    messageInput.value = '';
    messageInput.focus();
}

// Boot
document.addEventListener("DOMContentLoaded", init);
