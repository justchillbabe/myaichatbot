'use client'

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Moon, Sun, Trash, Plus } from 'lucide-react';

type Message = {
  sender: 'user' | 'bot' | 'file';
  content: string;
  typewriter?: boolean;
};

export default function ChatPage() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedText, setParsedText] = useState<string>('');
  const [fileHandled, setFileHandled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DUMMY API KEY: use environment variable in production!
  const GEMINI_API_KEY = 'AIzaSyAfFVWNo7qjflR0U-ZG-iSzjI7x7aHLFvU';

  useEffect(() => {
    const stored = localStorage.getItem('chat-history');
    if (stored) setMessages(JSON.parse(stored));
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark') setDarkMode(true);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.onload = () => {
      // @ts-ignore
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    };
    document.body.appendChild(script);
  }, []);
  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('chat-history', JSON.stringify(messages));
  }, [darkMode, messages]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (fileName && !fileHandled) {
      if (!messages.some((msg) => msg.sender === 'file' && msg.content === fileName)) {
        setMessages((prev) => [...prev, { sender: 'file', content: fileName }]);
      }
    }
  }, [fileName, fileHandled, messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    let msgs = [...messages];
    if (fileName && !fileHandled) {
      msgs = msgs.filter(msg => msg.sender !== 'file');
      setFileHandled(true);
      setFileName(null);
    }
    const userMessage: Message = { sender: 'user', content: input.trim() };
    msgs.push(userMessage);
    setMessages(msgs);
    setInput('');
    const typingIndicator: Message = {
      sender: 'bot',
      content: darkMode ? 'Vecna is typing...' : 'Eleven is typing...',
      typewriter: true,
    };
    setMessages(prev => [...prev, typingIndicator]);
    try {
      const fullPrompt =
        parsedText && !fileHandled
          ? `${userMessage.content}\n\n[Context from file]:\n${parsedText}`
          : userMessage.content;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }),
        }
      );
      const data = await res.json();
      let text = '🤖 Gemini could not respond.';
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        text = data.candidates[0].content.parts[0].text;
      }
      let typed = '';
      for (const char of text) {
        typed += char;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...typingIndicator, content: typed };
          return updated;
        });
        await new Promise(res => setTimeout(res, 25));
      }
    } catch (error) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { sender: 'bot', content: '❌ Error connecting to Gemini API.' }
      ]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileHandled(false);
    const reader = new FileReader();
    reader.onload = async () => {
      const typedArray = new Uint8Array(reader.result as ArrayBuffer);
      // @ts-ignore
      const pdf = await window.pdfjsLib.getDocument(typedArray).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `\nPage ${i}: ${pageText}`;
      }
      setParsedText(fullText);
    };
    reader.readAsArrayBuffer(file);
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('chat-history');
    setFileName(null);
    setParsedText('');
    setFileHandled(false);
  };

  const theme = darkMode
    ? {
        container:
          'bg-gradient-to-bl from-[#0a0b13] via-[#16141f] to-[#010103] text-[#e50914] font-display min-h-screen transition-colors duration-700 ease-in-out',
        header:
          'text-5xl font-stranger uppercase text-[#e50914] drop-shadow-[0_0_8px_#00fff7] tracking-[.15em] text-center mb-8',
        card:
          'bg-black/70 border border-[#e50914] shadow-[0_0_24px_#00fff7,0_0_6px_#e50914] rounded-2xl backdrop-blur-md',
        botBubble:
          'bg-gradient-to-r from-[#191a25] to-[#460e15] text-[#f4bfb8] mr-auto px-6 py-4 shadow-red-glow rounded-2xl max-w-xs break-words font-medium',
        userBubble:
          'bg-gradient-to-l from-[#e50914] to-[#550000] text-white ml-auto px-6 py-4 rounded-2xl shadow-[0_0_16px_#e50914] max-w-xs break-words font-semibold',
        fileBubble:
          'bg-gradient-to-r from-[#232943] to-[#32043a] text-[#e7d184] mx-auto px-5 py-2 rounded-lg shadow-[0_0_10px_#00fff7] font-bold border border-[#e50914] whitespace-nowrap',
        input:
          'bg-[#0b0c10]/90 text-[#e50914] border border-[#e50914] rounded-lg placeholder:text-[#e50914]/60 placeholder:font-display focus:ring-2 focus:ring-[#00fff7] focus:border-[#e50914] px-6 py-3 font-semibold font-display transition-colors duration-300',
        button:
          'bg-[#e50914] hover:bg-[#ad081b] text-[#f1f1f1] rounded-lg font-bold shadow-md px-6 py-3 transition-all duration-300 tracking-widest uppercase font-display',
        plusBtn: 'border border-[#e50914] bg-black/70 hover:bg-[#240c14]/60 rounded-lg focus:ring-2 focus:ring-[#e50914]/40',
        plusIcon: 'text-[#e50914] group-hover:text-[#fff] group-focus:text-[#fff]', // improved contrast always
        placeholder: 'Speak to the Upside Down...',
        scroll: 'bg-transparent',
        overlay: 'bg-black/95 text-[#e50914]',
        overlayButton: 'bg-[#e50914] hover:bg-[#ad081b] text-white shadow-lg px-10 py-3 rounded-xl text-lg font-display tracking-widest uppercase transition-all duration-300 mt-8',
      }
    : {
        container:
          'bg-gradient-to-br from-[#f5ece4] via-[#e7dad2] to-[#f3ede8] text-[#381414] font-olde font-normal min-h-screen transition-colors duration-700 ease-in-out',
        header:
          'text-5xl font-olde uppercase text-[#ad0d17] text-center mb-8 tracking-widest drop-shadow-[0_1px_0_#a48952] leading-none border-b-4 border-[#ad0d17] pb-3',
        card:
          'bg-[#f9f4ec]/90 border border-[#c7bcab] shadow-[0_3px_16px_#e5dac7,0_2px_2px_#d0c098] rounded-3xl backdrop-blur-md',
        botBubble:
          'bg-gradient-to-br from-[#e6e0cb] to-[#c4a77d] text-[#3b1c06] mr-auto px-7 py-4 shadow-md rounded-2xl max-w-xs break-words font-medium border border-[#c7bcab] italic',
        userBubble:
          'bg-gradient-to-r from-[#ad0d17] to-[#784c29] text-[#f3ede8] ml-auto px-7 py-4 rounded-2xl shadow-lg max-w-xs break-words font-semibold border border-[#ad0d17]',
        fileBubble:
          'bg-gradient-to-r from-[#f7e7a1] to-[#dac383] text-[#615c45] mx-auto px-5 py-2 rounded-xl shadow-sm font-bold border border-[#b9a065] whitespace-nowrap',
        input:
          'bg-[#f5ece4] text-[#381414] border border-[#c7bcab] rounded-lg placeholder:text-[#8e705b] placeholder:font-olde focus:ring-2 focus:ring-[#ad0d17]/60 focus:border-[#ad0d17] px-6 py-3 font-medium font-olde transition-colors duration-300',
        button:
          'bg-[#ad0d17] hover:bg-[#b12830] text-[#fffaf4] rounded-lg font-bold shadow-md px-6 py-3 transition-all duration-300 uppercase tracking-widest font-olde',
        plusBtn: 'border border-[#ad0d17] bg-[#f7ecda]/70 hover:bg-[#f3ede8]/90 rounded-lg focus:ring-2 focus:ring-[#ad0d17]/30',
        plusIcon: 'text-[#ad0d17] group-hover:text-[#fff] group-focus:text-[#fff]',
        placeholder: 'Write to the world beyond...',
        scroll: 'bg-transparent',
        overlay: 'bg-[#f6ebde]/95 text-[#ad0d17]',
        overlayButton: 'bg-[#ad0d17] hover:bg-[#b12830] text-white shadow-lg px-10 py-3 rounded-xl text-lg font-olde tracking-widest uppercase transition-all duration-300 mt-8',
      };

  return (
    <div className={cn('flex flex-col h-screen p-6 sm:p-14 overflow-hidden relative', theme.container)}>
      {/* WELCOME OVERLAY */}
      {showWelcome && (
        <div className={cn('fixed inset-0 z-50 flex flex-col justify-center items-center animate-fadeIn transition-all duration-700', theme.overlay)} style={{backdropFilter: 'blur(9px)'}}>
          <div className={cn(
            'rounded-2xl p-12 max-w-xl w-full shadow-2xl flex flex-col items-center border-4 transition-all duration-700',
            darkMode
              ? 'border-[#e50914] bg-black/80'
              : 'border-[#ad0d17] bg-[#f9f4ec]/90'
          )}>
            <h1 className={cn('mb-4 drop-shadow-lg text-center', theme.header)}>
              {darkMode ? 'The Upside Down' : 'Reality Console'}
            </h1>
            <div className="text-xl font-medium text-center opacity-90 max-w-md">
              Welcome to your <span className={darkMode ? 'text-[#e50914]' : 'text-[#ad0d17]'}>Stranger Things</span>-inspired chatbot.<br /><br />
              {darkMode ? (
                <>
                  <span className="text-[#e50914] font-stranger">Step into the Upside Down...</span><br/>
                  Start chatting about mysteries, monsters, or anything you like.
                </>
              ) : (
                <>
                  <span className="text-[#ad0d17] font-olde">A portal to the world beyond awaits...</span><br/>
                  Upload a PDF, ask a question, or just say hello.
                </>
              )}
            </div>
            <Button
              className={theme.overlayButton}
              onClick={() => setShowWelcome(false)}
              autoFocus
            >
              Start Chatting
            </Button>
          </div>
        </div>
      )}

      {/* Toggle and clear buttons */}
      <div className="absolute top-6 right-6 flex gap-3 z-10">
        <Button
          variant="outline"
          onClick={() => setDarkMode(!darkMode)}
          className={
            darkMode
              ? 'flex gap-2 items-center border border-[#e50914] bg-black/40 hover:bg-[#130928]/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00fff7]/80 transition-all duration-300 px-4 py-2 shadow-sm'
              : 'flex gap-2 items-center border border-[#ad0d17] bg-[#f7ecda]/60 hover:bg-[#f3ede8]/90 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ad0d17]/50 px-4 py-2 shadow-sm transition-all duration-300'
          }
          aria-label="Toggle light/dark mode"
        >
          {darkMode ? (
            <Sun className="h-5 w-5 text-[#ffe378]" />
          ) : (
            <Moon className="h-5 w-5 text-[#ad0d17]" />
          )}
          <span className="hidden sm:inline font-semibold font-olde">
            {darkMode ? 'Reality' : 'Upside Down'}
          </span>
        </Button>
        <Button
          variant="outline"
          onClick={clearChat}
          className={
            darkMode
              ? 'flex gap-2 items-center border border-[#e50914] bg-black/40 hover:bg-[#130928]/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e50914]/30 px-4 py-2 shadow-sm transition-all duration-300'
              : 'flex gap-2 items-center border border-[#ad0d17] bg-[#f7ecda]/60 hover:bg-[#f3ede8]/90 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ad0d17]/30 px-4 py-2 shadow-sm transition-all duration-300'
          }
          aria-label="Clear chat history"
        >
          <Trash className="h-5 w-5" />
          <span className="hidden sm:inline font-semibold font-olde">Clear Chat</span>
        </Button>
      </div>

      {/* Chat card */}
      <Card className={cn('flex flex-col flex-1 max-w-4xl mx-auto w-full overflow-hidden', theme.card)}>
        <CardContent className="flex flex-col flex-1 overflow-hidden p-0 rounded-xl">
          <ScrollArea
            className={cn('flex-1 px-8 py-6 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-full scrollbar-thumb-red-700/60 scrollbar-track-transparent', theme.scroll)}
            ref={scrollRef}
          >
            {messages.map((msg, index) => {
              const bubbleClass = msg.sender === 'file'
                ? theme.fileBubble
                : msg.sender === 'user'
                ? theme.userBubble
                : theme.botBubble;
              return (
                <div
                  key={index}
                  className={cn(
                    'max-w-xs px-5 py-3 text-base shadow-lg rounded-2xl whitespace-pre-wrap flex items-start gap-4',
                    bubbleClass
                  )}
                  style={{ wordBreak: 'break-word' }}
                >
                  <span>
                    {msg.sender === 'file'
                      ? `File Uploaded: ${msg.content}`
                      : msg.content}
                  </span>
                </div>
              );
            })}
          </ScrollArea>

          <div className={cn(
            'flex items-center gap-4 p-7 border-t',
            darkMode
              ? 'border-[#e50914]/30 bg-black/50'
              : 'border-[#c7bcab]/70 bg-[#f9f4ec]/50'
          )}>
            {/* Plus Button - now always visible and contrast in both modes */}
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className={cn('group', theme.plusBtn, 'flex gap-2 items-center px-4 py-3 shadow-sm focus:outline-none transition-colors duration-300')}
              aria-label="Upload PDF file"
            >
              <Plus className={cn('h-5 w-5 transition-colors duration-200', theme.plusIcon)} />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={theme.placeholder}
              className={cn('flex-1', theme.input)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              aria-label="Chat input"
              spellCheck={false}
              autoComplete="off"
            />
            <Button
              className={theme.button}
              onClick={handleSend}
              aria-label="Send message"
              type="button"
            >
              Send
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* FONT NOTES: see earlier for font setup in global/app CSS */}
      <style jsx global>{`
        .font-stranger {
          font-family: 'ITC Benguiat', 'Cinzel Decorative', 'UnifrakturCook', serif;
          letter-spacing: 0.15em;
        }
        .font-olde {
          font-family: 'EB Garamond', 'Georgia', serif;
        }
        .shadow-red-glow {
          box-shadow:
            0 0 18px #e50914AA,
            0 0 20px #00fff7AA;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.8s cubic-bezier(.2,.5,.5,1.0); }
      `}</style>
    </div>
  );
}
