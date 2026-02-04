import fs from "fs/promises";
import IndexerRenderer from "./renderer/indexer.js";

async function main() {
    const args = process.argv.slice(2);

    let set = null;
    let page = 0;
    let batch = 5;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--set' || args[i] === '-s') {
            set = parseInt(args[i + 1]);
        }
        if (args[i] === '--page' || args[i] === '-p') {
            page = parseInt(args[i + 1]);
        }
        if (args[i] === '--batch' || args[i] === '-b') {
            page = parseInt(args[i + 1]);
        }
    }

    if (set === null || isNaN(set)) {
        console.error("Specify a data set");
        process.exit(1);
    }

    await index(set, page, batch)
}
main()

async function index(set, page, batch) {
    const indexUrl = `https://www.justice.gov/epstein/doj-disclosures/data-set-${set}-files`
    const indexFile = `index/SET${set}.json`
    const index = new Set(JSON.parse(await fs.readFile(indexFile, "utf8")));

    const renderer = new IndexerRenderer(batch);
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
        const matches = html.match(new RegExp(`/epstein/files/DataSet%20${set}/EFTA\\d+\\.pdf`, 'g'));

        const previousIndexSize = index.size;
        for (const match of matches) index.add(match);
        const newFilesCount = index.size - previousIndexSize;

        if (newFilesCount > 0) {
            renderer.updateMessage(`Found ${newFilesCount} new files on page ${page}`);
        }

        if (page % batch === 0) {
            renderer.updatePage(page);
            await fs.writeFile(indexFile, JSON.stringify([...index]));
        }

        renderer.updateGraph(newFilesCount / matches.length);

        await new Promise(resolve => setTimeout(resolve, 500));

        page++;
    }
}