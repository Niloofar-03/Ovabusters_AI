import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Mic, 
  MicOff, 
  User, 
  History, 
  Settings, 
  LogOut, 
  AlertCircle, 
  CheckCircle2,
  Calendar,
  Stethoscope,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { float32ToInt16, arrayBufferToBase64, base64ToArrayBuffer } from './utils/audio';

// --- Types ---
interface UserProfile {
  id: number;
  email: string;
  age: number;
  doctor_name: string;
  doctor_email: string;
}

interface DailyLog {
  date: string;
  fatigue_score: number;
  risk_level: 'low' | 'medium' | 'high';
  ai_summary: string;
}

// --- Constants ---
const OVARIAN_CANCER_PROMPT = `
You are an AI medical assistant for "Ovabusters". Your goal is to screen for ovarian cancer symptoms through conversation.
Key symptoms to look for:
1. Persistent bloating (increased abdominal size).
2. Pelvic or abdominal pain.
3. Feeling full quickly or loss of appetite.
4. Urinary symptoms (urgency or frequency).
5. Unexplained fatigue.
6. Changes in bowel habits.

Special Instruction:
- Ask relevant questions to find out if the user has symptoms of ovarian cancer.
- Analyze the user's voice for fatigue, but don't only focus on it.
- Be empathetic but professional.
- Keep your responses concise and conversational.

CRITICAL: At the end of the conversation, you MUST provide a final assessment in the following format:
"ASSESSMENT: [Low-risk | Medium-risk | High-risk]
SUMMARY: [Brief summary of symptoms discussed]"
`;

// --- Components ---

const LoginForm = ({ onLogin, onSwitchToSignup }: { onLogin: (user: UserProfile) => void, onSwitchToSignup: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) onLogin(data.user);
      else setError(data.error);
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto p-8 bg-white rounded-3xl shadow-xl border border-slate-100">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-50 rounded-2xl mb-4">
          <Activity className="w-8 h-8 text-teal-600" />
        </div>
        <h2 className="text-3xl font-semibold text-slate-900">Ovabusters</h2>
        <p className="text-slate-500 mt-2">AI-Powered Ovarian Health Monitoring</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
          <input
            type="email"
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all outline-none"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input
            type="password"
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all outline-none"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-teal-200 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
        </button>
      </form>

      <div className="mt-8 text-center space-y-2">
        <button onClick={onSwitchToSignup} className="text-teal-600 hover:text-teal-700 text-sm font-medium">
          Create an account
        </button>
        <br />
        <button className="text-slate-400 hover:text-slate-500 text-sm">
          Forgot password?
        </button>
      </div>
    </div>
  );
};

