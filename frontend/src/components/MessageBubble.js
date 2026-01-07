import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { formatMessageContent } from '../utils/formatResponse';
import '../styles/MessageBubble.css';

export default function MessageBubble({ message }) {
  const [showDetails, setShowDetails] = useState(false);
  const isUser = message.role === 'user';
  
  // Format the content
  const { text, details } = formatMessageContent(message.content);

  return (
    <div className={`message-bubble-container ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && (
        <div className="message-avatar assistant">
          AI
        </div>
      )}
      
      <div className="message-content">
        <div className="message-text markdown-content">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>

        {details && (
          <div className="message-details-toggle">
            <button 
              className="toggle-btn"
              onClick={() => setShowDetails(!showDetails)}
              type="button"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
            
            {showDetails && (
              <div className="message-details-json">
                <pre>{JSON.stringify(details, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
        
        <div className="message-time">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
