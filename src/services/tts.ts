/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality } from "@google/genai";

const CACHE_NAME = 'impact-tts-cache';
const MODEL = "gemini-3.1-flash-tts-preview";

// Audio sample rate from Gemini TTS is 24000Hz
const SAMPLE_RATE = 24000;

class TTSService {
  private ai: GoogleGenAI | null = null;
  private audioContext: AudioContext | null = null;

  private getGeminiApiKey() {
    const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    const nodeEnv = typeof process !== 'undefined' ? process.env : undefined;
    return viteEnv?.VITE_GEMINI_API_KEY || viteEnv?.GEMINI_API_KEY || nodeEnv?.GEMINI_API_KEY;
  }

  private getAi() {
    const apiKey = this.getGeminiApiKey();
    if (!apiKey) {
      throw new Error('Gemini API key is not configured. Set VITE_GEMINI_API_KEY for browser TTS features.');
    }

    if (!this.ai) {
      this.ai = new GoogleGenAI({ apiKey });
    }

    return this.ai;
  }

  private async getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  private async getCache() {
    return await caches.open(CACHE_NAME);
  }

  async playText(text: string, lang: string = 'en') {
    try {
      const cacheKey = `tts-${lang}-${btoa(unescape(encodeURIComponent(text))).substring(0, 50)}`;
      const cache = await this.getCache();
      const cachedResponse = await cache.match(cacheKey);

      let audioData: ArrayBuffer;

      if (cachedResponse) {
        console.log('[TTS] Playing from cache');
        audioData = await cachedResponse.arrayBuffer();
      } else {
        console.log('[TTS] Generating new audio');
        const response = await this.getAi().models.generateContent({
          model: MODEL,
          contents: [{ parts: [{ text: `Read this in ${lang} clearly: ${text}` }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
          throw new Error('No audio data received from Gemini');
        }

        // Convert base64 to ArrayBuffer
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioData = bytes.buffer;

        // Save to cache
        await cache.put(cacheKey, new Response(audioData, {
          headers: { 'Content-Type': 'audio/pcm' }
        }));
      }

      await this.playAudioBuffer(audioData);
    } catch (error) {
      console.error('[TTS] Error:', error);
      throw error;
    }
  }

  private async playAudioBuffer(buffer: ArrayBuffer) {
    const ctx = await this.getAudioContext();
    
    // Gemini returns raw PCM data at 24kHz. We need to convert it to an AudioBuffer.
    // The data is 16-bit signed little-endian PCM.
    const pcmData = new Int16Array(buffer);
    const audioBuffer = ctx.createBuffer(1, pcmData.length, SAMPLE_RATE);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < pcmData.length; i++) {
      // Normalize to [-1, 1]
      channelData[i] = pcmData[i] / 32768;
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start();

    return new Promise((resolve) => {
      source.onended = resolve;
    });
  }
}

export const ttsService = new TTSService();
