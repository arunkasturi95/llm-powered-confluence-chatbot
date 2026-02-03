import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';
import { ChromaClient } from 'chromadb';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();
// let uuidv4;

// async function loadUUID() {
//     if (!uuidv4) {
//         const uuid = await import('uuid');
//         uuidv4 = uuid.v4;
//     }
// }

const app = express();
const PORT = 3000;

// -------------------- Middleware --------------------
app.use(bodyParser.json());
app.use(express.static("public"));

// -------------------- Config --------------------
const BASE_URL = process.env.CONFLUENCE_BASE_URL;
const PAGE_URL = process.env.CONFLUENCE_PAGE_URL;
const EMAIL = process.env.CONFLUENCE_EMAIL;
const API_TOKEN = process.env.CONFLUENCE_API_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_API_URL = process.env.CLAUDE_API_URL;
const CHROMA_COLLECTION_NAME = process.env.CHROMA_COLLECTION_NAME

const authHeaders = {
    Authorization: `Basic ${Buffer.from(
        `${EMAIL}:${API_TOKEN}`
    ).toString("base64")}`,
};

// -------------------- OpenAI Client --------------------
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// -------------------- Chroma --------------------
let collection;

async function initChroma() {
    const chroma = new ChromaClient({
        host: "localhost",
        port: 8000,
        ssl: false,
    });


    collection = await chroma.getOrCreateCollection({
        name: CHROMA_COLLECTION_NAME,
    });

    console.log("✅ Chroma initialized");
}

// -------------------- Utilities --------------------
function stripHtml(html) {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

async function embedText(text) {
    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
    });

    return response.data[0].embedding;
}

// -------------------- Crawl & Index --------------------
app.get("/crawl-all", async (req, res) => {
    try {
        let start = 0;
        let totalIndexed = 0;

        //Reads every Confluence page
        while (true) {
            const response = await axios.get(`${BASE_URL}/content`, {
                headers: authHeaders,
                params: {
                    limit: 25,
                    start,
                    expand: "body.storage",
                },
            });

            const pages = response.data.results;

            for (const page of pages) {
                //Cleans HTML
                const text = stripHtml(page.body.storage.value);
                if (text.length < 200) continue;

                //Converts the clean/stripped text to vector
                const embedding = await embedText(text);

                const id = uuidv4();
                //Stores vectors + metadata in Chroma
                await collection.add({
                    ids: [id],
                    documents: [text],
                    embeddings: [embedding],
                    metadatas: [
                        {
                            title: page.title,
                            url: `${BASE_URL}${page._links.webui}`,
                        },
                    ],
                });

                totalIndexed++;
            }

            if (pages.length < 25) break;
            start += 25;
        }

        res.json({ status: "Indexed", totalIndexed });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Crawl failed" });
    }
});


app.post("/chat", async (req, res) => {
    try {
        const question = req.body.message;
        console.log("Question:", question);

        // Embed the question
        const queryEmbedding = await embedText(question);
        console.log("Query embedding length:", queryEmbedding?.length);

        // Semantic search in Chroma
        const results = await collection.query({
            queryEmbeddings: [queryEmbedding],
            nResults: 5,
        });
        console.log("Chroma raw results:", JSON.stringify(results, null, 2));

        if (!results.documents || results.documents[0].length === 0) {
            return res.json({
                answer: "I don't have enough indexed knowledge yet. Please run /crawl-all first.",
                sources: []
            });
        }

        const context = results.documents[0].join("\n\n");

        // Sources
        const sources = results.metadatas[0]
            .map((m) => `• ${m.title}: ${m.url}`)
            .join("\n");

        // Claude reasoning
        const claudeResponse = await axios.post(
            CLAUDE_API_URL,
            {
                model: "claude-3-haiku-20240307",
                max_tokens: 300,
                temperature: 0.2,
                messages: [
                    {
                        role: "user",
                        content: `
Answer the question using ONLY the context below.
Limit response to 10-100 words.

Context:
${context}

Question:
${question}
`,
                    },
                ],
            },
            {
                headers: {
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
            }
        );

        const answer = claudeResponse.data?.content?.[0]?.text ?? "I couldn't generate an answer from the available data.";

        console.log("✅ Final answer:", answer);
        console.log("🔗 Sources:", sources);

        res.json({ answer, sources });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Chat failed" });
    }
});


// -------------------- Start --------------------
initChroma().then(() => {
    app.listen(PORT, () =>
        console.log(`🚀 Server running at http://localhost:${PORT}`)
    );
});
