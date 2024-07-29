const { Cluster } = require('puppeteer-cluster');
const fs = require("fs");
const { executablePath } = require("puppeteer");
const { Client } = require('pg');

// const mysql = require("mysql2");
// const con = mysql.createConnection({
//     host: "localhost",
//     user: "root",
//     password: "Iam_thebest1",
//     database: "yahyaDB",
//     multipleStatements: true,
//     // workerCreationDelay: 100
// });

const conString = "postgresql://root:6RHocZ4oxHzeJBPLQoCd5u5G0IwZRjM2@dpg-cqfs4j9u0jms7387eiu0-a.oregon-postgres.render.com/yahyadb?ssl=true";
var client = new Client(conString);
client.connect();

var values = [];
var colors = [];



// FETCH NAMES OF ASSETS

// con.connect(async (err) => {
//     if (err) throw err;
//     con.query("SELECT asset FROM asset_values", async function (err, result, fields) {
//         if (err) throw err;
//         await result.forEach(async (res) => { values.push([res.asset]); colors.push([res.asset]); });
//     });
// });

(async () => {
    var query = await client.query("SELECT asset FROM asset_values");
    query.rows.forEach(row => {
        values.push([row.asset]); colors.push([row.asset]);
    })
})();

(async () => {

    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: 100,
        timeout: 300000,

        // monitor: true,
        puppeteerOptions: {
            // workerCreationDelay: 100,
            headless: true,
            defaultViewport: false,
            // userDataDir: "./tmp",
            ignoreHTTPSErrors: true,
            executablePath: executablePath(),
            defaultViewport: null,
            ignoreDefaultArgs: ["--disable-extensions"],
            args: [
                "--no-sandbox",
                "--disable-gpu",
                "--enable-webgl",
                "--window-size=800,800",
            ],
        },
    });
    // ERROR
    cluster.on("taskerror", (err, data) => {
        console.log(`Error: ${err.message}`);
    });
    // PAGE TASK
    await cluster.task(async ({ page, data: url, worker }) => {

        // 1 ---- check cookies
        const previousSession = fs.existsSync("cookies.json");
        if (previousSession) {
            // If file exist load the cookies
            const cookiesString = fs.readFileSync("cookies.json");
            const parsedCookies = JSON.parse(cookiesString);
            if (parsedCookies.length !== 0) {
                for (let cookie of parsedCookies) {
                    await page.setCookie(cookie);
                }
                console.log("Session has been loaded in the browser");
            }
        }
        await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36");
        //

        // 2- GO to page
        await page.goto(url, { timeout: 0, waitUntil: "domcontentloaded" });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log("it worked ...");
        // 3- side button
        await page.waitForFunction(() => {
            side = document.querySelector('button[aria-label="Object Tree and Data Window"]');
            return side !== null;
        }, { timeout: 60000 });
        let side_pressed = await page.$eval('button[aria-label="Object Tree and Data Window"]', el => el.getAttribute("aria-pressed"));
        if (side_pressed === false) {
            await page.waitForSelector('button[aria-label="Object Tree and Data Window"]', { timeout: 60000 });
            await page.click('button[aria-label="Object Tree and Data Window"]');
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 2- data window
        await page.waitForFunction(() => {
            datawindow = document.querySelector('#data-window');
            return datawindow !== null;
        }, { timeout: 60000 });
        let dataWindow_pressed = await page.$eval('#data-window', el => el.getAttribute("aria-selected"));
        if (dataWindow_pressed !== true) {
            await page.evaluate(() => document.getElementById('data-window').click());
            console.log(dataWindow_pressed);
        }
        // times: 1m -- 1w
        const times = await page.$$('button[role="radio"].button-S_1OCXUK');

        let asset_value = [];
        let asset_color = [];
        const asset = values[worker.id][0];
        // 1- CLICK SEARCH
        await page.evaluate(() => document.getElementById('header-toolbar-symbol-search').click());
        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log(worker.id + "- " + asset);
        // 2- TYPE IN SEARCH (EX:"BTC")
        await page.type('input[placeholder="Search"]', asset, { delay: 100 });
        // 3- CLICK THE first result of ASSET
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const firstresult = await page.waitForSelector('span em', { timeout: 0 });
        const firstResult_Value = await firstresult.evaluate(el => el.textContent);
        // await page.evaluate((el) => el.click(), times[i]);

        if (firstResult_Value.includes(asset)) {
            console.log(worker.id + "-2 " + asset);

            // await page.waitForSelector('span em', { timeout: 60000 });
            await page.click('span em');
            console.log("clicked on :" + asset);
            await new Promise((resolve) => setTimeout(resolve, 4000));
            // 4- FETCH DATA of the asset
            // ----- FOR LOOP 2
            for (let i = 0; i <= 13; i++) {
                // click: TIME
                await page.evaluate((el) => el.click(), times[i]);
                const time = await page.evaluate((el) => el.textContent, times[i]);
                console.log(time);

                await new Promise((resolve) => setTimeout(resolve, 5000));

                // CLOSE
                // await page.waitForSelector("div.values-_gbYDtbd > div:nth-child(4) > div:nth-child(2) > span");
                await page.waitForFunction(() => {
                    text = document.querySelectorAll("div.values-_gbYDtbd > div:nth-child(4) > div:nth-child(2) > span").textContent;
                    return text !== '' || text !== null;
                }, { timeout: 10000 });
                let close = parseFloat((await page.evaluate(
                    () =>
                        document.querySelector(
                            "div.values-_gbYDtbd > div:nth-child(4) > div:nth-child(2) > span"
                        ).textContent
                )).replace(/,/, "."));
                // RED
                // await page.waitForSelector('span[style="color: rgb(255, 82, 82);"]');
                let red = parseFloat((await page.evaluate(
                    () =>
                        document.querySelector(
                            'span[style="color: rgb(255, 82, 82);"]'
                        ).textContent
                )).replace(/,/, "."));
                // BLUE
                let blue = parseFloat((await page.evaluate(
                    () =>
                        document.querySelector('span[style="color: rgb(0, 188, 212);"]').textContent
                )).replace(/,/, "."));
                // -----------
                console.log(close);
                console.log(red);
                console.log(blue);
                // -----------
                values[worker.id].push(close);
                if (close > red)
                    colors[worker.id].push(1);
                else if (close < blue)
                    colors[worker.id].push(-1);
                else
                    colors[worker.id].push(0);
            }
        }

    });

    for (const asset in values) {
        cluster.queue('https://www.tradingview.com/chart/1ltdNynj/');
    }

    await cluster.idle();
    await cluster.close();
})().finally(() => {
    console.log("finally\nvalues: \n", values, "colors: \n", colors);

    let queries = "";
    values.forEach((value) => {
        queries += `UPDATE asset_values SET "1m" = ` + value[1] + ` , "2m" = ` + value[2] + ` , "3m" = ` + value[3] + ` , "5m" = ` + value[4] + ` , "10m" = ` + value[5] + ` , "15m" = ` + value[6] + ` , "30m" = ` + value[7] + ` , "45m" = ` + value[8] + ` , "1h" = ` + value[9] + ` , "2h" = ` + value[10] + ` , "3h" = ` + value[11] + ` , "4h" = ` + value[12] + ` , "1d" = ` + value[13] + ` , "1w" = ` + value[14] + ` WHERE asset = '` + value[0] + `'; `;
    });
    colors.forEach((value) => {
        queries += `UPDATE asset_colors SET "1m" = ` + value[1] + ` , "2m" = ` + value[2] + ` , "3m" = ` + value[3] + ` , "5m" = ` + value[4] + ` , "10m" = ` + value[5] + ` , "15m" = ` + value[6] + ` , "30m" = ` + value[7] + ` , "45m" = ` + value[8] + ` , "1h" = ` + value[9] + ` , "2h" = ` + value[10] + ` , "3h" = ` + value[11] + ` , "4h" = ` + value[12] + ` , "1d" = ` + value[13] + ` , "1w" = ` + value[14] + ` WHERE asset = '` + value[0] + `'; `;
    });
    //
    // con.connect(async (err) => {
    //     if (err) throw err;
    //     con.query(queries, function (err, result) {
    //         if (err) throw err;
    //         console.log("table updated successfully");
    //     });
    // });

    (async () => {
        await client.query(queries);
        await client.end();
        console.log("table updated successfully");
    })();


});