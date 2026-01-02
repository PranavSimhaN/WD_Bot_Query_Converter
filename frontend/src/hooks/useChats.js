import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'wd_project_chats';

export default function useChats() {
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load chats from localStorage on mount
  useEffect(() => {
    try {
      const storedChats = localStorage.getItem(STORAGE_KEY);
      if (storedChats) {
        const parsedChats = JSON.parse(storedChats);
        setChats(parsedChats);
        // Select the most recent chat if available
        if (parsedChats.length > 0) {
          setCurrentChatId(parsedChats[0].id);
        }
      } else {
        // Create initial chat if none exist
        createNewChat();
      }
    } catch (error) {
      console.error('Failed to load chats from localStorage:', error);
      // Fallback to empty state
      createNewChat();
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    }
  }, [chats, loading]);

  const createNewChat = useCallback(() => {
    const newChat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
    };
    
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  }, []);

  const deleteChat = useCallback((chatId) => {
    setChats(prev => {
      const newChats = prev.filter(chat => chat.id !== chatId);
      
      // If we deleted the current chat, switch to another one
      if (chatId === currentChatId) {
        if (newChats.length > 0) {
          setCurrentChatId(newChats[0].id);
        } else {
          // If no chats left, create a new one (handled in next render cycle or immediately)
          // But here we can't call createNewChat easily inside setState callback if it depends on state
          // So we handle it in the component or effect. 
          // Actually, let's just set null and let the UI handle it or create one.
          // Better: Create one immediately if empty.
          // For now, let's just update the list. The UI can show "No chats" or create one.
           setCurrentChatId(null);
        }
      }
      return newChats;
    });
    
    // Safety check if we ended up with no chats
    if (chats.length === 1 && chats[0].id === chatId) {
       // We are deleting the last chat. We should probably create a new one to avoid empty state issues.
       // However, to keep this pure, we'll let the consuming component decide or handle empty state.
       // But for a smooth UX, let's trigger a create if we are empty.
       // We'll handle this in the component logic or a separate effect if needed.
    }
  }, [currentChatId, chats]);

  const addMessage = useCallback((chatId, role, content) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        const newMessages = [
          ...chat.messages,
          {
            role,
            content,
            timestamp: Date.now()
          }
        ];
        
        // Update title if it's the first user message and title is still default
        let title = chat.title;
        if (role === 'user' && chat.messages.length === 0) {
          title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
        }
        
        return {
          ...chat,
          messages: newMessages,
          title,
          updatedAt: Date.now()
        };
      }
      return chat;
    }));
  }, []);

  const clearAllChats = useCallback(() => {
    setChats([]);
    setCurrentChatId(null);
    localStorage.removeItem(STORAGE_KEY);
    createNewChat();
  }, [createNewChat]);

  // Get the current chat object
  const currentChat = chats.find(c => c.id === currentChatId) || null;

  return {
    chats,
    currentChat,
    currentChatId,
    setCurrentChatId,
    createNewChat,
    deleteChat,
    addMessage,
    clearAllChats,
    loading
  };
}
