const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Required for page content cleaning
const { htmlToText } = require('html-to-text');
const fs = require('fs');

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Confluence API Configuration
const BASE_URL = process.env.CONFLUENCE_BASE_URL;
const PAGE_URL = process.env.CONFLUENCE_PAGE_URL;
const API_TOKEN = process.env.CONFLUENCE_API_TOKEN;
const EMAIL = process.env.CONFLUENCE_EMAIL;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
// Claude chat endpoint
const CLAUDE_API_URL = process.env.CLAUDE_API_URL;

// Basic Authentication Header
const auth = {
    headers: {
        Authorization: `Basic ${Buffer.from(`${EMAIL}:${API_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/json'
    }
};

console.log('CONFLUENCE_BASE_URL:', process.env.CONFLUENCE_BASE_URL);
console.log('CONFLUENCE_PAGE_URL:', process.env.CONFLUENCE_PAGE_URL);
console.log('ANTHROPIC_API_KEY set:', process.env.ANTHROPIC_API_KEY);

app.post('/chat', async (req, res) => {

    try {
        // Step 1: Search Confluence content
        const userQuery = req.body.message;
        const rephrasedQuery = await rephraseQueryWithClaude(userQuery);
        // Defensive check for common Claude mistakes
        if (!rephrasedQuery.includes('text ~') || !rephrasedQuery.includes('type = page')) {
            return res.status(400).json({ reply: "Generated query is malformed or incomplete." });
        }
        console.log("Rephrased query:", rephrasedQuery);
        const cleanQuery = rephrasedQuery
            .replace(/[“”]/g, '"')
            .replace(/`/g, '')
            .trim();

        if (!cleanQuery || cleanQuery === '') {
            return res.status(400).json({ reply: "Sorry, I couldn't generate a valid query to search Confluence." });
        }

        console.log("Clean CQL Query:", cleanQuery);

        const encodedQuery = encodeURIComponent(cleanQuery);

        console.log("Final encoded CQL URL:", `${BASE_URL}/content/search?cql=${encodedQuery}`);

        const confluenceRes = await axios.get(`${BASE_URL}/content/search`, {
            ...auth,
            params: { cql: cleanQuery }
        });

        const pages = confluenceRes.data.results;

        if (!pages || pages.length === 0) {
            return res.json({ reply: 'No documents found matching your query.' });
        }

        const summaries = [];

        for (const page of pages.slice(0, 3)) {
            const pageId = page.id;
            const pageTitle = page.title;
            const pageUrl = `${PAGE_URL}${page._links.webui}`;

            const pageBodyRes = await axios.get(`${BASE_URL}/content/${pageId}?expand=body.storage`, auth);
            const pageHtmlContent = pageBodyRes.data.body.storage.value;
            const cleanText = pageHtmlContent.replace(/<[^>]*>/g, '').slice(0, 8000);

            const claudeRes = await axios.post(
                CLAUDE_API_URL,
                {
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 300,
                    temperature: 0.5,
                    messages: [
                        {
                            role: 'user',
                            content: `Here is a document:\n\n${cleanText}\n\nSummarize it in 100 words. Include any relevant files or image links. Provide a link to the original page: ${pageUrl}`
                        }
                    ],
                },
                {
                    headers: {
                        'x-api-key': process.env.ANTHROPIC_API_KEY,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json',
                    }
                }
            );

            const summary = claudeRes.data?.content?.[0]?.text || 'Summary not available';
            summaries.push(`📄 Summary of "${pageTitle}":\n${summary}`);
        }

        res.json({ reply: summaries.join('\n\n') });
    } catch (error) {
        console.error('Full error:', error.response?.data || error.message);
        res.status(500).json({
            "reply": "Error processing request: ${error.message}",
        });
    }
});



async function rephraseQueryWithClaude(userQuery) {
    try {
        const response = await axios.post(CLAUDE_API_URL, {
            model: "claude-3-haiku-20240307",
            max_tokens: 100,
            temperature: 0.5,
            system: `You are an expert assistant helping users search their company Confluence knowledge base. Given a user question, return only a valid Confluence CQL query that:

- searches for relevant terms using text ~ "..."
- filters for type = page

Do not include ORDER BY clauses or additional filters. Only return the raw CQL string.

Example: text ~ "deployment architecture" AND type = page`,


            messages: [
                {
                    role: 'user',
                    content: `User query: ${userQuery}`
                }
            ]
        }, {
            headers: {
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            }
        });

        return response.data?.content?.[0]?.text
            .replace(/Final CQL Query:\s*/i, '')   // remove leading preambles
            .replace(/```[a-z]*\n?/g, '')          // strip code block wrappers
            .replace(/[\r\n]+/g, ' ')              // flatten multiline
            .trim();
    } catch (error) {
        console.error('Claude rephrasing error:', error.response?.data || error.message);
        return userQuery; // fallback: return original query
    }
}



// Crawl all pages in a space and extract text
app.get('/crawl-all', async (req, res) => {
    try {
        const spaceKey = req.query.spaceKey;
        if (!spaceKey) {
            return res.status(400).json({ error: 'spaceKey query param is required.' });
        }

        let allPages = [];
        let start = 0;
        let limit = 50;
        let isLast = false;

        // Fetch all pages recursively
        while (!isLast) {
            const url = `${BASE_URL}/content?type=page&spaceKey=${spaceKey}&start=${start}&limit=${limit}&expand=body.storage,version`;
            const response = await axios.get(url, auth);
            const pages = response.data.results;
            allPages.push(...pages);

            if (pages.length < limit) isLast = true;
            else start += limit;
        }

        // Clean and transform page data
        const cleanedPages = allPages.map(page => {
            const html = page.body.storage?.value || '';
            const cleanText = htmlToText(html, {
                wordwrap: false,
                selectors: [{ selector: 'a', options: { ignoreHref: true } }]
            });

            return {
                id: page.id,
                title: page.title,
                url: `${PAGE_URL}${page._links.webui}`,
                version: page.version.number,
                text: cleanText.slice(0, 8000)  // truncate to stay under token limits
            };
        });

        // Save to file or use as needed
        fs.writeFileSync('confluence_dump.json', JSON.stringify(cleanedPages, null, 2));
        console.log(`✅ Saved ${cleanedPages.length} pages to confluence_dump.json`);

        res.json({ message: `Successfully crawled ${cleanedPages.length} pages.`, pages: cleanedPages.slice(0, 5) });  // Preview top 5
    } catch (err) {
        console.error('Crawl error:', err.message);
        res.status(500).json({ error: 'Failed to crawl Confluence space.' });
    }
});



// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});