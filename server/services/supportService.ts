import { Repository } from '../db/repository.js';
import { ISupportTicket, ISupportTicketMessage } from '../../src/types/index.js';

export class SupportService {
  /**
   * Create a new support ticket
   */
  static async createTicket(
    merchantId: string,
    data: {
      subject: string;
      category?: 'BILLING' | 'TECHNICAL' | 'DEVICE' | 'PAYMENT' | 'OTHER';
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      initialMessage: string;
      senderId: string;
      senderName: string;
      senderRole: string;
    }
  ): Promise<ISupportTicket> {
    const message: ISupportTicketMessage = {
      id: `msg_${Date.now()}`,
      senderId: data.senderId,
      senderName: data.senderName,
      senderRole: data.senderRole,
      message: data.initialMessage,
      timestamp: new Date().toISOString(),
    };

    return await Repository.createTicket({
      merchantId,
      subject: data.subject,
      category: data.category || 'TECHNICAL',
      priority: data.priority || 'MEDIUM',
      status: 'OPEN',
      messages: [message],
    });
  }

  /**
   * Add message to conversation thread
   */
  static async replyTicket(
    ticketId: string,
    data: {
      senderId: string;
      senderName: string;
      senderRole: string;
      message: string;
    }
  ): Promise<ISupportTicket | null> {
    const message: ISupportTicketMessage = {
      id: `msg_${Date.now()}`,
      senderId: data.senderId,
      senderName: data.senderName,
      senderRole: data.senderRole,
      message: data.message,
      timestamp: new Date().toISOString(),
    };

    return await Repository.addTicketMessage(ticketId, message);
  }
}
