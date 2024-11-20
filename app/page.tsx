import { fetchMetadata } from "frames.js/next";
import { appURL } from "./utils";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { userfid?: string };
}) {
  const framesUrl = new URL("/frames", appURL());

  if (searchParams.userfid) {
    framesUrl.searchParams.set("userfid", searchParams.userfid);
    framesUrl.searchParams.set("action", "fetch");
  }

  console.log("Fetching metadata from:", framesUrl.toString());

  const castActionUrl = new URL("/api/cast-action", appURL());

  return {
    title: "Top Holders of My Fan Token By @chanzy10",
    description: "use this for check top holder of your fan token",
    openGraph: {
      title: "Top Holders of My Fan Token By @chanzy10",
      description: "use this for check top holder of your fan token",
      images: [`${framesUrl.origin}/api/og`],
    },
    other: {
      ...(await fetchMetadata(framesUrl)),
      "fc:frame:cast_action:url": castActionUrl.toString(),
    },
  };
}

export default function Page() {
  return <span>Top Holders of My Fan Token Frame By <a href="https://warpcast.com/chanzy10" style={{color: "blue"}}>Chanzy10</a></span>;
}
