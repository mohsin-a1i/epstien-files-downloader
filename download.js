import fs from "fs/promises";
import DownloadRenderer from "./download-renderer.js";

const set = 11
const concurrent = 100;

main()

async function main() {
    const directory = `VOL${set.toString().padStart(5, "0")}/`;

    console.log(`Checking ${directory} ...`)

    let missingUrls = [];
    const index = `index-${set}.json`;
    const urls = JSON.parse(await fs.readFile(index, "utf8"));
    for (const url of urls) {
        const filename = url.match(/EFTA\d+\.pdf/)[0];
        if (!await fileExists(`${directory}${filename}`)) missingUrls.push(url);
    }

    if (missingUrls.length > 0) {
        console.log(`Missing ${missingUrls.length}/${urls.length} files`);
    } else {
        console.log("All files already downloaded");
        return;
    }

    let downloaded = 0;
    let failed = 0;
    const renderer = new DownloadRenderer(missingUrls.length);
    for (let i = 0; i < missingUrls.length; i+= concurrent) {
        const chunk = missingUrls.slice(i, i + concurrent);
        await Promise.allSettled(chunk.map(async (url) => {
            const filename = url.match(/EFTA\d+\.pdf/)[0];
            const [success, description] = await download(url, `${directory}${filename}`);
            
            if (success) {
                downloaded++;
                renderer.updateDescription(`Downloaded ${url}`);
            } else {
                failed++;
                renderer.updateDescription(`Error downloading ${url} : ${description}`);
            }

            renderer.updateProgress(failed + downloaded);
        }))
    }
    renderer.finish()

    if (failed) {
        console.log(`Failed to download ${failed}/${failed + downloaded} files`);
    } else {
        console.log(`All files downloaded successfully`);
    }
}

async function fileExists(path) {
    try {
        await fs.access(path);
    } catch (error) {
        if (error.code === "ENOENT") return false
    }

    return true
}

async function download(url, path) {
    const response = await fetch(`https://www.justice.gov/${url}`, {
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

    return [response.ok, response.statusText]
}