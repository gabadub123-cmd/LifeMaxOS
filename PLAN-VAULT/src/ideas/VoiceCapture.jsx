import { useState, useRef, useCallback, useEffect } from 'react';

export default function VoiceCapture({ onTranscript }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognition.stop(); } catch (e) { /* ignore */ }
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const handleUse = useCallback(() => {
    if (transcript.trim()) {
      onTranscript(transcript.trim());
    }
  }, [transcript, onTranscript]);

  const handleClear = useCallback(() => {
    setTranscript('');
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  if (!supported) return null;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.04)',
      borderRadius: 8,
      padding: '14px 16px',
      marginBottom: 16,
    }}>
      {/* Mic button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: transcript ? 12 : 0 }}>
        <button
          onClick={toggleListening}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: isListening ? '#FF3D00' : 'rgba(255,255,255,0.06)',
            border: 'none',
            color: isListening ? '#000' : '#888',
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            animation: isListening ? 'pulse 1s infinite' : 'none',
            boxShadow: isListening ? '0 0 16px rgba(255,61,0,0.4)' : 'none',
          }}
        >
          ●
        </button>
        <div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.6rem',
            fontWeight: 600,
            letterSpacing: '2px',
            color: isListening ? '#FF3D00' : '#666',
            textTransform: 'uppercase',
          }}>
            {isListening ? 'LISTENING...' : 'VOICE CAPTURE'}
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.5rem',
            color: '#444',
            marginTop: 2,
          }}>
            {isListening ? 'Tap to stop' : 'Tap mic to start speaking'}
          </div>
        </div>
      </div>

      {/* Transcript */}
      {transcript && (
        <div>
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            style={{
              width: '100%',
              minHeight: 60,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 6,
              color: '#ccc',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '0.8rem',
              padding: '8px 10px',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.4,
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={handleUse}
              style={{
                background: '#FF3D00',
                border: 'none',
                color: '#000',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '7px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              ✨ Parse with AI
            </button>
            <button
              onClick={handleClear}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                color: '#888',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '7px 16px',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
