import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  const filePath = path.resolve("./", "beybladeData.json");
  const fileContents = fs.readFileSync(filePath, "utf8");

  return NextResponse.json(fileContents);
}
