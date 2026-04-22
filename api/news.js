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

    // Get today's date to inject into prompt
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const todayISO = today.toISOString().slice(0, 10);

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

    const prompt = `Today is ${todayStr}.

Search these specific news sources for articles published TODAY (${todayISO}) or within the last 48 hours. Do NOT include older articles.

PRIMARY SOURCES:
- fiercebiotech.com
- endpoints.news
- statnews.com
- big4bio.com/regions/san-francisco-bay
- globenewswire.com/newsroom
- genengnews.com
- bisnow.com/tags/bay-area

Also check other reputable biotech/life science sources for today's news.

Focus topic: ${focus}

STRICT REQUIREMENTS:
- Only articles from the last 48 hours (published on or after ${new Date(today - 2*24*60*60*1000).toISOString().slice(0,10)})
- Only Bay Area companies or companies with Bay Area operations/facilities
- Life science, biotech, advanced manufacturing, or AI topics only
- Must have a real, verifiable URL from the search

Return ONLY a JSON array of up to 12 news items. Each item must have:
- title: exact headline
- company: company name (or "Multiple")
- category: one of "funding","layoffs","leadership","ma","research","expansion"
- summary: 2-3 sentences summarizing the news for commercial real estate brokers
- date: exact publication date (e.g. "April 22, 2026")
- source: publication name
- url: direct URL to the article
- relevance: one sentence on why a commercial real estate broker should care

If there are fewer than 12 articles from today/yesterday, only return what exists — do NOT fill with older news.

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
        max_tokens: 4000,
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
