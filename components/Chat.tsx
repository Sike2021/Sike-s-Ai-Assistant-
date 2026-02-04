const defaultAiStreamFunction = async () => {
    const response = await fetch('/api/proxy');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let done = false;
    while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const text = decoder.decode(value, { stream: !done });
        yield { text };
    }
};

function Chat({ aiStreamFunction = defaultAiStreamFunction }) {
    // Existing chat logic using aiStreamFunction
}