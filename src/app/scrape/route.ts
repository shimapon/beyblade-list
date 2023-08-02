import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-core";
let date = new Date();
const chrome = require("chrome-aws-lambda");

export async function GET() {
  const browser = await puppeteer.launch({
    args: chrome.args,
    executablePath: await chrome.executablePath,
    headless: chrome.headless,
  });
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

  await browser.close();

  // Return the scraped data
  // Save the data to beybladeData.json
  const scrapedData = {
    updateAt: date.toISOString(),
    beybladeData: beybladeData,
  };
  const filePath = path.resolve(process.cwd(), "beybladeData.json");
  fs.writeFileSync(filePath, JSON.stringify(scrapedData, null, 2));

  return NextResponse.json(scrapedData);
}
