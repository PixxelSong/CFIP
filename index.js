const { spawn, child_process } = require('child_process');
const fs = require("fs");
const fspromise = require('fs').promises;

const { parse } = require("csv-parse");
const { stringify } = require("csv-stringify");
const util = require('util');


function git() {
    child_process.exec('git add.', (error, stdout, stderr) => {
        if (error) {
            console.error(`执行 git add 时出错: ${error}`);
            return;
        }
        console.log('git add 执行成功');
    
        // 执行 git commit -m "提交信息"
        child_process.exec('git commit -m "自动提交"', (error, stdout, stderr) => {
            if (error) {
                console.error(`执行 git commit 时出错: ${error}`);
                return;
            }
            console.log('git commit 执行成功');
    
            // 执行 git push
            child_process.exec('git push', (error, stdout, stderr) => {
                if (error) {
                    console.error(`执行 git push 时出错: ${error}`);
                    return;
                }
                console.log('git push 执行成功');
            });
        });
    });
}


async function resultFile() {
    const fsOpen = util.promisify(fs.open);
    const fsTruncate = util.promisify(fs.ftruncate);
    const fsClose = util.promisify(fs.close);

    const fd = await fsOpen("./iptest.csv", 'r+');
    const writableStream = fs.createWriteStream("./iptest.csv");

    await fsTruncate(fd, 0);
    await fsClose(fd);
    console.log('文件内容已清空。');


    fs.createReadStream("./result.csv")
        .pipe(parse({ delimiter: ",", from_line: 2 }))
        .on("data", function (row) {
            console.log(row);
            
            const ip = row[0];
            const resultIp = ip.indexOf(':') == -1 ? ip : ('[' + ip + ']');

            const str = resultIp + ":443" + "#本地测速" + "\n";
            fs.appendFile('./iptest.csv', str, (err) => { })
        })
        .on("end", function () {
            console.log("finished");
            git();
        })
        .on("error", function (error) {
            console.log(error.message);
            git();
        });
}

const cfstCmd = './CloudflareST';
const cfstCmdParams = '-url https://speed.songxunlei.uk/ -t 8 -dn 10 -sl 8';
const cfstSpawn = spawn(cfstCmd, cfstCmdParams.split(' '));


cfstSpawn.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
});

cfstSpawn.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
});

cfstSpawn.on('close', (code) => {
    console.log(`child process exited with code ${code}`);

    fs.readFile('./result.csv', async (err, data) => {
        if (err) {
            console.error(err)
            return
        }
        await resultFile()
    })
});
