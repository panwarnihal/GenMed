import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Loader2, Sparkles, Bot, User, Zap } from 'lucide-react';

const AgentCopilot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [logs, setLogs] = useState([]);
    const logsEndRef = useRef(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = (ref) => {
        ref.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom(logsEndRef);
    }, [logs]);

    useEffect(() => {
        scrollToBottom(messagesEndRef);
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsAnalyzing(true);
        setLogs(['Initializing Copilot...']);

        try {
            const response = await fetch('/api/v1/agent/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userMsg })
            });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || 'Error communicating with backend.');
            }

            const executedTools = data.executed_tools || [];
            
            let delay = 500;
            for (const tool of executedTools) {
                setTimeout(() => {
                    setLogs(prev => [...prev, `Calling tool: ${tool.name}...`]);
                }, delay);
                delay += 800;
                
                setTimeout(() => {
                    setLogs(prev => [...prev, `Tool ${tool.name} executed. Analyzing...`]);
                }, delay);
                delay += 800;
            }

            setTimeout(() => {
                setLogs(prev => [...prev, 'Generating response...']);
            }, delay);
            delay += 500;

            setTimeout(() => {
                setIsAnalyzing(false);
                setMessages(prev => [...prev, { role: 'agent', content: data.text || 'Done.' }]);
            }, delay);

        } catch (error) {
            setIsAnalyzing(false);
            setMessages(prev => [...prev, { role: 'agent', content: error.message || 'Error communicating with backend.' }]);
        }
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 group"
                aria-label="Open AI Copilot"
            >
                <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-500 shadow-xl shadow-purple-600/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 active:scale-95">
                    <Sparkles className="w-6 h-6 text-white" />
                    {/* Pulse ring */}
                    <span className="absolute inset-0 rounded-2xl bg-purple-500/30 animate-ping opacity-75" style={{ animationDuration: '2s' }} />
                </div>
            </button>
        );
    }

    return (
        <div 
            className="fixed bottom-6 right-6 w-[420px] h-[34rem] z-50 flex flex-col overflow-hidden rounded-2xl border border-border/60 shadow-2xl shadow-black/40"
            style={{
                background: 'color-mix(in srgb, var(--background) 85%, transparent)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                animation: 'slideUp 0.3s ease-out',
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60"
                 style={{ background: 'color-mix(in srgb, var(--background) 60%, transparent)' }}
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border border-purple-500/25">
                        <Bot className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground leading-none">AI Copilot</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">GenMed Assistant</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsOpen(false)} 
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    aria-label="Close Copilot"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 px-4 py-4 overflow-y-auto space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                            <Sparkles className="w-7 h-7 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground mb-1">How can I help?</p>
                            <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">
                                Ask about generic alternatives, nearby Jan Aushadhi kendras, or medicine information.
                            </p>
                        </div>
                        {/* Suggestion pills */}
                        <div className="flex flex-wrap justify-center gap-2 mt-2">
                            {['Find generic for Lipitor', 'Nearby Jan Aushadhi'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                                    className="text-[11px] px-3 py-1.5 rounded-full bg-purple-500/8 border border-purple-500/20 text-purple-400 hover:bg-purple-500/15 hover:border-purple-500/30 transition-colors"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                        <div className={`flex gap-2.5 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar */}
                            <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${
                                msg.role === 'user'
                                    ? 'bg-primary/15 border border-primary/25'
                                    : 'bg-purple-500/15 border border-purple-500/25'
                            }`}>
                                {msg.role === 'user' 
                                    ? <User className="w-3.5 h-3.5 text-primary" />
                                    : <Bot className="w-3.5 h-3.5 text-purple-400" />
                                }
                            </div>
                            {/* Bubble */}
                            <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                msg.role === 'user'
                                    ? 'bg-primary/10 border border-primary/20 text-foreground rounded-br-md'
                                    : 'bg-muted/40 border border-border/50 text-foreground rounded-bl-md'
                            }`}>
                                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Live Analysis Console */}
            {isAnalyzing && (
                <div className="mx-3 mb-3 rounded-xl bg-purple-500/[0.05] border border-purple-500/15 p-3 max-h-28 overflow-y-auto"
                     style={{ animation: 'fadeIn 0.2s ease-out' }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-purple-400/80">Analyzing</span>
                    </div>
                    {logs.map((log, idx) => (
                        <div key={idx} className="flex items-center gap-2 mb-1">
                            <Zap className="w-2.5 h-2.5 text-purple-500/50 flex-shrink-0" />
                            <span className="text-[11px] text-muted-foreground">{log}</span>
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-border/60 flex items-center gap-2"
                  style={{ background: 'color-mix(in srgb, var(--background) 60%, transparent)' }}
            >
                <input 
                    ref={inputRef}
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    disabled={isAnalyzing}
                />
                <button
                    type="submit"
                    disabled={isAnalyzing || !input.trim()}
                    className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:from-purple-500 hover:to-fuchsia-400 transition-all hover:scale-105 active:scale-95 shadow-md shadow-purple-600/20"
                >
                    {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
            </form>
        </div>
    );
};

export default AgentCopilot;

