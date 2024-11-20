import { createFrames } from "frames.js/next";
import {
  farcasterHubContext,
  warpcastComposerActionState,
} from "frames.js/middleware";

import * as fs from "node:fs/promises";
import * as path from "node:path";

export const frames = createFrames({
  basePath: "/frames",
  debug: process.env.NODE_ENV === "development",
  middleware: [
    farcasterHubContext({
      ...(process.env.NODE_ENV === "production"
        ? {
            hubHttpUrl: "https://hubs.airstack.xyz",
            hubRequestOptions: {
              headers: {
                "x-airstack-hubs": process.env.AIRSTACK_API_KEY as string,
              },
            },
          }
        : {
            hubHttpUrl: "http://localhost:3010/hub",
          }),
    }),
    warpcastComposerActionState(),
  ],
  imageRenderingOptions: async () => {
    const poppinsRegularFont = fs.readFile(
      path.join(path.resolve(process.cwd(), "public"), "Poppins-Medium.ttf")
    );

    const poppinsBold = fs.readFile(
      path.join(path.resolve(process.cwd(), "public"), "Poppins-Bold.ttf")
    );
    
    const [poppinsRegularFontData, poppinsBoldFontData] =
      await Promise.all([poppinsRegularFont,poppinsBold]);
    return {
      imageOptions: {
        dynamic: true,
        headers: {
          "Cache-Control": "public, immutable, no-transform, max-age=1"
        },
        fonts: [
          {
            name: "Regular",
            data: poppinsRegularFontData,
            weight: 400,
          },
          {
            name: "Bold",
            data: poppinsBoldFontData,
            weight: 700,
          },
        ],
      },
    };
  },
});
