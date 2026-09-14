import React, { useState, useEffect, useRef } from 'react';

const AgentCopilot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [logs, setLogs] = useState([]);
    const logsEndRef = useRef(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = (ref) => {
        ref.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom(logsEndRef);
    }, [logs]);

    useEffect(() => {
        scrollToBottom(messagesEndRef);
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsAnalyzing(true);
        setLogs(['[SYS] Initializing Copilot...']);

        try {
            // Call the backend API
            const response = await fetch('/api/v1/agent/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userMsg })
            });
            const data = await response.json();

            // Simulate the live analysis logs based on executed tools
            const executedTools = data.executed_tools || [];
            
            let delay = 500;
            for (const tool of executedTools) {
                setTimeout(() => {
                    setLogs(prev => [...prev, `[AGENT] Calling tool: ${tool.name}...`]);
                }, delay);
                delay += 800;
                
                setTimeout(() => {
                    setLogs(prev => [...prev, `[SYS] Tool ${tool.name} executed successfully. Analyzing results...`]);
                }, delay);
                delay += 800;
            }

            setTimeout(() => {
                setLogs(prev => [...prev, '[SYS] Generating final response...']);
            }, delay);
            delay += 500;

            setTimeout(() => {
                setIsAnalyzing(false);
                setMessages(prev => [...prev, { role: 'agent', content: data.text }]);
            }, delay);

        } catch (error) {
            setIsAnalyzing(false);
            setMessages(prev => [...prev, { role: 'agent', content: 'Error communicating with backend.' }]);
        }
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-full shadow-lg transition-colors font-mono z-50"
            >
                💬 Agent
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-96 h-[32rem] bg-gray-900 border border-emerald-500 shadow-2xl rounded-lg flex flex-col overflow-hidden text-emerald-400 font-mono z-50">
            {/* Header */}
            <div className="bg-gray-800 border-b border-emerald-500 p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="font-bold">LLM Copilot Terminal</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:text-emerald-200 transition-colors">
                    [X]
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.length === 0 && (
                    <div className="text-emerald-600 text-sm text-center mt-4">
                        System ready. How can I assist you today?
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-2 rounded ${msg.role === 'user' ? 'bg-gray-800 text-emerald-300' : 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50'}`}>
                            <div className="text-xs opacity-50 mb-1">{msg.role === 'user' ? 'USER' : 'AGENT'}</div>
                            <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Live Analysis Console */}
            {isAnalyzing && (
                <div className="h-32 bg-black border-t border-emerald-800 p-2 overflow-y-auto text-xs opacity-80 flex flex-col">
                    <div className="text-emerald-600 mb-1">--- LIVE ANALYSIS ---</div>
                    {logs.map((log, idx) => (
                        <div key={idx} className="mb-1">{log}</div>
                    ))}
                    <div className="animate-pulse text-emerald-500">_</div>
                    <div ref={logsEndRef} />
                </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-3 bg-gray-800 border-t border-emerald-500 flex gap-2">
                <span className="mt-2 text-emerald-500">{">"}</span>
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter command..."
                    className="flex-1 bg-transparent outline-none placeholder-emerald-700 text-emerald-400"
                    disabled={isAnalyzing}
                />
            </form>
        </div>
    );
};

export default AgentCopilot;
