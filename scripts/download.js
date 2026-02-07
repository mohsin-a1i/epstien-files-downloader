import fs from "fs/promises";
import { RendererLayout, ContentRenderer, ProgressRenderer } from "./renderer/index.js";
import IndexManager from "./index-manager.js";

async function main() {
    const args = process.argv.slice(2);

    let set = null;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--set' || args[i] === '-s') {
            set = parseInt(args[i + 1]);
        }
    }

    if (set === null || isNaN(set)) {
        console.error("Specify a data set");
        process.exit(1);
    }

    const index = new IndexManager(set);
    await index.load();

    await concurrentDownload(index);

    await index.save();
}
main()

async function concurrentDownload(index, concurrent = 1) {
    const downloadableFileNumbers = getDownloadableFileNumbers(index);

    if (downloadableFileNumbers.length > 0) {
        console.log(`Missing ${downloadableFileNumbers.length}/${index.serverFiles.size} files`);
    } else {
        console.log("All files already downloaded");
        return;
    }

    let downloaded = 0;
    let failed = 0;

    const progressRenderer = new ProgressRenderer(downloadableFileNumbers.length);
    const contentRenderer = new ContentRenderer();
    new RendererLayout([contentRenderer, progressRenderer]);

    for (let i = 0; i < downloadableFileNumbers.length; i+= concurrent) {
        const chunk = downloadableFileNumbers.slice(i, i + concurrent);

        await Promise.allSettled(chunk.map(async (fileNumber) => {
            const fileName = index.getFileName(fileNumber);
            const [success, description] = await download(index.getFileURL(fileNumber), index.getFilePath(fileNumber));
            
            if (success) {
                downloaded++;
                contentRenderer.render(`Downloaded ${fileName}`);
            } else {
                index.serverCorruptedFiles.add(fileNumber);

                failed++;
                contentRenderer.render(`Error downloading ${fileName} : ${description}`);
            }

            progressRenderer.render(failed + downloaded);
        }))
    }

    if (failed) {
        console.log(`Failed to download ${failed}/${downloadableFileNumbers.length} files`);
    } else {
        console.log(`All files downloaded successfully`);
    }
}

async function download(URL, path) {
    const response = await fetch(URL, {
        "cache": "default",
        "credentials": "include",
        "headers": {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Priority": "u=0, i",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15",
            "cookie": "justiceGovAgeVerified=true;",
        },
        "method": "GET",
        "mode": "cors",
        "redirect": "follow",
        "referrerPolicy": "strict-origin-when-cross-origin"
    });

    if (response.ok) await fs.writeFile(path, response.body);

    return [response.ok, response.statusText];
}

function getDownloadableFileNumbers(index) {
    const downloadableFileNumbers = []

    for (const fileNumber of index.serverFiles) {
        if (fileNumber in index.localFiles || index.localCorruptedFiles.has(fileNumber)) continue
        downloadableFileNumbers.push(fileNumber)
    }

    return downloadableFileNumbers
}