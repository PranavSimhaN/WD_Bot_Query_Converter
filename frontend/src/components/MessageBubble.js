import React, { useState } from 'react';
import { formatMessageContent, parseText } from '../utils/formatResponse';
import '../styles/MessageBubble.css';

export default function MessageBubble({ message }) {
  const [showDetails, setShowDetails] = useState(false);
  const isUser = message.role === 'user';
  
  // Format the content
  const { text, details } = formatMessageContent(message.content);
  
  // Parse text for simple formatting (code blocks)
  const segments = parseText(text);

  return (
    <div className={`message-bubble-container ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && (
        <div className="message-avatar assistant">
          AI
        </div>
      )}
      
      <div className="message-content">
        <div className="message-text">
          {segments.map((segment, index) => {
            if (segment.type === 'code') {
              return (
                <div key={index} className="code-block">
                  <code>{segment.content}</code>
                </div>
              );
            }
            return (
              <span key={index} style={{whiteSpace: 'pre-wrap'}}>
                {segment.content}
              </span>
            );
          })}
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
