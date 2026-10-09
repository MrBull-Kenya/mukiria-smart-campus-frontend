import { ClassModel } from '../models/Class.js';

export const classController = {
  async getAllClasses(req, res) {
    try {
      const classes = await ClassModel.getAll();
      res.json(classes);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch classes.' });
    }
  },

  async requestNewClass(req, res) {
    try {
      const { class_code, course, module, rep_id } = req.body;
      await ClassModel.create({ class_code, course, module, rep_id });
      res.status(201).json({ message: 'Class registered successfully.' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create class record.' });
    }
  }
};