import {
    existsSync,
    lstatSync,
    readdirSync,
    statSync,
    createReadStream,
} from 'fs';
import { join } from 'path';

import { getInput, setFailed } from '@actions/core';
import { getOctokit, context } from '@actions/github';

const octokit = getOctokit(process.env.GITHUB_TOKEN);

function checkDirectories(...folders) {
    for(const f of folders){
        if (!existsSync(f)) {
            return setFailed(`${f} - Not found!`);
        }
    
        if (!lstatSync(f).isDirectory()) {
            return setFailed(`${f} - Is not a directory!`);
        }
    }
    return true;
}

(async () => {
    const releaseId = getInput('release_id', { required: true });
    const uploadUrl = getInput('upload_url', { required: true });

    console.log('Input:');
    console.log(`    release_id: ${releaseId}`);
    console.log(`    upload_url: ${uploadUrl}`);

    const vsTemplatesDir = join(process.env.GITHUB_WORKSPACE, "vs-templates");
    const outputDir = join(process.env.GITHUB_WORKSPACE, ".out");

    if(checkDirectories(vsTemplatesDir, outputDir)) { 
        const { owner, repo } = context.repo;

        const bodyContent = [];
        for (const fName of readdirSync(vsTemplatesDir)) {

            const fDir = join(vsTemplatesDir, fName);

            if (!statSync(fDir).isDirectory()) {
                console.warn(`${fDir} is not a directory and will be skipped!`);
                continue;
            }
            bodyContent.push(`\n## Templates '${fName}'`);
           
            for (const fZipFileName of readdirSync(fDir).filter(f => f.match(/^.*\.zip$/ig))) {
                const fZipFilePath = join(fDir, fZipFileName)
                try {
                    const { 
                        data: { browser_download_url: browserDownloadUrl }
                    } = await octokit.repos.uploadReleaseAsset({
                        owner,
                        repo,
                        release_id: releaseId,
                        url: uploadUrl,
                        headers: {
                            'content-type': 'application/zip',
                            'content-length': statSync(fZipFilePath).size,
                        },
                        name: fZipFileName,
                        data: createReadStream(fZipFilePath)
                    });

                    bodyContent.push(`\n- [${fZipFileName}](${browserDownloadUrl})`);
                } catch (err) {
                    return setFailed(err.message);
                }
            }      
        }

        try {
            const vsixFilePath = join(outputDir, "Exomia.Templates.vsix");
            const { 
                data: { browser_download_url: browserDownloadUrl }
            } = await octokit.repos.uploadReleaseAsset({
                owner,
                repo,
                release_id: releaseId,
                url: uploadUrl,
                headers: {
                    'content-type': 'application/zip',
                    'content-length': statSync(vsixFilePath).size,
                },
                name: "Exomia.Templates.vsix",
                data: createReadStream(vsixFilePath)
            });

            await octokit.repos.updateRelease({
                owner,
                repo,
                release_id: releaseId,
                body: `## VSIX (includes all templates)\n- [Exomia.Templates.vsix](${browserDownloadUrl})\n${bodyContent.join('')}`,
            });
        }
        catch (err) {
            return setFailed(err.message);
        }  
    }
})();