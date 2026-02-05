import fs from "fs/promises";
import { RendererLayout, ContentRenderer, ProgressRenderer } from "../render/index.js";

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

    const indexPath = `../index/INDEX${set}.json`
    const directory = `../VOL${set.toString().padStart(5, "0")}/`;

    const [pendingFileNumbers, fileNumbers] = await getFileNumbers(indexPath, directory);

    if (pendingFileNumbers.length > 0) {
        console.log(`Missing ${pendingFileNumbers.length}/${fileNumbers.length} files`);
    } else {
        console.log("All files already downloaded");
        return;
    }

    const failed = await concurrentDownload(set, pendingFileNumbers, directory);

    if (failed) {
        console.log(`Failed to download ${failed}/${pendingFileNumbers.length} files`);
    } else {
        console.log(`All files downloaded successfully`);
    }
}
main()

function getFileName(fileNumber) {
    return `EFTA${fileNumber.toString().padStart(8, "0")}.pdf`
}

function getFileURL(set, fileName) {
    return `https://www.justice.gov/epstein/files/DataSet%20${set}/${fileName}`
}

async function getFileNumbers(indexPath, directory) {
    console.log(`Checking ${directory}`);

    const index = JSON.parse(await fs.readFile(indexPath, "utf8"));
    const fileNumbers = index.server.files;

    let pendingFileNumbers = [];
    for (const fileNumber of fileNumbers) {
        const filename = getFileName(fileNumber);
        if (!await fileExists(`${directory}${filename}`)) pendingFileNumbers.push(fileNumber);
    }

    return [pendingFileNumbers, fileNumbers];
}

async function fileExists(path) {
    try {
        await fs.access(path);
    } catch (error) {
        if (error.code === "ENOENT") return false;
    }

    return true;
}

async function concurrentDownload(set, pendingFileNumbers, directory, concurrent = 100) {
    let downloaded = 0;
    let failed = 0;

    const progressRenderer = new ProgressRenderer(pendingFileNumbers.length);
    const contentRenderer = new ContentRenderer();
    new RendererLayout([progressRenderer, contentRenderer]);

    for (let i = 0; i < pendingFileNumbers.length; i+= concurrent) {
        const chunk = pendingFileNumbers.slice(i, i + concurrent);

        await Promise.allSettled(chunk.map(async (fileNumber) => {
            const fileName = getFileName(fileNumber);
            const [success, description] = await download(getFileURL(set, fileName), `${directory}${fileName}`);
            
            if (success) {
                downloaded++;
                contentRenderer.render(`Downloaded ${fileName}`);
            } else {
                failed++;
                contentRenderer.render(`Error downloading ${fileName} : ${description}`);
            }

            progressRenderer.render(failed + downloaded);
        }))
    }

    return failed;
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