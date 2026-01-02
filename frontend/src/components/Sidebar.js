import React from 'react';
import '../styles/Sidebar.css';

// Simple SVG icons
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const MessageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);

const SidebarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="9" y1="3" x2="9" y2="21"></line>
  </svg>
);

export default function Sidebar({ 
  chats, 
  currentChatId, 
  onSelectChat, 
  onNewChat, 
  onDeleteChat,
  isOpen,
  onClose,
  isDarkMode,
  onToggleTheme,
  onToggleSidebar,
  isDesktopVisible = true // Default to true if not provided
}) {
  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`} 
        onClick={onClose}
      />
      
      <div className={`sidebar ${isOpen ? 'open' : ''} ${!isDesktopVisible ? 'desktop-closed' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', gap: '8px' }}>
          {onToggleSidebar && (
            <button 
              className="new-chat-btn" 
              onClick={onToggleSidebar}
              style={{ width: 'auto', padding: '0.5rem', flex: 0 }}
              title="Close Sidebar"
            >
              <SidebarIcon />
            </button>
          )}
          
          <button className="new-chat-btn" onClick={onNewChat} style={{ flex: 1 }}>
            <PlusIcon />
            <span>New Chat</span>
          </button>
          
          <button 
            className="new-chat-btn" 
            onClick={onToggleTheme}
            style={{ width: 'auto', padding: '0.5rem', flex: 0 }}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>

        <div className="chat-list">
          {chats.map(chat => (
            <div 
              key={chat.id} 
              className={`chat-item ${chat.id === currentChatId ? 'active' : ''}`}
              onClick={() => {
                onSelectChat(chat.id);
                if (window.innerWidth <= 768) onClose();
              }}
            >
              <div className="chat-icon">
                <MessageIcon />
              </div>
              <div className="chat-title">
                {chat.title || 'New Chat'}
              </div>
              <button 
                className="delete-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Delete this chat?')) {
                    onDeleteChat(chat.id);
                  }
                }}
                title="Delete chat"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <p>KG-LLM Adapter</p>
        </div>
      </div>
    </>
  );
}
