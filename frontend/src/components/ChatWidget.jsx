import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../api/marketClient";
import { useAuthStore } from "../store/authStore";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi, I'm Nova — ask me about your balance, orders, or trading concepts." },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef(null);

  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setIsSending(true);

    try {
      const data = await sendChatMessage(trimmed, token);
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Sorry, something went wrong (${err.message}).` },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="chat-widget">
      {isOpen && (
        <div className="chat-widget__panel">
          <div className="chat-widget__header">
            <span>Nova · AI Trading Assistant</span>
            <button
              className="chat-widget__close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          <div className="chat-widget__messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`chat-widget__message chat-widget__message--${m.role}`}
              >
                {m.text}
              </div>
            ))}
            {isSending && (
              <div className="chat-widget__message chat-widget__message--assistant chat-widget__message--typing">
                Nova is thinking…
              </div>
            )}
          </div>

          <div className="chat-widget__input-row">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your balance, an order, or a concept…"
              rows={1}
            />
            <button onClick={handleSend} disabled={isSending || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      )}

      <button
        className="chat-widget__toggle"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? "×" : "💬"}
      </button>
    </div>
  );
}