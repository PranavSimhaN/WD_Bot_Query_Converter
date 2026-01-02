/**
 * Formats the message content for display.
 * Handles both simple string messages and structured backend responses.
 */
export function formatMessageContent(content) {
  if (!content) return { text: '', details: null };

  // If content is already a string, return it
  if (typeof content === 'string') {
    return { text: content, details: null };
  }

  // If content is an object (backend response)
  if (typeof content === 'object') {
    // Extract the main answer
    const text = content.answer || content.message || JSON.stringify(content);
    
    // key details we might want to show
    const details = { ...content };
    delete details.answer; // Remove answer from details as it's shown as main text
    
    // If details is empty after removing answer, set to null
    const hasDetails = Object.keys(details).length > 0;
    
    return { 
      text, 
      details: hasDetails ? details : null 
    };
  }

  return { text: String(content), details: null };
}

/**
 * Simple formatter to detect code blocks or formatting in text
 * Returns an array of segments: { type: 'text'|'code', content: string }
 */
export function parseText(text) {
  if (!text) return [];
  
  // Simple regex for code blocks ```code```
  const codeBlockRegex = /```([\s\S]*?)```/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }
    
    // Add code block
    segments.push({
      type: 'code',
      content: match[1].trim()
    });
    
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }

  return segments;
}
