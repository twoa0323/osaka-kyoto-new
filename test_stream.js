const data = {
    schedule: [{ date: "2024-01-01", note: "hello\nworld" }]
};

const chunkStr = `0:${JSON.stringify(JSON.stringify(data))}\n`;
console.log("Raw chunk:", chunkStr);

let buffer = chunkStr;
let fullText = "";

let newlineIndex;
while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, newlineIndex).trim();
    buffer = buffer.slice(newlineIndex + 1);

    if (line.startsWith('0:')) {
        try {
            const content = JSON.parse(line.substring(2));
            console.log("Parsed content:", content);
            fullText += content;
        } catch (e) {
            console.error("Parse Error:", e, line.substring(2));
        }
    }
}

try {
    console.log("Final FullText Parse:", JSON.parse(fullText));
} catch (e) {
    console.error("FullText Parse Error:", e);
}
