
import { Language } from '../../types';

export const speak = (text: string, lang: Language) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'vi' ? 'vi-VN' : 'en-US';
  utterance.rate = 0.85; 
  utterance.pitch = lang === 'vi' ? 0.9 : 1.0;
  utterance.volume = 0.8;
  
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => 
    v.lang.includes(lang === 'vi' ? 'vi' : 'en') && 
    (v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Enhanced') || v.name.includes('Siri'))
  );
  
  if (preferredVoice) utterance.voice = preferredVoice;
  utterance.onerror = (e) => console.warn("TTS Error:", e);

  window.speechSynthesis.speak(utterance);
};
