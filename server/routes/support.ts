import { Router } from 'express';
import { authenticateMerchant } from '../middleware/auth.js';
import { SupportService } from '../services/supportService.js';
import { Repository } from '../db/repository.js';

const router = Router();

// GET /api/support/tickets - List merchant tickets
router.get('/tickets', authenticateMerchant, async (req: any, res) => {
  try {
    const merchantId = req.user.merchantId;
    const tickets = await Repository.getTicketsByMerchant(merchantId);
    res.json({ success: true, data: tickets });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'TICKETS_FETCH_FAILED', message: error.message } });
  }
});

// POST /api/support/tickets - Create ticket
router.post('/tickets', authenticateMerchant, async (req: any, res) => {
  try {
    const merchantId = req.user.merchantId;
    const { subject, category, priority, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'subject and message are required' },
      });
    }

    const ticket = await SupportService.createTicket(merchantId, {
      subject,
      category,
      priority,
      initialMessage: message,
      senderId: req.user.id || 'usr_merchant',
      senderName: req.user.name || 'Merchant Owner',
      senderRole: req.user.role || 'MERCHANT_OWNER',
    });

    res.status(201).json({ success: true, data: ticket, message: 'Support ticket submitted successfully.' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'TICKET_CREATE_FAILED', message: error.message } });
  }
});

// GET /api/support/tickets/:id - Get single ticket
router.get('/tickets/:id', authenticateMerchant, async (req: any, res) => {
  try {
    const ticket = await Repository.getTicketById(req.params.id);
    if (!ticket || ticket.merchantId !== req.user.merchantId) {
      return res.status(404).json({ success: false, error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found' } });
    }
    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'TICKET_FETCH_FAILED', message: error.message } });
  }
});

// POST /api/support/tickets/:id/messages - Reply to ticket
router.post('/tickets/:id/messages', authenticateMerchant, async (req: any, res) => {
  try {
    const ticket = await Repository.getTicketById(req.params.id);
    if (!ticket || ticket.merchantId !== req.user.merchantId) {
      return res.status(404).json({ success: false, error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found' } });
    }

    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_MESSAGE', message: 'message is required' } });
    }

    const updated = await SupportService.replyTicket(req.params.id, {
      senderId: req.user.id || 'usr_merchant',
      senderName: req.user.name || 'Merchant Owner',
      senderRole: req.user.role || 'MERCHANT_OWNER',
      message,
    });

    res.json({ success: true, data: updated, message: 'Reply added successfully.' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'REPLY_FAILED', message: error.message } });
  }
});

export default router;
