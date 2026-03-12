import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are an expert at analyzing Python code comments. Your task is to determine whether a given Python comment is a "data analysis plan instruction" — an actionable step that the user intends to implement as code.

Examples of instructions:
- "# Step 1: Load the dataset from CSV"
- "# Clean missing values using forward fill"
- "# Filter rows where age > 18"
- "# Plot the distribution of income"
- "# Train a linear regression model"

Examples of NON-instructions (regular comments):
- "# Author: John Doe"
- "# This is a helper function"
- "# Configuration"
- "# Version 2.0"
- "# TODO: refactor later" (meta-comment, not a data analysis step)

Respond with ONLY a JSON object (no markdown fencing, no extra text):
{"isInstruction": true/false, "confidence": 0.0-1.0}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  const { commentText } = req.body as { commentText?: string };
  if (!commentText || typeof commentText !== 'string') {
    return res.status(400).json({ error: 'commentText is required' });
  }

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 100,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Classify this Python comment:\n${commentText}`,
        },
      ],
    });

    const text =
      message.content[0].type === 'text' ? message.content[0].text : '';
    const parsed = JSON.parse(text) as {
      isInstruction: boolean;
      confidence: number;
    };

    return res.status(200).json({
      isInstruction: parsed.isInstruction,
      confidence: parsed.confidence,
    });
  } catch (err) {
    console.error('scan-line error:', err);
    return res.status(500).json({ error: 'Failed to classify comment' });
  }
}
