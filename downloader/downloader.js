import fs from "fs/promises";
import DownloaderRenderer from "./renderer/downloader.js";

async function main() {
    const args = process.argv.slice(2);

    let set = null;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--set' || args[i] === '-s') {
            set = parseInt(args[i + 1], 10);
        }
    }

    if (set === null || isNaN(set)) {
        console.error("Specify a data set");
        process.exit(1);
    }

    const directory = `../VOL${set.toString().padStart(5, "0")}/`;

    const [pendingUrls, urls] = await getUrls(`index/SET${set}.json`, directory);

    if (pendingUrls.length > 0) {
        console.log(`Missing ${pendingUrls.length}/${urls.length} files`);
    } else {
        console.log("All files already downloaded");
        return;
    }

    const failed = await concurrentDownload(pendingUrls, directory);

    if (failed) {
        console.log(`Failed to download ${failed}/${pendingUrls.length} files`);
    } else {
        console.log(`All files downloaded successfully`);
    }
}
main()

async function getUrls(index, directory) {
    console.log(`Checking ${directory}`);

    let pendingUrls = [];
    const urls = JSON.parse(await fs.readFile(index, "utf8"));
    for (const url of urls) {
        const filename = url.match(/EFTA\d+\.pdf/)[0];
        if (!await fileExists(`${directory}${filename}`)) pendingUrls.push(url);
    }

    return [pendingUrls, urls];
}

async function fileExists(path) {
    try {
        await fs.access(path);
    } catch (error) {
        if (error.code === "ENOENT") return false;
    }

    return true;
}

async function concurrentDownload(urls, directory, concurrent = 100) {
    let downloaded = 0;
    let failed = 0;

    const renderer = new DownloaderRenderer(urls.length);
    for (let i = 0; i < urls.length; i+= concurrent) {
        const chunk = urls.slice(i, i + concurrent);
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

    return failed;
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

    return [response.ok, response.statusText];
}