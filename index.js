import fs from "fs/promises"
import IndexRenderer from "./index-renderer.js";

const set = 11
const batch = 50

const indexUrl = `https://www.justice.gov/epstein/doj-disclosures/data-set-${set}-files`

const indexFile = `index-${set}.json`;
const index = new Set(JSON.parse(await fs.readFile(indexFile, "utf8")));

let page = 250;

const renderer = new IndexRenderer(batch);
while (true) {
    const response = await fetch(`${indexUrl}?page=${page}`, {
        "headers": {
            "cookie": "justiceGovAgeVerified=true;",
            "sec-ch-ua": "\"Not(A:Brand\";v=\"8\", \"Chromium\";v=\"144\", \"Google Chrome\";v=\"144\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"macOS\"",
            "upgrade-insecure-requests": "1",
        },
        "body": null,
        "method": "GET"
    });

    const html = await response.text();

    if (!response.ok) throw new Error(`Failed to navigate to page ${page}. Got response:\n${html}`);

    const previousIndexSize = index.size
    const matches = html.match(new RegExp(`/epstein/files/DataSet%20${set}/EFTA\\d+\\.pdf`, 'g'));
    for (const match of matches) index.add(match);

    const newFilesCount = index.size - previousIndexSize;
    renderer.updateGraph(1 - newFilesCount / matches.length);

    if (page % batch === 0) {
        renderer.updateDescription(`Updating index at page ${page}`);
        await fs.writeFile(indexFile, JSON.stringify([...index]));
    }

    page++;
}