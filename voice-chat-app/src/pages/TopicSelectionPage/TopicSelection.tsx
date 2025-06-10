import React from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import cls from "./TopicSelection.module.css";
import { MyGeoGebraComponent } from "../../components/Graph/Graph";

declare global {
  interface Window {
    ggbOnInit?: (api: any) => void;
    GGBApplet?: any;
  }
}

type Sender = "ai" | "user" | "system";

interface Message {
  from: Sender;
  text: string;
  time: string;
}

interface ChatRequestBody {
  topic: string;
  userInput: string;
}

export default function ChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topicParam = useParams<{ topic?: string }>().topic ?? "unknown";

  // If no topic has been chosen yet, we render the "Choose Topic" screen.
  // Once a user clicks a card, we set `selectedTopic` and switch over to "chat" mode.
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Chat state (only used once a topic is selected)
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Refs for scrolling & auto-resize
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Refs for audio (Whisper + TTS)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isSpeakingRef = useRef(false);
  const hasStartedRef = useRef(false);
  const userMediaStreamRef = useRef<MediaStream | null>(null);

  //
  // 1) AUTO-RESIZE TEXTAREA
  //
  const autoResize = useCallback(() => {
    if (!messageInputRef.current) return;
    messageInputRef.current.style.height = "auto";
    const scrollH = messageInputRef.current.scrollHeight;
    messageInputRef.current.style.height = `${Math.min(100, Math.max(52, scrollH))}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [inputText, autoResize]);

  //
  // 2) SCROLL TO BOTTOM WHEN messages OR isTyping CHANGE
  //
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  //
  // 3) Helpers: addMessage & simulateTyping
  //
  const addMessage = useCallback((from: Sender, text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { from, text, time }]);
  }, []);

  const simulateTyping = useCallback(() => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
    }, 1500 + Math.random() * 1000);
  }, []);

  //
  // 4) sendToOllama (calls `speak` at the end)
  //
  async function sendToOllama(userInput: string) {
    try {
      const payload: ChatRequestBody = { topic: selectedTopic!, userInput };
      const res = await fetch("https://localhost:7106/api/ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        addMessage("system", `❌ Tutor service error: ${res.status} ${text}`);
        return;
      }

      const { response } = await res.json();
      addMessage("ai", response);
      speak(response);
    } catch (err) {
      console.error("Ollama error:", err);
      addMessage("system", "❌ Error contacting tutor service.");
    }
  }

  //
  // 5) sendToWhisper (hoisted so `startRecording` can call it)
  //
  async function sendToWhisper(audioBlob: Blob) {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    try {
      const res = await fetch("http://localhost:8000/api/asr", {
        method: "POST",
        body: formData,
      });
      const { text } = await res.json();

      if (text.trim()) {
        addMessage("user", text);
        simulateTyping();
        await sendToOllama(text);
      } else {
        startRecording();
      }
    } catch (err) {
      console.error("Whisper error:", err);
      addMessage("system", "❌ Error transcribing audio.");
    }
  }

  //
  // 6) startRecording (hoisted so it can call sendToWhisper)
  //
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      userMediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        await sendToWhisper(blob);
      };

      recorder.start();
      // Stop automatically after 5 seconds
      setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 5000);
    } catch (err) {
      console.error("Recording error:", err);
      addMessage("system", "❌ Microphone access denied or unavailable.");
    }
  }

  //
  // 7) speak(text) via Web Speech API, then queue startRecording()
  //
  function speak(text: string) {
    if (!text.trim()) return;
    isSpeakingRef.current = true;
    speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.onend = () => {
      isSpeakingRef.current = false;
      setTimeout(() => {
        startRecording();
      }, 500);
    };
    utter.onerror = () => {
      isSpeakingRef.current = false;
      addMessage("system", "❌ Speech synthesis error.");
    };

    speechSynthesis.speak(utter);
  }

  //
  // 8) HANDLE TEXT SUBMISSION
  //
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    addMessage("user", trimmed);
    setInputText("");
    simulateTyping();
    await sendToOllama(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit(e);
    }
  };

  //
  // 9) ON MOUNT: Send initial "Let's begin." once a topic is selected
  //
  useEffect(() => {
    if (!selectedTopic) return;
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    (async () => {
      simulateTyping();
      await sendToOllama("Let's begin.");
    })();

    return () => {
      mediaRecorderRef.current?.stop();
      userMediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [selectedTopic, sendToOllama, simulateTyping]);

  //
  // 10) RENDER
  //
  if (!selectedTopic) {
    // ——— "CHOOSE YOUR TOPIC" SCREEN ———
    return (
      <div className={cls.pageWrapper}>
        <div className={cls.floatingElements}>
          <div className={cls.floatingElement}>🌟</div>
          <div className={cls.floatingElement}>🚀</div>
          <div className={cls.floatingElement}>🔬</div>
          <div className={cls.floatingElement}>📚</div>
        </div>

        <nav className={cls.navbar}>
          <div className={cls.navbarContent}>
            <div className={cls.logo}>AI Tutor</div>
            <div className={cls.navLinks}>
              <a href="#" className={cls.navLink}>Home</a>
              <a href="#" className={cls.navLink}>About</a>
              <a href="#" className={cls.navLink}>Progress</a>
              <a href="#" className={cls.navLink}>Settings</a>
            </div>
          </div>
        </nav>

        <div className={cls.container}>
          <div className={cls.heroSection}>
            <h1 className={cls.mainTitle}>Choose Your Adventure</h1>
            <p className={cls.subtitle}>
              Select a topic and start your personalized learning journey with our AI tutor
            </p>
          </div>

          <div className={cls.topicsGrid}>
            <div
              className={cls.topicCard}
              onClick={() => setSelectedTopic("Solar System")}
            >
              <span className={cls.topicIcon}>🌌</span>
              <h3 className={cls.topicTitle}>Solar System</h3>
              <p className={cls.topicDescription}>
                Explore planets, moons, and the mysteries of our cosmic neighborhood
              </p>
              <span className={cls.topicPill}>Astronomy</span>
            </div>

            <div
              className={cls.topicCard}
              onClick={() => setSelectedTopic("Pythagorean Theorem")}
            >
              <span className={cls.topicIcon}>📐</span>
              <h3 className={cls.topicTitle}>Pythagorean Theorem</h3>
              <p className={cls.topicDescription}>
                Master the fundamental relationship in right triangles and geometry
              </p>
              <span className={cls.topicPill}>Mathematics</span>
            </div>

            <div
              className={cls.topicCard}
              onClick={() => setSelectedTopic("Climate Change")}
            >
              <span className={cls.topicIcon}>🌍</span>
              <h3 className={cls.topicTitle}>Climate Change</h3>
              <p className={cls.topicDescription}>
                Understand the science behind our changing planet and environment
              </p>
              <span className={cls.topicPill}>Environmental Science</span>
            </div>

            <div
              className={cls.topicCard}
              onClick={() => setSelectedTopic("Ancient Egypt")}
            >
              <span className={cls.topicIcon}>🏺</span>
              <h3 className={cls.topicTitle}>Ancient Egypt</h3>
              <p className={cls.topicDescription}>
                Journey through the fascinating civilization of pharaohs and pyramids
              </p>
              <span className={cls.topicPill}>History</span>
            </div>
          </div>

          <div className={cls.statsSection}>
            <div className={cls.statItem}>
              <div className={cls.statNumber}>1000+</div>
              <div className={cls.statLabel}>Students Learning</div>
            </div>
            <div className={cls.statItem}>
              <div className={cls.statNumber}>50+</div>
              <div className={cls.statLabel}>Topics Available</div>
            </div>
            <div className={cls.statItem}>
              <div className={cls.statNumber}>95%</div>
              <div className={cls.statLabel}>Success Rate</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ——— CHAT SCREEN (once a topic is selected) ———
  return (
    <div className={cls.appContainer}>
      <div className={cls.header}>
        <div className={cls.topicBadge}>{selectedTopic}</div>
        <h1>{selectedTopic}</h1>
      </div>

      <div className={cls.chatContainer} ref={chatContainerRef}>
        {messages.map((msg, index) => {
          if (msg.from === "system") {
            return (
              <div key={index} className={cls.systemMessage}>
                {msg.text}
              </div>
            );
          }
          return (
            <div key={index} className={cls.message}>
              <div className={msg.from === "ai" ? cls.messageTutor : cls.messageUser}>
                <div
                  className={`${cls.avatar} ${
                    msg.from === "ai" ? cls.avatarTutor : cls.avatarUser
                  }`}
                >
                  {msg.from === "ai" ? "🤖" : "👤"}
                </div>
                <div
                  className={`${cls.messageBubble} ${
                    msg.from === "ai" ? cls.bubbleTutor : cls.bubbleUser
                  }`}
                >
                  <div
                    className={`${cls.messageHeader} ${
                      msg.from === "ai" ? cls.tutorHeader : cls.userHeader
                    }`}
                  >
                    <span>{msg.from === "ai" ? "Tutor" : "You"}</span>
                    <span
                      style={{
                        color: msg.from === "ai" ? "#9ca3af" : "rgba(255,255,255,0.7)",
                      }}
                    >
                      • {msg.time}
                    </span>
                  </div>
                  <p className={cls.messageText}>{msg.text}</p>
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className={cls.typingIndicator}>
            <div className={`${cls.avatar} ${cls.avatarTutor}`}>🤖</div>
            <div>
              <span>Tutor is typing</span>
              <div className={cls.typingDots}>
                <div className={cls.typingDot}></div>
                <div className={cls.typingDot}></div>
                <div className={cls.typingDot}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* INPUT AREA */}
      <div className={cls.inputContainer}>
        <form className={cls.inputForm} onSubmit={handleTextSubmit}>
          <div className={cls.inputWrapper}>
            <textarea
              ref={messageInputRef}
              className={cls.textInput}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={1}
            />
          </div>
          <button type="submit" className={cls.sendButtonTopic}>
            ➤
          </button>
        </form>
      </div>
      <MyGeoGebraComponent a={1} h={3} k={-4} customText="This is my custom parabola!" />
    </div>
  );
}

