const { createDataStreamResponse } = require('ai');

async function test() {
    const res = createDataStreamResponse({
        execute: async (dataStream) => {
            dataStream.writeMessageAnnotation({ type: 'json_full', content: { a: 1 } });
            dataStream.writeChunk('0:' + JSON.stringify(JSON.stringify({ a: 1 })) + '\n');
        }
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        console.log("ACTUAL CHUNK:", JSON.stringify(decoder.decode(value, { stream: true })));
    }
}

test().catch(console.error);
