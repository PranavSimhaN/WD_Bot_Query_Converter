import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useChats from '../hooks/useChats';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import ChatInput from './ChatInput';
import '../styles/ChatApp.css';

export default function ChatApp() {
  const { 
    chats, 
    currentChat, 
    currentChatId, 
    setCurrentChatId, 
    createNewChat, 
    deleteChat, 
    addMessage,
    loading: chatsLoading 
  } = useChats();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage or system preference
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Desktop sidebar visibility
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  // Toggle sidebar on mobile
  const toggleMobileSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  
  // Toggle sidebar on desktop
  const toggleDesktopSidebar = () => setIsSidebarVisible(!isSidebarVisible);

  const handleSendMessage = async (text) => {
    if (!text.trim() || isProcessing) return;

    // Ensure we have a current chat
    let chatId = currentChatId;
    if (!chatId) {
      chatId = createNewChat();
    }

    // Add user message
    addMessage(chatId, 'user', text);
    setIsProcessing(true);

    try {
      // Call API
      const response = await axios.post('/api/kg/query', { userQuestion: text });
      
      // Add AI response
      addMessage(chatId, 'assistant', response.data);
    } catch (error) {
      console.error('Error querying API:', error);
      
      let errorMessage = 'Sorry, I encountered an error processing your request.';
      
      if (error.response?.data?.error) {
        const backendError = error.response.data.error;
        if (typeof backendError === 'object') {
          errorMessage = backendError.message || JSON.stringify(backendError);
        } else {
          errorMessage = String(backendError);
        }
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      addMessage(chatId, 'assistant', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (chatsLoading) {
    return <div className="app-loading">Loading chats...</div>;
  }

  return (
    <div className="chat-app">
      <Sidebar 
        chats={chats} 
        currentChatId={currentChatId} 
        onSelectChat={setCurrentChatId} 
        onNewChat={createNewChat} 
        onDeleteChat={deleteChat}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleDarkMode}
        onToggleSidebar={toggleDesktopSidebar}
        isDesktopVisible={isSidebarVisible}
      />
      
      <div className="main-content">
        <ChatWindow 
          currentChat={currentChat} 
          loading={isProcessing}
          onOpenSidebar={toggleMobileSidebar}
          isSidebarVisible={isSidebarVisible}
          onToggleSidebar={toggleDesktopSidebar}
        />
        
        <ChatInput 
          onSendMessage={handleSendMessage} 
          disabled={isProcessing} 
        />
      </div>
    </div>
  );
}
