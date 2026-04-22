module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const key = process.env.ANTHROPIC_KEY;
    if (!key) return res.status(500).json({ error: 'API key not configured' });

    const { category } = req.body;

    const categoryFocus = {
      funding: 'funding rounds, Series A/B/C raises, venture capital investments',
      layoffs: 'layoffs, workforce reductions, downsizing, headcount cuts',
      leadership: 'executive hires, CEO/CFO/CSO appointments, leadership changes',
      ma: 'mergers, acquisitions, partnerships, licensing deals',
      research: 'clinical trial results, FDA approvals, research breakthroughs, drug development',
      expansion: 'new office openings, lab space leases, facility expansions, relocations',
      all: 'funding, layoffs, leadership changes, M&A, research breakthroughs, expansions'
    };

    const focus = categoryFocus[category] || categoryFocus.all;

    const prompt = `Search these specific news sources for the latest Bay Area life science, biotech, advanced manufacturing, and AI news:

PRIMARY SOURCES (search these first):
- fiercebiotech.com
- big4bio.com/regions/san-francisco-bay
- endpoints.news
- globenewswire.com
- genengnews.com
- bisnow.com/tags/bay-area
- statnews.com

Also search other reputable biotech/life science news sources.

Focus on: ${focus}

Only include news about:
1. Bay Area companies (headquartered in SF, South SF, San Mateo, Redwood City, Palo Alto, Oakland, Berkeley, Emeryville, etc.)
2. Companies with a significant Bay Area presence or operations

Return ONLY a JSON array of up to 12 news items. Each item must have:
- title: exact headline from the article
- company: company name (or "Multiple")
- category: one of "funding","layoffs","leadership","ma","research","expansion"
- summary: 2-3 sentences summarizing the news, relevant to commercial real estate brokers
- date: publication date like "April 2025"
- source: which publication this came from
- url: the direct URL link to the article (must be a real, working URL from the search results)
- relevance: one sentence on why a commercial real estate broker should care about this news

IMPORTANT: Only include articles where you have found the actual URL. Do not make up URLs.

Return ONLY the raw JSON array. No markdown. No backticks. No explanation.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
