type EnrichedWord = {
  lemma: string;
  translation: string;
  article: string;
  gender: "masculine" | "feminine" | null;
  part: string;
  cefr: string;
  tags: string[];
};

type ExtractedItem = {
  lemma: string;
  meaning: string;
  observedForms: string[];
  part: string;
  article: string;
  gender: "masculine" | "feminine" | "none";
  group: "regular -IR" | "irregular -IR" | "other";
};

const extractionSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      maxItems: 100,
      items: {
        type: "object",
        properties: {
          lemma: { type: "string", description: "Normalized French dictionary form." },
          meaning: { type: "string", description: "Short, natural English meaning." },
          observedForms: { type: "array", items: { type: "string" } },
          part: { type: "string" },
          article: { type: "string" },
          gender: { type: "string", enum: ["masculine", "feminine", "none"] },
          group: { type: "string", enum: ["regular -IR", "irregular -IR", "other"] },
        },
        required: ["lemma", "meaning", "observedForms", "part", "article", "gender", "group"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
} as const;

const verbPrompt = `You are the lexical intelligence inside Lexique, a French learning app.

Extract every French verb that is actually present in the user's text. The input may be a paragraph, lesson, story, Markdown table, bullet list, notes, or a mixture of French and English.

Rules:
1. Recognize verbs in every tense and form: present, passé composé, imparfait, futur, conditional, subjunctive, imperative, infinitive, present participle, and past participle used verbally.
2. Return each verb in its French infinitive. Examples: "j'ai fini" -> "finir"; "nous choisissions" -> "choisir"; "elle est partie" -> "partir"; "ils se sont levés" -> "se lever".
3. Preserve "se" or "s'" for genuinely pronominal verbs.
4. Give a short, accurate English infinitive meaning beginning with "to" when natural.
5. Deduplicate by infinitive, but include all distinct surface forms in observedForms.
6. Do not turn headings, English words, nouns, adjectives, examples about grammar, or table separators into entries.
7. A past participle counts only when context shows verbal use, not when it is merely an adjective.
8. Set part to "verbe", article to an empty string, and gender to "none".
9. Classify -IR verbs as regular -IR or irregular -IR when applicable; otherwise use other.
10. Return an empty items array when no French verb is present. Never invent a verb.`;

const vocabularyPrompt = `You are the lexical intelligence inside Lexique, a French learning app.

Extract useful French vocabulary actually present in the user's text. Normalize verbs to their infinitive, pronominal verbs with se/s', nouns with a useful singular article, and adjectives to masculine singular. Give short, accurate English meanings. Deduplicate entries. Ignore headings, Markdown syntax, English-only words, and table separators. For verbs set part to "verbe", article to an empty string, gender to "none", and classify -IR verbs when applicable. For non-verbs use group "other". Never invent an entry.`;

function getOutputText(data: unknown) {
  const response = data as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  return "";
}

function normalize(items: ExtractedItem[]): EnrichedWord[] {
  const seen = new Set<string>();
  const words: EnrichedWord[] = [];
  for (const item of items) {
    const lemma = item.lemma.trim().normalize("NFC");
    const key = lemma.toLocaleLowerCase("fr");
    if (!lemma || !item.meaning.trim() || seen.has(key)) continue;
    seen.add(key);
    words.push({
      lemma,
      translation: item.meaning.trim(),
      article: item.article.trim(),
      gender: item.gender === "none" ? null : item.gender,
      part: item.part.trim() || "mot",
      cefr: "—",
      tags: ["OpenAI", ...(item.group === "other" ? [] : [item.group]), ...item.observedForms.slice(0, 4).map(form => `forme: ${form}`)],
    });
  }
  return words;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { text?: unknown; entries?: unknown; mode?: unknown } | null;
  const text = typeof body?.text === "string"
    ? body.text.trim()
    : Array.isArray(body?.entries)
      ? body.entries.filter((entry): entry is string => typeof entry === "string").join("\n").trim()
      : "";

  if (!text) return Response.json({ error: "Paste some French text first.", code: "EMPTY_INPUT" }, { status: 400 });
  if (text.length > 30_000) return Response.json({ error: "Please use less than 30,000 characters at once.", code: "INPUT_TOO_LONG" }, { status: 413 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "OpenAI is not connected yet.", code: "AI_NOT_CONFIGURED" }, { status: 503 });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      input: [
        { role: "system", content: body?.mode === "all" ? vocabularyPrompt : verbPrompt },
        { role: "user", content: text },
      ],
      text: { format: { type: "json_schema", name: "lexique_extraction", strict: true, schema: extractionSchema } },
      max_output_tokens: 5000,
    }),
  });

  if (!response.ok) {
    const requestId = response.headers.get("x-request-id");
    console.error("OpenAI extraction failed", { status: response.status, requestId });
    return Response.json({ error: "The AI could not analyze this text right now.", code: "AI_REQUEST_FAILED" }, { status: 502 });
  }

  const output = getOutputText(await response.json());
  if (!output) return Response.json({ error: "The AI returned no usable result.", code: "AI_EMPTY_RESULT" }, { status: 502 });
  try {
    const parsed = JSON.parse(output) as { items?: ExtractedItem[] };
    return Response.json({ words: normalize(parsed.items ?? []) });
  } catch {
    return Response.json({ error: "The AI result could not be read.", code: "AI_INVALID_RESULT" }, { status: 502 });
  }
}
