const OpenAI = require('openai');
const pdfParse = require('pdf-parse');

const CATEGORIES = [
  "Men's Singles Open", "Women's Singles", "Men's Doubles Open", "Women's Doubles", "Mixed Doubles",
  "Beginner Singles", "Beginner Men's Singles", "Beginner Women's Singles",
  "Beginner Doubles", "Beginner Men's Doubles", "Beginner Women's Doubles", "Beginner Mixed Doubles",
  "Intermediate Singles", "Intermediate Men's Singles", "Intermediate Women's Singles",
  "Intermediate Doubles", "Intermediate Men's Doubles", "Intermediate Women's Doubles", "Intermediate Mixed Doubles",
  "Advanced Men's Singles", "Advanced Women's Singles", "Advanced Men's Doubles", "Advanced Women's Doubles", "Advanced Mixed Doubles",
  "35+ Men's Singles", "35+ Men's Doubles", "35+ Women's Singles", "35+ Women's Doubles", "35+ Mixed Doubles",
  "40+ Men's Singles", "40+ Men's Doubles", "40+ Women's Singles", "40+ Women's Doubles", "40+ Mixed Doubles",
  "45+ Men's Singles", "45+ Men's Doubles", "45+ Women's Singles", "45+ Women's Doubles", "45+ Mixed Doubles",
  "50+ Men's Singles", "50+ Men's Doubles", "50+ Women's Singles", "50+ Women's Doubles", "50+ Mixed Doubles",
  "55+ Men's Singles", "55+ Men's Doubles", "55+ Women's Singles", "55+ Women's Doubles", "55+ Mixed Doubles",
  "Men's Singles 60+", "Men's Doubles 60+", "Women's Singles 60+", "Women's Doubles 60+", "Mixed Doubles 60+",
  "Men's Singles 65+", "Men's Doubles 65+", "Women's Singles 65+", "Women's Doubles 65+", "Mixed Doubles 65+",
  "Men's Singles 70+", "Men's Doubles 70+", "Women's Singles 70+", "Women's Doubles 70+", "Mixed Doubles 70+",
  "Split Age 35+", "Split Age 40+", "Split Age 50+",
  "Team Event",
];

const buildPrompt = (today, currentForm) => `
You are extracting pickleball tournament registration data from a booking confirmation, tax invoice, or event page.
Return ONLY a valid JSON object — no markdown, no explanation.

Today's date: ${today}

CURRENT FORM STATE (already filled — merge new data into this):
Name: ${currentForm.name || '(not set)'}
Categories:
${currentForm.categories.length === 0
  ? '  (none)'
  : currentForm.categories.map((cat, i) => {
      const missing = [];
      if (!cat.categoryName) missing.push('category');
      if (!cat.date) missing.push('date');
      if (cat.entryFee === '' || cat.entryFee == null) missing.push('entry fee');
      return `  Category ${i + 1}: ${JSON.stringify(cat)}${missing.length ? ` [INCOMPLETE: ${missing.join(', ')}]` : ' [complete]'}`;
    }).join('\n')}

VALID CATEGORY NAMES (use exact strings, case-sensitive):
${CATEGORIES.map((c) => `- "${c}"`).join('\n')}

VALID MEDAL VALUES: "None", "Gold", "Silver", "Bronze"

EXTRACTION RULES:

TOURNAMENT NAME:
- Extract the event/tournament name. Shorten if very long (e.g. "MPL - Momentum Pickleball League - Season 8" → "MPL Season 8" or keep full).
- If not found, return null.

LOCATION:
- Extract venue name and city as a plain text search string.
- If not found, return null.

CATEGORIES (one entry per ticket/registration line):
- categoryName: Map the ticket description to the closest valid category name.
  Common mappings: "Mens Doubles" → "Men's Doubles Open", "Intermediate Mens Doubles" → "Intermediate Men's Doubles",
  "MD" → "Men's Doubles Open", "WD" → "Women's Doubles", "MXD" → "Mixed Doubles".
  If ambiguous, set null and add an ambiguity entry.
- date: Use the event date (not invoice date unless that's all that's available). Format: YYYY-MM-DD.
- entryFee: The ticket price / amount paid for this category.
- medal: null — booking confirmations don't have results.
- prizeAmount: null — unless explicitly stated in the document.

MERGE RULES:
- Return the COMPLETE merged categories array (existing + new).
- If a current category is INCOMPLETE, fill its missing fields from the document.
- Only add a new category if the document shows a ticket not already in the form.
- Keep existing fields that are already filled; don't overwrite with null.

AMBIGUITY FORMAT (for unclear category names):
{
  "id": "cat_{categoryIndex}_{field}",
  "categoryIndex": <number>,
  "field": "categoryName",
  "question": "<question>",
  "options": ["<exact valid value>", ...]
}

OUTPUT FORMAT:
{
  "name": string | null,
  "locationQuery": string | null,
  "categories": [{ "categoryName": string|null, "date": string|null, "medal": null, "entryFee": number|null, "prizeAmount": null }],
  "ambiguities": []
}
`.trim();

