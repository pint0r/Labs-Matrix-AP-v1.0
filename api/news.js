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
      funding: 'funding rounds, Series A/B/C raises, venture capital',
      layoffs: 'layoffs, workforce reductions, downsizing',
      leadership: 'CEO/CFO/CSO appointments, leadership changes',
      ma: 'mergers, acquisitions, partnerships',
      research: 'FDA approvals, clinical trials, research breakthroughs',
      expansion: 'lab space leases, facility expansions, relocations',
      all: 'funding, layoffs, leadership, M&A, lab leases, expansions'
    };

    const focus = categoryFocus[category] || categoryFocus.all;

    const prompt = `Today is ${todayStr}. Search for Bay Area biotech and life science news from ${monthStr} (since ${monthStart}).

Search these sources: big4bio.com, connectcre.com, bisnow.com, fiercebiotech.com, endpoints.news, statnews.com, genengnews.com

Topic: ${focus}
Only include: Bay Area companies, articles from ${monthStr}, real URLs from search results.

Return a JSON array of up to 12 items, each with: title, company, category (funding/layoffs/leadership/ma/research/expansion), summary (2 sentences), date, source, url, relevance.

Return ONLY the raw JSON array.`;

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
