import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-core";
import chromium from "chrome-aws-lambda";

let date = new Date();
let scrapedData;
export async function GET() {
  let browser = null;

  try {
    // Set up Puppeteer options.
    const options = {
      args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    };

    // Launch the browser.
    browser = await puppeteer.launch(options);

    const page = await browser.newPage();
    await page.goto("https://beyblade.takaratomy.co.jp/beyblade-x/lineup/");

    // Wait for the selector to appear in page
    await page.waitForSelector("ul.container.lineupList");

    const beybladeData = await page.evaluate(() => {
      const productList = Array.from(
        document.querySelectorAll("ul.container.lineupList li")
      );

      return productList
        .map((product) => {
          const titleElement = product.querySelector("b");
          const priceElement = product.querySelector("i");
          const linkElement = product.querySelector("a");

          let title = titleElement ? titleElement.innerText : null;
          let price = priceElement ? priceElement.innerText : null;
          let link = linkElement ? linkElement.href : null;

          let blade = null;
          let ratchet = null;
          let bit = null;

          if (title) {
            let regex = /(.*?)([ァ-ヶー]+)(\d+-\d+)(.+)/;
            let parts = title.match(regex);
            if (parts) {
              blade = parts[2];
              ratchet = parts[3];
              bit = parts[4];
            }
          }

          return {
            title: title,
            price: price,
            link: link,
            parts: {
              blade: blade,
              ratchet: ratchet,
              bit: bit,
            },
          };
        })
        .filter(
          (product) =>
            product.parts.blade && product.parts.ratchet && product.parts.bit
        );
    });

    scrapedData = {
      updateAt: date.toISOString(),
      beybladeData: beybladeData,
    };
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to launch the browser." });
  } finally {
    // Make sure the browser is properly closed before returning.
    if (browser) {
      await browser.close();
    }
  }

  const filePath = path.resolve(process.cwd(), "beybladeData.json");
  fs.writeFileSync(filePath, JSON.stringify(scrapedData, null, 2));

  return NextResponse.json(scrapedData);
}
