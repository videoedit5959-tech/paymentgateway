import { Repository } from '../db/repository.js';
import { ITeamInvitation, IUser, UserRole } from '../../src/types/index.js';
import { BillingService } from './billingService.js';

export class TeamService {
  /**
   * Invite team member
   */
  static async inviteMember(
    merchantId: string,
    email: string,
    role: UserRole,
    invitedBy: string
  ): Promise<ITeamInvitation> {
    // Check team limits on plan
    const check = await BillingService.checkSubscriptionLimits(merchantId, 'ADD_STAFF');
    if (!check.allowed) {
      throw new Error(check.message || 'Team members limit reached for current subscription plan');
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists in merchant
    const team = await Repository.getTeamMembers(merchantId);
    if (team.some((m) => m.email.toLowerCase() === cleanEmail)) {
      throw new Error('A user with this email address is already a member of your team.');
    }

    // Check existing pending invitation
    const pending = await Repository.getInvitationsByMerchant(merchantId);
    const existing = pending.find((i) => i.email === cleanEmail);
    if (existing) {
      return existing;
    }

    const token = `inv_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

    return await Repository.createTeamInvitation({
      merchantId,
      email: cleanEmail,
      role,
      token,
      invitedBy,
      expiresAt,
    });
  }

  /**
   * Revoke invitation
   */
  static async revokeInvitation(invitationId: string, merchantId: string): Promise<boolean> {
    const updated = await Repository.updateInvitation(invitationId, { status: 'REVOKED' });
    return !!updated;
  }
}
