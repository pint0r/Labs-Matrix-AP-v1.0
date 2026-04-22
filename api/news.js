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

    const today = new Date();
    const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const monthStr = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

    const categoryFocus = {
      funding: 'funding rounds, Series A/B/C raises, venture capital investments',
      layoffs: 'layoffs, workforce reductions, downsizing, headcount cuts',
      leadership: 'executive hires, CEO/CFO/CSO appointments, leadership changes',
      ma: 'mergers, acquisitions, partnerships, licensing deals',
      research: 'clinical trial results, FDA approvals, research breakthroughs, drug development',
      expansion: 'new office openings, lab space leases, facility expansions, relocations',
      all: 'funding, layoffs, leadership changes, M&A, research breakthroughs, lab space leases, expansions'
    };

    const focus = categoryFocus[category] || categoryFocus.all;

    const prompt = `Today is ${todayStr}.

Search for Bay Area life science, biotech, advanced manufacturing, and commercial real estate news published this month (${monthStr}, from ${monthStart} onward).

PRIORITY SOURCES — search these first, they publish daily Bay Area biotech and CRE news:
- big4bio.com/regions/san-francisco-bay  
- connectcre.com (search for Bay Area biotech/life science)
- bisnow.com/tags/bay-area

ALSO SEARCH:
- fiercebiotech.com
- endpoints.news
- statnews.com
- genengnews.com
- globenewswire.com

Focus topic: ${focus}

Requirements:
- Only articles published in ${monthStr} (${monthStart} or later)
- Only Bay Area companies or companies with Bay Area operations (SF, South SF, Brisbane, San Mateo, Redwood City, Palo Alto, Menlo Park, Oakland, Berkeley, Emeryville, San Jose, Alameda, Hayward, Fremont, etc.)
- Life science, biotech, advanced manufacturing, AI drug discovery, or commercial real estate topics only
- Must include the real article URL from search results

Return ONLY a JSON array of up to 15 news items. Each item must have:
- title: exact headline
- company: company name (or "Multiple")
- category: one of "funding","layoffs","leadership","ma","research","expansion"
- summary: 2-3 sentences summarizing the news for commercial real estate brokers
- date: exact publication date (e.g. "April 15, 2026")
- source: publication name (e.g. "Big4Bio", "ConnectCRE", "FierceBiotech")
- url: direct URL to the article
- relevance: one sentence on why a commercial real estate broker should care

Only include articles where you found the actual URL. Do not fabricate URLs.

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
        max_tokens: 5000,
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
