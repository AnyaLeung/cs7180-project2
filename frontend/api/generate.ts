import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';

type Action = 'write-code' | 'detail-plan' | 'alternative-plan';

const VALID_ACTIONS: Action[] = ['write-code', 'detail-plan', 'alternative-plan'];

function buildPrompt(commentText: string, action: Action, fileContent: string): string {
  const base = `You are an expert Python data analyst. The user is writing a data analysis script. Below is the full file content for context, followed by a specific comment line that describes a step in their analysis plan.\n\nFull file:\n\`\`\`python\n${fileContent}\n\`\`\`\n\nTarget comment: ${commentText}\n\n`;

  switch (action) {
    case 'write-code':
      return (
        base +
        `Generate Python code that implements the step described in the target comment. Output ONLY the Python code (no markdown fencing, no explanations). The code should:
- Be production-quality and follow best practices
- Use appropriate libraries (pandas, numpy, matplotlib, scikit-learn, etc.)
- Include brief inline comments only where logic is non-obvious
- Be ready to insert directly below the target comment in the file`
      );

    case 'detail-plan':
      return (
        base +
        `Expand the target comment into a detailed sub-plan with more granular steps. Output ONLY Python comments (lines starting with #), one per sub-step. For example:
# 1. Check for null values in each column
# 2. Apply forward fill for time-series columns
# 3. Drop rows where key columns are still missing
# 4. Log the number of rows removed

Be specific to the actual task described. Output nothing but comment lines.`
      );

    case 'alternative-plan':
      return (
        base +
        `Suggest an alternative approach to accomplish what the target comment describes. Output ONLY Python comments (lines starting with #). The alternative should:
- Use a meaningfully different method, library, or strategy
- Explain briefly why this alternative might be preferable
- Be specific, not generic

Output nothing but comment lines.`
      );
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  const { commentText, action, fileContent } = req.body as {
    commentText?: string;
    action?: string;
    fileContent?: string;
  };

  if (!commentText || typeof commentText !== 'string') {
    return res.status(400).json({ error: 'commentText is required' });
  }
  if (!action || !VALID_ACTIONS.includes(action as Action)) {
    return res.status(400).json({ error: `action must be one of: ${VALID_ACTIONS.join(', ')}` });
  }
  if (!fileContent || typeof fileContent !== 'string') {
    return res.status(400).json({ error: 'fileContent is required' });
  }

  try {
    const client = new Anthropic({ apiKey });

    const prompt = buildPrompt(commentText, action as Action, fileContent);

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const generatedText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    const prefix = '\n';
    const suffix = generatedText.endsWith('\n') ? '' : '\n';

    return res.status(200).json({
      generatedText: prefix + generatedText + suffix,
    });
  } catch (err) {
    console.error('generate error:', err);
    return res.status(500).json({ error: 'Failed to generate content' });
  }
}
