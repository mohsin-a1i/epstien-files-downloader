import fs from "fs/promises";
import { RendererLayout, ContentRenderer, IndexRenderer } from "../render/index.js";

async function main() {
	const args = process.argv.slice(2);

	let set = null;
	let page = 0;
	let batch = 20;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--set' || args[i] === '-s') {
			set = parseInt(args[i + 1]);
		}
		if (args[i] === '--page' || args[i] === '-p') {
			page = parseInt(args[i + 1]);
		}
		if (args[i] === '--batch' || args[i] === '-b') {
			batch = parseInt(args[i + 1]);
		}
	}

	if (set === null || isNaN(set)) {
		console.error("Specify a data set");
		process.exit(1);
	}

	await scrape(set, page, batch)
}
main()

async function scrape(set, page, batch) {
	const indexUrl = `https://www.justice.gov/epstein/doj-disclosures/data-set-${set}-files`
	const indexPath = `../index/INDEX${set}.json`
	const index = JSON.parse(await fs.readFile(indexPath, "utf8"))
	const fileNumbers = new Set(index.server.files);

	const indexRenderer = new IndexRenderer();
	const contentRenderer = new ContentRenderer();
	new RendererLayout([contentRenderer, indexRenderer]);

	let processedPagesCount = 0
	let batchScannedFilesCount = 0
	let batchDiscoveredFilesCount = 0
	let scannedFilesCount = 0
	let discoveredFilesCount = 0

	while (true) {
		const response = await fetch(`${indexUrl}?page=${page}`, {
			"headers": {
				"cookie": "justiceGovAgeVerified=true;",
				"sec-ch-ua": "\"Not(A:Brand\";v=\"8\", \"Chromium\";v=\"144\", \"Google Chrome\";v=\"144\"",
				"sec-ch-ua-mobile": "?0",
				"sec-ch-ua-platform": "\"macOS\"",
				"upgrade-insecure-requests": "1",
				"Referer": `${indexUrl}?page=${page - 1}`
			},
			"body": null,
			"method": "GET"
		});

		if (!response.ok) {
			console.log(`Error navigating to page ${page} : ${response.statusText}`)
			break;
		}

		const html = await response.text();
		const matches = html.matchAll(new RegExp(`/epstein/files/DataSet%20${set}/EFTA(\\d+)\\.pdf`, 'g'));

		const previousFilesCount = fileNumbers.size
		let matchesCount = 0;
		for (const match of matches) {
			matchesCount++;

			const fileNumber = parseInt(match[1]);
			fileNumbers.add(fileNumber);
		}
		batchScannedFilesCount += matchesCount
		scannedFilesCount += matchesCount
		batchDiscoveredFilesCount += fileNumbers.size - previousFilesCount
		discoveredFilesCount += fileNumbers.size - previousFilesCount

		processedPagesCount++;

		if (processedPagesCount % batch === 0) {
			index.server.files = [...fileNumbers];
			await fs.writeFile(indexPath, JSON.stringify(index));

			contentRenderer.render(`Index updated to page ${page} | ${discoveredFilesCount}/${scannedFilesCount} new files discovered`);
			indexRenderer.render(batchDiscoveredFilesCount / batchScannedFilesCount);

			processedPagesCount = 0;
			batchScannedFilesCount = 0;
			batchDiscoveredFilesCount = 0;
		}

		page++;

		await new Promise(resolve => setTimeout(resolve, (1000 + Math.random() * 400)));
	}
}