import * as readline from 'node:readline';

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const API_URL = 'http://localhost:8000/api/extract';

async function processSummary(text: string) {
	console.log('\n[!] Sending to local LLM via FastAPI...\n');
	const startTime = Date.now();

	try{
		const response = await fetch(API_URL,{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text })
		});

		if (!response.ok) {
			throw new Error(`Server Error: ${response.statusText}`);
		}

		const data = await response.json();
		const latency = ((Date.now() - startTime) / 1000).toFixed(2);

		console.log(`=== INVOICE GENERATED (${latency}s) ===`);
		console.dir(data, {depth: null, colors: true});
		console.log('======================\n');

	} catch (error) {
		console.error('[-] Request failed:', error instanceof Error ? error.message : error); 
	}
}

function promptUser() {
    rl.question('\nEnter field summary (or type "exit" to quit):\n> ', async (answer) => {
        const input = answer.trim();
        
        if (input.toLowerCase() === 'exit') {
            console.log('Shutting down interface.');
            rl.close();
            return;
        }

        if (input) {
            await processSummary(input);
        } else {
            console.log('No input detected.');
        }
        
        // Recursively call the prompt again after processing
        promptUser();
    });
}

// Kick off the loop
promptUser();