const SignupForm = ({ onSignup, onBack }: { onSignup: (user: UserProfile) => void, onBack: () => void }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    age: '',
    medical_history: '',
    family_history: '',
    doctor_name: '',
    doctor_email: '',
    doctor_address: '',
    doctor_tel: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        onSignup({ id: data.userId, ...formData } as any);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl w-full mx-auto p-8 bg-white rounded-3xl shadow-xl border border-slate-100">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Create Account</h2>
          <p className="text-slate-500 text-sm">Step {step} of 3</p>
        </div>
      </div>

      <div className="space-y-6">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <input
              type="email"
              placeholder="Email Address"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
            <input
              type="number"
              placeholder="Age"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500"
              value={formData.age}
              onChange={(e) => setFormData({...formData, age: e.target.value})}
            />
            <button onClick={() => setStep(2)} className="w-full bg-teal-600 text-white py-3 rounded-xl font-medium">Next</button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <textarea
              placeholder="Medical History (Previous surgeries, conditions...)"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500 h-32"
              value={formData.medical_history}
              onChange={(e) => setFormData({...formData, medical_history: e.target.value})}
            />
            <textarea
              placeholder="Family History (Cancer history, genetic conditions...)"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500 h-32"
              value={formData.family_history}
              onChange={(e) => setFormData({...formData, family_history: e.target.value})}
            />
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 border border-slate-200 py-3 rounded-xl font-medium">Back</button>
              <button onClick={() => setStep(3)} className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-medium">Next</button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h3 className="font-medium text-slate-700">Family Doctor Information</h3>
            <input
              placeholder="Doctor's Name"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500"
              value={formData.doctor_name}
              onChange={(e) => setFormData({...formData, doctor_name: e.target.value})}
            />
            <input
              placeholder="Doctor's Email"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500"
              value={formData.doctor_email}
              onChange={(e) => setFormData({...formData, doctor_email: e.target.value})}
            />
            <input
              placeholder="Doctor's Address"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500"
              value={formData.doctor_address}
              onChange={(e) => setFormData({...formData, doctor_address: e.target.value})}
            />
            <input
              placeholder="Doctor's Telephone"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500"
              value={formData.doctor_tel}
              onChange={(e) => setFormData({...formData, doctor_tel: e.target.value})}
            />
            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="flex-1 border border-slate-200 py-3 rounded-xl font-medium">Back</button>
              <button 
                onClick={handleSubmit} 
                disabled={loading}
                className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-medium flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Sign Up'}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const VoiceInterface = ({ user, onComplete }: { user: UserProfile, onComplete: () => void }) => {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('Ready to start your daily check-in');
  const [aiResponse, setAiResponse] = useState('');
  const [sessionComplete, setSessionComplete] = useState(false);
  const [error, setError] = useState('');
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [summary, setSummary] = useState('');
  const [sendingToDoctor, setSendingToDoctor] = useState(false);
  const [sentToDoctor, setSentToDoctor] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsListening(false);
  };

  const playNextInQueue = async () => {
    if (audioQueueRef.current.length === 0 || isPlayingRef.current || !audioContextRef.current) return;

    isPlayingRef.current = true;
    const chunk = audioQueueRef.current.shift()!;
    const buffer = audioContextRef.current.createBuffer(1, chunk.length, 24000);
    buffer.getChannelData(0).set(chunk);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => {
      isPlayingRef.current = false;
      playNextInQueue();
    };
    source.start();
  };

  const startCheckIn = async () => {
    try {
      setError('');
      setIsListening(true);
      setStatus('Initializing AI...');
      setAiResponse('');
      setSummary('');

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: OVARIAN_CANCER_PROMPT,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setStatus('AI is listening...');
            const source = audioContextRef.current!.createMediaStreamSource(streamRef.current!);
            processorRef.current = audioContextRef.current!.createScriptProcessor(2048, 1, 1);
            
            processorRef.current.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmData = float32ToInt16(inputData);
              const base64Data = arrayBufferToBase64(pcmData.buffer);
              
              sessionRef.current?.sendRealtimeInput({
                media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
              });
            };

            source.connect(processorRef.current);
            processorRef.current.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const audioData = base64ToArrayBuffer(base64Audio);
              const float32Data = new Float32Array(audioData.byteLength / 2);
              const int16Data = new Int16Array(audioData);
              for (let i = 0; i < int16Data.length; i++) {
                float32Data[i] = int16Data[i] / 0x7fff;
              }
              audioQueueRef.current.push(float32Data);
              playNextInQueue();
            }

            if (message.serverContent?.modelTurn?.parts[0]?.text) {
              const text = message.serverContent?.modelTurn?.parts[0]?.text;
              setAiResponse(prev => prev + ' ' + text);

              // Parse assessment if present
              if (text.includes('ASSESSMENT:')) {
                const riskMatch = text.match(/ASSESSMENT:\s*(Low-risk|Medium-risk|High-risk)/i);
                if (riskMatch) {
                  const level = riskMatch[1].toLowerCase() as any;
                  setRiskLevel(level.replace('-risk', ''));
                }
              }
              if (text.includes('SUMMARY:')) {
                const summaryPart = text.split('SUMMARY:')[1];
                setSummary(summaryPart.trim());
              }
            }

            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
            }
          },
          onerror: (err) => {
            console.error('Live API Error:', err);
            setError('AI connection error. Please try again.');
            stopSession();
          },
          onclose: () => {
            setStatus('Session ended.');
            setIsListening(false);
          }
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (err: any) {
      console.error('Failed to start session:', err);
      setError(err.message || 'Could not access microphone or connect to AI.');
      stopSession();
    }
  };

  const handleComplete = async () => {
    setSessionComplete(true);
    stopSession();
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        fatigue_score: riskLevel === 'high' ? 0.9 : riskLevel === 'medium' ? 0.6 : 0.2,
        symptoms: summary.split(',').map(s => s.trim()),
        ai_summary: summary || 'Routine check-in completed.',
        risk_level: riskLevel
      }),
    });
  };

  const sendToDoctor = async () => {
    setSendingToDoctor(true);
    // Simulate sending to doctor
    setTimeout(() => {
      setSendingToDoctor(false);
      setSentToDoctor(true);
    }, 1500);
  };

  return (
    <div className="max-w-2xl w-full mx-auto p-8 bg-white rounded-3xl shadow-xl border border-slate-100">
      <div className="text-center mb-12">
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">Ovarian Health Screening</h2>
        <p className="text-slate-500">Speak naturally. I will ask relevant questions to assess your risk level.</p>
      </div>

      <div className="flex flex-col items-center gap-8">
        <div className="relative">
          <motion.div
            animate={isListening ? { scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-colors ${isListening ? 'bg-teal-100' : 'bg-slate-100'}`}
          >
            <button
              onClick={isListening ? stopSession : startCheckIn}
              disabled={sessionComplete}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg ${isListening ? 'bg-red-500 text-white' : 'bg-teal-600 text-white hover:bg-teal-700 hover:scale-105'}`}
            >
              {isListening ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
            </button>
          </motion.div>
          {isListening && (
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="flex gap-1">
                <span className="w-1 h-1 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1 h-1 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                <span className="w-1 h-1 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
              </span>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className={`font-medium ${error ? 'text-red-500' : 'text-slate-700'}`}>{error || status}</p>
        </div>

        <div className="w-full space-y-4 max-h-64 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
          {aiResponse && (
            <div className="space-y-2">
              <p className="text-teal-900 font-bold text-xs uppercase tracking-wider">AI Assistant</p>
              <p className="text-slate-700 leading-relaxed">{aiResponse}</p>
            </div>
          )}
          {!aiResponse && !isListening && (
            <p className="text-slate-400 text-center italic py-4">Click the microphone to start your screening session.</p>
          )}
        </div>

        {isListening && (
          <button 
            onClick={handleComplete}
            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
          >
            Finish & Save Session
          </button>
        )}

        {sessionComplete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6 w-full">
            <div className={`p-4 rounded-2xl border ${
              riskLevel === 'high' ? 'bg-red-50 border-red-100 text-red-700' :
              riskLevel === 'medium' ? 'bg-orange-50 border-orange-100 text-orange-700' :
              'bg-green-50 border-green-100 text-green-700'
            }`}>
              <p className="font-bold text-lg uppercase tracking-wide">Assessment: {riskLevel}-risk</p>
              <p className="text-sm mt-1">{summary}</p>
            </div>

            <div className="flex flex-col gap-3">
              {!sentToDoctor ? (
                <button 
                  onClick={sendToDoctor}
                  disabled={sendingToDoctor}
                  className="w-full py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                >
                  {sendingToDoctor ? <Loader2 className="w-5 h-5 animate-spin" /> : <Stethoscope className="w-5 h-5" />}
                  Send to my doctor ({user.doctor_name})
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 text-teal-600 font-medium py-3 bg-teal-50 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                  Sent to {user.doctor_name}
                </div>
              )}
              
              <button 
                onClick={onComplete}
                className="w-full px-8 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const Dashboard = ({ user, onStartCheckIn }: { user: UserProfile, onStartCheckIn: () => void }) => {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/logs/${user.id}`)
      .then(res => res.json())
      .then(data => {
        setLogs(data);
        setLoading(false);
      });
  }, [user.id]);

  const currentRisk = logs[0]?.risk_level || 'low';
  
  // Check if risk has been medium or high for 3 weeks (21 days)
  const persistentRisk = logs.length >= 21 && logs.slice(0, 21).every(log => log.risk_level === 'medium' || log.risk_level === 'high');

  return (
    <div className="max-w-6xl w-full mx-auto space-y-8">
      {/* Persistent Risk Alert */}
      {persistentRisk && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-600 text-white p-6 rounded-3xl shadow-xl flex items-center gap-6"
        >
          <div className="p-3 bg-white/20 rounded-2xl">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">Persistent Risk Detected</h3>
            <p className="opacity-90">You have been at medium or high risk for over 3 weeks. Your doctor, {user.doctor_name}, has been notified and will contact you shortly to schedule a CT or Ultrasound scan.</p>
          </div>
        </motion.div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome back, {user.email.split('@')[0]}</h1>
          <p className="text-slate-500">Day {logs.length + 1} of your 30-day screening period.</p>
        </div>
        <button 
          onClick={onStartCheckIn}
          className="bg-teal-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-teal-200 hover:bg-teal-700 transition-all flex items-center gap-2"
        >
          <Mic className="w-5 h-5" />
          Start Daily Check-in
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-700">Progress</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-slate-900">{logs.length}</span>
            <span className="text-slate-400 mb-1">/ 30 days</span>
          </div>
          <div className="mt-4 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full transition-all" style={{ width: `${(logs.length / 30) * 100}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="font-semibold text-slate-700">Current Risk Level</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold capitalize ${
              currentRisk === 'high' ? 'text-red-600' : 
              currentRisk === 'medium' ? 'text-orange-600' : 'text-green-600'
            }`}>
              {currentRisk} Risk
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-2">Based on your last voice analysis.</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-teal-50 rounded-lg">
              <Stethoscope className="w-5 h-5 text-teal-600" />
            </div>
            <h3 className="font-semibold text-slate-700">Family Doctor</h3>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-slate-900">{user.doctor_name}</p>
            <p className="text-slate-500 text-sm">{user.doctor_email}</p>
          </div>
          {logs.length >= 30 && (currentRisk === 'medium' || currentRisk === 'high') && (
            <div className="mt-4 p-2 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Alert sent to doctor
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-bottom border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5" />
            Recent Activity
          </h3>
          <button className="text-teal-600 text-sm font-medium hover:underline">View All</button>
        </div>
        <div className="divide-y divide-slate-50">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No logs yet. Start your first check-in!</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    log.risk_level === 'high' ? 'bg-red-50 text-red-600' : 
                    log.risk_level === 'medium' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                  }`}>
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{new Date(log.date).toLocaleDateString()}</p>
                    <p className="text-slate-500 text-sm truncate max-w-md">{log.ai_summary}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-slate-700">Fatigue Score</p>
                    <p className="text-slate-500 text-xs">{(log.fatigue_score * 100).toFixed(0)}%</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'login' | 'signup' | 'dashboard' | 'voice'>('login');

  const handleLogin = (userData: UserProfile) => {
    setUser(userData);
    setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {user && (
        <nav className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
              <div className="bg-teal-600 p-1.5 rounded-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">Ovabusters</span>
            </div>
            <div className="flex items-center gap-6">
              <button className="text-slate-500 hover:text-slate-900 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors font-medium"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </nav>
      )}

      <main className="p-6 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <AnimatePresence mode="wait">
          {view === 'login' && (
            <motion.div key="login" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <LoginForm onLogin={handleLogin} onSwitchToSignup={() => setView('signup')} />
            </motion.div>
          )}

          {view === 'signup' && (
            <motion.div key="signup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <SignupForm onSignup={handleLogin} onBack={() => setView('login')} />
            </motion.div>
          )}

          {view === 'dashboard' && user && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full">
              <Dashboard user={user} onStartCheckIn={() => setView('voice')} />
            </motion.div>
          )}

          {view === 'voice' && user && (
            <motion.div key="voice" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full">
              <VoiceInterface user={user} onComplete={() => setView('dashboard')} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {!user && (
        <footer className="p-8 text-center text-slate-400 text-sm">
          <p>© 2026 Ovabusters Team. Medical AI screening tool.</p>
          <p className="mt-1">This is a screening tool and not a definitive diagnosis. Always consult your doctor.</p>
        </footer>
      )}
    </div>
  );
}
