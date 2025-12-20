import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { megabrainApi } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentsUsed?: string[];
  tokensUsed?: { input: number; output: number };
  timestamp: Date;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [workspaceId] = useState('default');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await megabrainApi.sendMessage(workspaceId, userMessage.content);
      const data = response.data.data;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        agentsUsed: data.agentsUsed,
        tokensUsed: data.tokensUsed,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-megabrain-accent" />
          Chat with MEGABRAIN
        </h1>
        <p className="text-gray-400 mt-1">Your AI CEO is ready to assist</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">
              Start a conversation with MEGABRAIN
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Ask about your startups, request research, get market analysis, or discuss strategy.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[
                "What's the status of our portfolio?",
                "Generate weekly orders",
                "Research AI market trends",
                "How can we improve TRDR?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}
          >
            {message.role === 'assistant' && (
              <div className="w-10 h-10 rounded-lg bg-megabrain-accent/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-6 h-6 text-megabrain-accent" />
              </div>
            )}

            <div
              className={`max-w-3xl ${
                message.role === 'user'
                  ? 'bg-megabrain-accent/10 border border-megabrain-accent/30'
                  : 'bg-gray-800/50 border border-gray-700/50'
              } rounded-xl p-4`}
            >
              <div className="text-white whitespace-pre-wrap">{message.content}</div>

              {message.agentsUsed && message.agentsUsed.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Agents used:</span>
                    {message.agentsUsed.map((agent) => (
                      <span
                        key={agent}
                        className="px-2 py-1 bg-gray-700/50 rounded text-gray-400"
                      >
                        {agent}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <div className="w-10 h-10 rounded-lg bg-megabrain-purple/10 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-megabrain-purple" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-megabrain-accent/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-6 h-6 text-megabrain-accent" />
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>MEGABRAIN is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-gray-800">
        <div className="flex gap-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask MEGABRAIN anything..."
            className="input-dark flex-1 resize-none"
            rows={2}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="btn-primary h-full px-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
