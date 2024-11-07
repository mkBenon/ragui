import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, FileText, Plus, MessageCircle } from 'lucide-react';
import Split from 'react-split';

// Flowise API configuration
const FLOWISE_API = 'https://kenteai-dev.mtn.com/api/v1/prediction/7bbf52ff-8072-424b-8f79-83dc3e76906b';

const SelectionPopup = ({ position, selectedText, onAskQuestion, onClose }) => {
  const [isInputMode, setIsInputMode] = useState(false);
  const [questionInput, setQuestionInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isInputMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInputMode]);

  if (!position) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (questionInput.trim()) {
      onAskQuestion(`${questionInput.trim()} (Regarding: "${selectedText}")`);
      onClose();
    }
  };

  return (
    <div 
      className="fixed bg-white shadow-lg rounded-lg p-2 border z-50 selection-popup"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)',
        marginTop: '-10px',
        minWidth: isInputMode ? '300px' : 'auto'
      }}
    >
      {!isInputMode ? (
        <button
          onClick={() => setIsInputMode(true)}
          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg text-sm w-full"
        >
          <MessageCircle className="w-4 h-4" />
          Ask about this
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="p-2">
          <div className="text-xs text-gray-500 mb-2">
            Selected text: "{selectedText}"
          </div>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="Type your question..."
              className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!questionInput.trim()}
              className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ask
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

const DocumentViewer = ({ document, highlightedText, onAskAboutSelection }) => {
  const [selectedText, setSelectedText] = useState('');
  const [popupPosition, setPopupPosition] = useState(null);

  const handleTextSelection = (event) => {
    if (typeof window !== 'undefined') {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      if (selectedText) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setSelectedText(selectedText);
        setPopupPosition({
          x: rect.left + (rect.width / 2),
          y: rect.top
        });
      } else {
        setPopupPosition(null);
      }
    }
  };

  const handleAskQuestion = (text) => {
    onAskAboutSelection(text);
  };

  const handleClickOutside = (event) => {
    if (!event.target.closest('.document-content') && !event.target.closest('.selection-popup')) {
      setPopupPosition(null);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('mousedown', handleClickOutside);
      return () => {
        window.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, []);

  return (
    <div className="relative">
      <div 
        className="document-content"
        onMouseUp={handleTextSelection}
      >
        <div className="space-y-4">
          {document.sourceDocuments.map((doc, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                highlightedText?.includes(doc.pageContent)
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'border-gray-200'
              }`}
            >
              <p className="text-gray-800">{doc.pageContent}</p>
              <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>
                  {doc.metadata.source}
                  {doc.metadata.loc && ` (Lines ${doc.metadata.loc.lines.from}-${doc.metadata.loc.lines.to})`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <SelectionPopup
        position={popupPosition}
        selectedText={selectedText}
        onAskQuestion={handleAskQuestion}
        onClose={() => setPopupPosition(null)}
      />
    </div>
  );
};

const RAGInterface = () => {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [sizes, setSizes] = useState([20, 40, 40]);
  const hasInitialized = useRef(false);

  const generateChatTitle = useCallback((message) => {
    const title = message.length > 30 ? `${message.substring(0, 30)}...` : message;
    return title;
  }, []);

  const createNewChat = useCallback(() => {
    const newChat = {
      id: Date.now().toString(),
      title: "New conversation",
      messages: []
    };
    setChats(prevChats => [...prevChats, newChat]);
    setActiveChat(newChat);
  }, []);

  // Initialize with a single chat only once
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      createNewChat();
    }
  }, [createNewChat]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages, scrollToBottom]);

  const askQuestion = async (question, chatId, messageId) => {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      
      const body = {
        question
      };

      console.log('Sending request to Flowise:', { 
        url: FLOWISE_API,
        body: JSON.stringify(body)
      });

      const response = await fetch(FLOWISE_API, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        return {
          text: "Hello! I'm currently having trouble connecting. Could you check the network tab for specific errors?",
          sourceDocuments: []
        };
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error asking question:', error);
      return {
        text: `Connection error: ${error.message}. Could you check if the API endpoint is accessible from your browser?`,
        sourceDocuments: []
      };
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !activeChat || isLoading) return;

    const newMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    let updatedChat = {
      ...activeChat,
      messages: [...activeChat.messages, newMessage]
    };
    
    if (activeChat.messages.length === 0) {
      updatedChat.title = generateChatTitle(inputMessage);
    }

    const updatedChats = chats.map(chat => 
      chat.id === activeChat.id ? updatedChat : chat
    );

    setChats(updatedChats);
    setActiveChat(updatedChat);
    setInputMessage("");
    setIsLoading(true);

    try {
      const lastAssistantMessage = activeChat.messages
        .filter(m => !m.isUser)
        .pop();

      let response;
      try {
        response = await askQuestion(
          inputMessage,
          activeChat.id,
          lastAssistantMessage?.id
        );
      } catch (error) {
        response = {
          text: "I'm sorry, I encountered an error. Could you please try again?",
          sourceDocuments: []
        };
      }

      const responseText = response?.text || "I received your message: " + inputMessage;

      const assistantMessage = {
        id: Date.now().toString(),
        content: responseText,
        isUser: false,
        timestamp: new Date(),
        sourceDocuments: response?.sourceDocuments || []
      };

      updatedChat = {
        ...updatedChat,
        messages: [...updatedChat.messages, assistantMessage]
      };

      const finalChats = chats.map(chat => 
        chat.id === activeChat.id ? updatedChat : chat
      );

      setChats(finalChats);
      setActiveChat(updatedChat);
      setCurrentDocument(response);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskAboutSelection = (question) => {
    if (!activeChat) return;
    setInputMessage(question);
    handleSendMessage();
  };

  return (
    <Split
      sizes={sizes}
      minSize={[200, 400, 400]}
      gutterSize={10}
      className="flex h-screen bg-gray-50"
      onDragEnd={newSizes => setSizes(newSizes)}
    >
      {/* Left sidebar - Chat list */}
      <div className="split-panel bg-white border-r">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Chats</h2>
          <button 
            onClick={createNewChat}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            title="New Chat"
          >
            <Plus className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {chats.map(chat => (
            <div
              key={chat.id}
              onClick={() => setActiveChat(chat)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                activeChat?.id === chat.id 
                  ? 'bg-blue-50 border border-blue-200' 
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className={`w-5 h-5 ${
                  activeChat?.id === chat.id ? 'text-blue-500' : 'text-gray-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{chat.title}</div>
                  <div className="text-sm text-gray-500 truncate">
                    {chat.messages[chat.messages.length - 1]?.content || 'New conversation'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="split-panel flex flex-col">
        {/* Chat header */}
        <div className="px-6 py-4 border-b bg-white shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">{activeChat?.title}</h2>
        </div>

        {/* Chat messages area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeChat?.messages.map((message) => (
            <div key={message.id} className={`flex ${
              message.isUser ? 'justify-end' : 'justify-start'
            }`}>
              <div className={`message-container ${
                message.isUser ? 'ml-auto' : 'mr-auto'
              }`}>
                <div className={`p-4 rounded-2xl ${
                  message.isUser 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white border border-gray-200 shadow-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="message-container">
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input area */}
        <div className="p-4 border-t bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ask a question..."
                disabled={isLoading}
              />
              <button 
                onClick={handleSendMessage}
                className={`px-6 py-3 bg-blue-500 text-white rounded-xl transition-colors flex items-center gap-2 ${
                  isLoading 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-blue-600'
                }`}
                disabled={isLoading}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right sidebar - Document viewer */}
      <div className="split-panel bg-white border-l">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Referenced Document</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {currentDocument ? (
            <DocumentViewer
              document={currentDocument}
              onAskAboutSelection={handleAskAboutSelection}
            />
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 font-medium">No document referenced yet</p>
              <p className="text-sm text-gray-500 mt-1">References will appear here when relevant</p>
            </div>
          )}
        </div>
      </div>
    </Split>
  );
};

export default RAGInterface;