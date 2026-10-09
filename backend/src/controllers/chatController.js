import { ChatMessageModel } from '../models/ChatMessage.js';

export const chatController = {
  async getMessages(req, res) {
    try {
      const { class_code } = req.params;
      const messages = await ChatMessageModel.getMessagesByClass(class_code);
      res.json(messages);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch chat messages.' });
    }
  },

  async postMessage(req, res) {
    try {
      const { class_code, sender_id, message } = req.body;
      const result = await ChatMessageModel.create({ class_code, sender_id, message });
      res.status(201).json({ message: 'Message sent', id: result.insertId });
    } catch (err) {
      res.status(500).json({ error: 'Failed to send message.' });
    }
  }
};