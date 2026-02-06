import fs from "fs/promises";
import { RendererLayout, ContentRenderer, ProgressRenderer } from "../render/index.js";
import IndexStore from "../index/store.js";

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

    const index = new IndexStore(set);
    await index.load();

    await concurrentDownload(index);

    await index.save();
}
main()

async function concurrentDownload(index, concurrent = 100) {
    const downloadableFileNumbers = await index.getDownloadableFileNumbers();

    if (downloadableFileNumbers.length > 0) {
        console.log(`Missing ${downloadableFileNumbers.length}/${index.getServerFilesCount()} files`);
    } else {
        console.log("All files already downloaded");
        return;
    }

    let downloaded = 0;
    let failed = 0;

    const progressRenderer = new ProgressRenderer(downloadableFileNumbers.length);
    const contentRenderer = new ContentRenderer();
    new RendererLayout([progressRenderer, contentRenderer]);

    for (let i = 0; i < downloadableFileNumbers.length; i+= concurrent) {
        const chunk = downloadableFileNumbers.slice(i, i + concurrent);

        await Promise.allSettled(chunk.map(async (fileNumber) => {
            const fileName = index.getFileName(fileNumber);
            const [success, description] = await download(index.getFileURL(fileNumber), index.getFilePath(fileNumber));
            
            if (success) {
                downloaded++;
                contentRenderer.render(`Downloaded ${fileName}`);
            } else {
                index.addServerCorruptedFileNumber(fileNumber);

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
        "headers": {
            "cookie": "justiceGovAgeVerified=true;",
            "sec-ch-ua": "\"Not(A:Brand\";v=\"8\", \"Chromium\";v=\"144\", \"Google Chrome\";v=\"144\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"macOS\"",
            "upgrade-insecure-requests": "1"
        },
        "body": null,
        "method": "GET"
    });

    if (response.ok) await fs.writeFile(path, response.body);

    return [response.ok, response.statusText];
}