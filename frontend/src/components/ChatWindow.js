import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import '../styles/ChatWindow.css';

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

const BrainIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
  </svg>
);

const SidebarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="9" y1="3" x2="9" y2="21"></line>
  </svg>
);

export default function ChatWindow({ 
  currentChat, 
  loading, 
  onOpenSidebar,
  isSidebarVisible,
  onToggleSidebar
}) {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom whenever messages change or loading state changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentChat?.messages, loading]);

  const showSidebarToggle = !isSidebarVisible && onToggleSidebar;

  if (!currentChat) {
    return (
      <div className="chat-window">
        <div className="chat-header">
          <button className="mobile-menu-btn" onClick={onOpenSidebar}>
            <MenuIcon />
          </button>
          
          {showSidebarToggle && (
            <button 
              className="desktop-menu-btn" 
              onClick={onToggleSidebar}
              title="Open Sidebar"
              style={{ padding: '0.5rem', marginRight: '0.5rem', borderRadius: '0.25rem', display: 'none' }} // Hidden by default, CSS will handle
            >
              <SidebarIcon />
            </button>
          )}
          
          <div className="chat-title-header">KG-LLM Adapter</div>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">
            <BrainIcon />
          </div>
          <h3>Welcome to Knowledge Graph Q&A</h3>
          <p>Select a chat from the sidebar or start a new conversation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <button className="mobile-menu-btn" onClick={onOpenSidebar}>
          <MenuIcon />
        </button>
        
        {showSidebarToggle && (
          <button 
            className="desktop-menu-btn" 
            onClick={onToggleSidebar}
            title="Open Sidebar"
            style={{ padding: '0.5rem', marginRight: '0.5rem', borderRadius: '0.25rem', cursor: 'pointer' }}
          >
            <SidebarIcon />
          </button>
        )}
        
        <div className="chat-title-header">
          {currentChat.title || 'New Conversation'}
        </div>
      </div>

      <div className="messages-container">
        {currentChat.messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <BrainIcon />
            </div>
            <h3>How can I help you today?</h3>
            <p>Ask questions about your storage system data.</p>
          </div>
        ) : (
          currentChat.messages.map((msg, index) => (
            <MessageBubble key={index} message={msg} />
          ))
        )}
        
        {loading && (
          <div className="typing-indicator">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
