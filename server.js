const express = require('express');
const app = express();
const port = 3018;
var bodyParser = require('body-parser')
app.use(bodyParser.json())
const { LMStudioClient } = require('@lmstudio/sdk')

app.post('/email-AI', async (req, res) => {
    try {
        const { emailBody } = req.body;
        let llama3;
        const client = new LMStudioClient();
        const loadedModels = await client.llm.listLoaded();
        if (loadedModels.length === 0) {
            const modelPath = "lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf";
            console.log("inside IF")
            llama3 = await client.llm.load(modelPath, {
                config: {
                    gpuOffload: {
                        enabled: false,
                        mainGpu: 0,
                        tensorSplit: [100],
                        ratio: 0
                    },
                    logLevel: "debug"
                }
            });
        } else {
            llama3 = await client.llm.get({ identifier: loadedModels[0].identifier });
        }

        const prediction = await llama3.respond(
            [
                {
                    role: "system",
                    content: `Categorize the email with their probabilities for QCR (Query, Complaint or Request) and provide the sentiment type of the email content with the pre-defined type. 
                    The output should be given in this format: { "QCR": { "Query": <probability-value>, "Complaint": <probability-value>, "Request": <probability-value> }, "Sentiment": { "Positive": <boolean-value>, "Negative": <boolean-value>, "Neutral": <boolean-value>, "Surprise": <boolean-value>, "Sarcasm": <boolean-value> } }`
                },
                {
                    role: "user",
                    content: emailBody
                },
            ],
            {
                structured: {
                    type: "json",
                    jsonSchema: {
                        type: "object",
                        properties: {
                            "QCR": {
                                type: "object",
                                properties: {
                                    "Query": { type: "number" },
                                    "Complaint": { type: "number" },
                                    "Request": { type: "number" }
                                },
                                required: ["Query", "Complaint", "Request"]
                            },
                            "Sentiment": {
                                type: "object",
                                properties: {
                                    "Positive": { type: "boolean" },
                                    "Negative": { type: "boolean" },
                                    "Neutral": { type: "boolean" },
                                    "Surprise": { type: "boolean" },
                                    "Sarcasm": { type: "boolean" }
                                },
                                required: ["Positive", "Negative", "Neutral", "Surprise", "Sarcasm"]
                            }
                        },
                        required: ["QCR", "Sentiment"]
                    }
                },
            }
        );

        res.send(JSON.parse(prediction.content))
    } catch (error) {
        console.log("error", error)
        res.status(500).send(error)
    }
})

app.listen(port, () => {
    console.log("server started")
})