let openaiClient = null;
const getClient = () => {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
};

const sanitize = (parsed, currentForm) => {
  if (!Array.isArray(parsed.categories)) parsed.categories = [];
  if (!Array.isArray(parsed.ambiguities)) parsed.ambiguities = [];
  if (typeof parsed.name !== 'string') parsed.name = null;
  if (typeof parsed.locationQuery !== 'string') parsed.locationQuery = null;

  // If AI returned no categories but current form has them, preserve existing
  if (parsed.categories.length === 0 && currentForm.categories.length > 0) {
    parsed.categories = currentForm.categories;
  }

  parsed.categories = parsed.categories.map((cat) => ({
    categoryName: typeof cat.categoryName === 'string' ? cat.categoryName : null,
    date: typeof cat.date === 'string' ? cat.date : null,
    medal: typeof cat.medal === 'string' ? cat.medal : null,
    entryFee: typeof cat.entryFee === 'number' ? cat.entryFee : null,
    prizeAmount: typeof cat.prizeAmount === 'number' ? cat.prizeAmount : null,
  }));

  return parsed;
};

const callOpenAIText = async (systemPrompt, textContent) => {
  const completion = await getClient().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Document content:\n\n${textContent.slice(0, 8000)}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 1000,
  });
  return JSON.parse(completion.choices[0].message.content);
};

const callOpenAIVision = async (systemPrompt, base64, mimeType) => {
  const completion = await getClient().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract all tournament registration details from this document/screenshot:' },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 1000,
  });
  return JSON.parse(completion.choices[0].message.content);
};

// ── Controllers ───────────────────────────────────────────────────────────────

exports.parseFromFile = async (req, res, next) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ success: false, message: 'AI service is not configured' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    let currentForm;
    try {
      currentForm = req.body.currentForm ? JSON.parse(req.body.currentForm) : {};
    } catch {
      currentForm = {};
    }

    const safeForm = {
      name: currentForm?.name || '',
      categories: Array.isArray(currentForm?.categories) ? currentForm.categories : [],
    };

    const today = new Date().toISOString().split('T')[0];
    const prompt = buildPrompt(today, safeForm);
    const { mimetype, buffer } = req.file;

    let parsed;

    if (mimetype === 'application/pdf') {
      const pdfData = await pdfParse(buffer);
      const text = pdfData.text;
      if (!text || text.trim().length < 50) {
        return res.status(422).json({ success: false, message: 'Could not extract text from this PDF. Try uploading a screenshot instead.' });
      }
      parsed = sanitize(await callOpenAIText(prompt, text), safeForm);
    } else if (mimetype.startsWith('image/')) {
      const base64 = buffer.toString('base64');
      parsed = sanitize(await callOpenAIVision(prompt, base64, mimetype), safeForm);
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported file type' });
    }

    return res.json({ success: true, data: parsed });
  } catch (err) {
    next(err);
  }
};
