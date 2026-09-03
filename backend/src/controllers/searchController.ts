import { Request, Response } from 'express';
import { esClient, EMAILS_INDEX } from '../config/elasticsearch';
import { prisma } from '../config/prisma';

export async function searchEmails(req: Request, res: Response) {
  try {
    const query = (req.query.q as string || '').trim();
    const statusTab = (req.query.status as string || 'scheduled').toLowerCase();
    const userId = req.headers['x-user-id'] as string;

    if (!query) {
      return res.json({ success: true, results: [] });
    }

    try {
      // 1. Attempt search via Elasticsearch
      const statusFilter = statusTab === 'sent'
        ? ['SENT', 'FAILED']
        : ['SCHEDULED', 'DELAYED_RATE_LIMIT', 'SENDING'];

      const mustClause: any[] = [
        {
          terms: { status: statusFilter },
        },
        {
          multi_match: {
            query,
            fields: ['recipientEmail^3', 'subject^2', 'body'],
            fuzziness: 'AUTO',
          },
        },
      ];

      if (userId) {
        mustClause.push({ term: { userId } });
      }

      const esResponse = await esClient.search({
        index: EMAILS_INDEX,
        body: {
          query: {
            bool: {
              must: mustClause,
            },
          },
        },
      });

      const hits = esResponse.hits.hits.map((hit: any) => hit._source);
      return res.json({
        success: true,
        source: 'elasticsearch',
        total: esResponse.hits.total,
        results: hits,
      });
    } catch (esError: any) {
      console.warn('[Search] Elasticsearch search failed, falling back to Database search:', esError.message);

      // 2. Database search fallback using PostgreSQL ILIKE
      const statusFilter = statusTab === 'sent'
        ? ['SENT', 'FAILED']
        : ['SCHEDULED', 'DELAYED_RATE_LIMIT', 'SENDING'];

      const dbWhere: any = {
        status: { in: statusFilter },
        OR: [
          { recipientEmail: { contains: query } },
          { campaign: { subject: { contains: query } } },
          { campaign: { body: { contains: query } } },
        ],
      };
      if (userId) dbWhere.userId = userId;

      const dbResults = await prisma.scheduledEmail.findMany({
        where: dbWhere,
        include: { campaign: true },
        take: 50,
      });

      return res.json({
        success: true,
        source: 'database',
        total: dbResults.length,
        results: dbResults.map((r) => ({
          id: r.id,
          recipientEmail: r.recipientEmail,
          subject: r.campaign.subject,
          body: r.campaign.body,
          status: r.status,
          scheduledAt: r.scheduledAt,
          sentAt: r.sentAt,
          etherealPreviewUrl: r.etherealPreviewUrl,
        })),
      });
    }
  } catch (error: any) {
    console.error('[Search Controller Error]:', error);
    return res.status(500).json({ error: error.message || 'Search execution failed' });
  }
}
