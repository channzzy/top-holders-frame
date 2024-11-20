import { NextRequest, NextResponse } from "next/server";

const query = `https://api.coingecko.com/api/v3/simple/price?ids=moxie&vs_currencies=usd`;

export async function GET(req: NextRequest) {
  console.log(`API route called at ${new Date().toISOString()}`);
  console.log(`Full URL: ${req.url}`);

  try {
    console.log(`Fetching Moxie price data from CoinGecko`);

    const moxieResponse = await fetch(query);
    const moxieData = await moxieResponse.json();

    if (moxieData.error) {
      console.error("CoinGecko API error (Moxie price):", moxieData.error);
      return NextResponse.json(
        { error: moxieData.error.message },
        { status: 500 }
      );
    }

    console.log(
      "CoinGecko API response (Moxie price):",
      JSON.stringify(moxieData, null, 2)
    );

    return NextResponse.json({
      moxiePrice: moxieData.moxie.usd,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
