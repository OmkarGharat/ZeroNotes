const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const FORMAT_PROMPT = `Format the following note into a well-structured document. Rules:
- Add appropriate headings (H2, H3) where it makes sense
- Convert lists of URLs into bullet lists with clickable links
- Detect and wrap code snippets in code blocks with the correct language
- Convert dash/star lists into proper bullet lists
- Keep the original content and meaning — do NOT add, remove, or rephrase anything
- Return clean HTML only, no markdown, no explanation, no wrapping code fences

Note content:
`;

export async function formatNoteWithGemini(text: string, apiKey: string): Promise<string> {
    if (!apiKey) {
        throw new Error('No Gemini API key configured. Add one in Settings.');
    }

    if (!text.trim()) {
        throw new Error('Note is empty — nothing to format.');
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: FORMAT_PROMPT + text }]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192,
            }
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message = errorData?.error?.message || `API error (${response.status})`;

        if (response.status === 400) throw new Error('Invalid API key. Check your Gemini key in Settings.');
        if (response.status === 429) throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        throw new Error(message);
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
        throw new Error('Gemini returned an empty response. Try again.');
    }

    // Clean up: remove markdown code fences if Gemini wraps the response
    let html = content.trim();
    if (html.startsWith('```html')) {
        html = html.slice(7);
    } else if (html.startsWith('```')) {
        html = html.slice(3);
    }
    if (html.endsWith('```')) {
        html = html.slice(0, -3);
    }

    return html.trim();
}
