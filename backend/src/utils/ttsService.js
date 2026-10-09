export const ttsService = {
  // Returns configuration / text payload for client-side SpeechSynthesis or external TTS wrapper
  generateAnnouncementPayload(announcementText) {
    return {
      service: 'Web Speech API / TTS',
      voicePrompt: announcementText,
      language: 'en-KE', // Kenyan English / Swahili contextual support
      rate: 1.0,
      pitch: 1.0
    };
  }
};