import { Router } from 'express';
import { authenticateMerchant } from '../middleware/auth.js';
import { TeamService } from '../services/teamService.js';
import { Repository } from '../db/repository.js';
import { UserRole } from '../../src/types/index.js';

const router = Router();

// GET /api/team - List team members & pending invitations
router.get('/', authenticateMerchant, async (req: any, res) => {
  try {
    const merchantId = req.user.merchantId;
    const [members, invitations] = await Promise.all([
      Repository.getTeamMembers(merchantId),
      Repository.getInvitationsByMerchant(merchantId),
    ]);
    res.json({ success: true, data: { members, invitations } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'TEAM_FETCH_FAILED', message: error.message } });
  }
});

// POST /api/team/invite - Send staff invitation
router.post('/invite', authenticateMerchant, async (req: any, res) => {
  try {
    const merchantId = req.user.merchantId;
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_EMAIL', message: 'Email is required' } });
    }

    const invitation = await TeamService.inviteMember(
      merchantId,
      email,
      (role as UserRole) || 'MERCHANT_STAFF',
      req.user.name || 'Merchant Owner'
    );

    res.status(201).json({
      success: true,
      data: invitation,
      message: `Invitation generated for ${email}. Share the invitation link with your team member.`,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'INVITE_FAILED', message: error.message } });
  }
});

// POST /api/team/invitations/:id/revoke - Revoke invitation
router.post('/invitations/:id/revoke', authenticateMerchant, async (req: any, res) => {
  try {
    const merchantId = req.user.merchantId;
    await TeamService.revokeInvitation(req.params.id, merchantId);
    res.json({ success: true, message: 'Invitation revoked successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'REVOKE_FAILED', message: error.message } });
  }
});

export default router;
