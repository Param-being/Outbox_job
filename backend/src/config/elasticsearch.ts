import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

const esNode = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';

export const esClient = new Client({
  node: esNode,
  requestTimeout: 1000,
  maxRetries: 0,
});

export const EMAILS_INDEX = 'reachinbox_emails';

export async function initElasticsearch() {
  try {
    const ping = await esClient.ping();
    if (!ping) {
      console.warn('[Elasticsearch] Could not ping Elasticsearch cluster.');
      return;
    }

    const indexExists = await esClient.indices.exists({ index: EMAILS_INDEX });
    if (!indexExists) {
      await esClient.indices.create({
        index: EMAILS_INDEX,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            campaignId: { type: 'keyword' },
            userId: { type: 'keyword' },
            recipientEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            etherealPreviewUrl: { type: 'keyword' },
            createdAt: { type: 'date' },
          },
        },
      });
      console.log(`[Elasticsearch] Index '${EMAILS_INDEX}' created successfully.`);
    } else {
      console.log(`[Elasticsearch] Index '${EMAILS_INDEX}' already exists.`);
    }
  } catch (error: any) {
    console.error('[Elasticsearch Initialization Warning]:', error.message || error);
  }
}
