import { Button } from "frames.js/next";
import { frames } from "./frames";
import { appURL, formatNumber } from "../utils";
import { parse } from "path";
import fs from 'fs';


interface State {
  lastFid?: string;
}

const frameHandler = frames(async (ctx) => {
  interface UserData {
    name: string;
    username: string;
    fid: string;
    profileDisplayName: string;
    profileImageUrl: string;
    fnames:string;
  }

  interface HolderData {
    balance: string; // changed to number
    address: string;
    profileName: string;
    fid: number; // changed to number
    profileImageUrl: string; // changed to profileImageUrl
    shareList:string,
  }
  

  let userData: UserData | null = null;
  let holderData: HolderData[] = [];
  let moxiePrice: number | null = null;

  let error: string | null = null;
  let isLoading = false;

  const fetchUserData = async (fid: string) => {
    isLoading = true;
    try {
      const airstackUrl = `${appURL()}/api/farscore?userId=${encodeURIComponent(
        fid
      )}`;
      const airstackResponse = await fetch(airstackUrl);
      if (!airstackResponse.ok) {
        throw new Error(
          `Airstack HTTP error! status: ${airstackResponse.status}`
        );
      }
      const airstackData = await airstackResponse.json();

      if (
        airstackData.userData.Socials.Social &&
        airstackData.userData.Socials.Social.length > 0
      ) {
        const social = airstackData.userData.Socials.Social[0];
        userData = {
          name: social.profileDisplayName || social.profileName || "Unknown",
          username: social.profileName || "unknown",
          fid: social.userId || "N/A",
          profileDisplayName: social.profileDisplayName || "N/A",
          fnames: social.fnames || "N/A",
          profileImageUrl:
            social.profileImageContentValue?.image?.extraSmall ||
            social.profileImage ||
            "",
        };
      } else {
        throw new Error("No user data found");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      error = (err as Error).message;
    } finally {
      isLoading = false;
    }
  };
  
  const fetchHolderData = async (fid: string) => {
    try {
      const holderUrl = `${appURL()}/api/list-holder?userId=${encodeURIComponent(fid)}`;
      const holderResponse = await fetch(holderUrl);
  
      if (!holderResponse.ok) {
        throw new Error(`Airstack HTTP error! status: ${holderResponse.status}`);
      }
  
      const holderDataApi = await holderResponse.json();
  
      // Ensure the holderData is correctly typed as an array of HolderData
      if (!holderDataApi || !Array.isArray(holderDataApi)) {
        // Return an empty array if the data is not valid
        return [];
      }
  
      // Map the data into the required format
      const holderDataList: HolderData[] = holderDataApi.map((holder: any) => {
        // Ambil hanya 6 digit pertama dari balance
        const shareList = "@" + holder.details.shareName + " (" + holder.balance + " FT " + ")";
        return {
          balance: holder.balance, // Balance yang sudah diformat
          address: holder.user.id,
          profileName: holder.details.profileName,
          fid: holder.details.fid, // changed to number
          profileImageUrl: holder.details.profileImageContentValue.image.extraSmall, // changed to profileImageUrl
          shareList: shareList,
        };
      });
  
      const limitedHodlerData = holderDataList.slice(0, 8);
      holderData = limitedHodlerData;
      // console.log(holderData);
  
      return limitedHodlerData;
    } catch (error) {
      console.error('Error fetching holder data:', error);
      return []; // Return an empty array if there's an error
    }
  };

  const extractFid = (url: string): string | null => {
    try {
      const parsedUrl = new URL(url);
      let fid = parsedUrl.searchParams.get("userfid");

      console.log("Extracted FID from URL:", fid);
      return fid;
    } catch (e) {
      console.error("Error parsing URL:", e);
      return null;
    }
  };

  let fid: string | null = null;

  if (ctx.message?.requesterFid) {
    fid = ctx.message.requesterFid.toString();
    console.log("Using requester FID:", fid);
  } else if (ctx.url) {
    fid = extractFid(ctx.url.toString());
    console.log("Extracted FID from URL:", fid);
  } else {
    console.log("No ctx.url available");
  }

  if (!fid && (ctx.state as State)?.lastFid) {
    fid = (ctx.state as State).lastFid ?? null;
    console.log("Using FID from state:", fid);
  }

  console.log("Final FID used:", fid);

  const shouldFetchData =
    fid && (!userData || (userData as UserData).fid !== fid);

  if (shouldFetchData && fid) {
    await Promise.all([fetchUserData(fid),fetchHolderData(fid)]);
  }

  const SplashScreen = () => (
    <div tw="flex flex-col w-full h-full"
      style={{
        backgroundImage: `url(${process.env.APP_URL}thumbnail.png)`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: "100% 100%"
      }}>
    </div>
  );

  const ScoreScreen = () => {
    let formattedDateUTC =
      new Date().toISOString().replace("T", " ").split(".")[0] + " UTC";

      const backgroundImageUrl = !holderData || holderData.length <= 0
    ? `${process.env.APP_URL}bg-error.png` // Gambar error jika tidak ada data
    : `${process.env.APP_URL}background-api.png`; // Gambar default jika ada data

      const fnames = !holderData || holderData.length <= 0
    ? `` // Gambar error jika tidak ada data
    : `${userData?.fnames} FAN TOKEN`; // Gambar default jika ada data
  
    return (
      <div
        tw="flex flex-col w-full h-full"
        style={{
          backgroundImage: `url(${backgroundImageUrl})`,
          backgroundRepeat: "no-repeat",
          fontFamily: "Bold",
          backgroundSize: "100% 100%",
        }}
      >
        <div tw="flex flex-col items-center mt-60 text-black" style={{fontFamily: 'Bold'}}>
        <span style={{ textTransform: 'uppercase' }}>
          {fnames}
        </span>
        </div>
  
        {/* Holder Data Section */}
        <div tw="flex flex-wrap justify-between px-20 mt-30 text-black w-full">
          {holderData && holderData.length > 0 ? (
            holderData.map((holder, index) => (
              <div tw="flex flex-col w-1/4 mb-17" key={holder.fid}>
                <div tw="flex flex-col items-center" style={{ color: "#2f1f1a" }}>
                  {/* Profile Image */}
                  <img
                    src={holder.profileImageUrl}
                    alt="Profile"
                    tw="w-[170px] h-[170px] rounded-lg"
                    style={{ objectFit: "cover" }}
                  />
                  {/* Profile Name */}
                  <div tw="flex flex-col items-center" style={{ color: "#2f1f1a", fontFamily: "Semi-Bold" }}>
                    <span tw="text-3xl mt-2">{holder.profileName}</span>
                    <span tw="text-3xl">{holder.balance} FT</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <span></span>
          )}
        </div>
      </div>
    );
  };
  
  
  let shareText = "";
  let list = "";

  if (holderData && holderData.length > 0) {
    const shareListArray = holderData.map((holder, index) => {
      return `${index + 1}. ${holder.shareList}`;
    });
    const list = shareListArray.join("\n");
    shareText = encodeURIComponent(`Top Holders of My Fan Token:\n${list}\nFrame by @chanzy10`);
  } else {
    shareText = encodeURIComponent("Check Top Holders Your Fan Token in Frame by @chanzy10");
  }
  

  const cacheBust = new Date().getTime();
  const fidEncoded = fid ? encodeURIComponent(fid) : "";

  const shareUrl = `https://warpcast.com/~/compose?text=${shareText}&embeds[]=${encodeURIComponent(
    "https://top-holders-frame.vercel.app/" +
      (fid
        ? `?userfid=${fidEncoded}&cache_bust=${cacheBust}`
        : `?cache_bust=${cacheBust}`)
  )}`;

  const checkStatusUrl = `https://top-holders-frame.vercel.app/frames?userfid=${fidEncoded}&cache_bust=${cacheBust}`;

  const buttons = [];

  if (!userData) {
    buttons.push(
      <Button action="post" target={checkStatusUrl}>
        Check Mine
      </Button>,
      <Button action="link" target={shareUrl}>
        Share
      </Button>,
    );
  } else {
    buttons.push(
      <Button action="post" target={checkStatusUrl}>
        Check Mine
      </Button>,
      <Button action="link" target={shareUrl}>
        Share
      </Button>,
    );
  }

  return {
    image: fid && !error ? <ScoreScreen /> : <SplashScreen />,
    buttons: buttons,
    imageOptions: {
      dynamic: true,
      headers: {
        "Cache-Control": "public, immutable, no-transform, max-age=1"
      },
      aspectRatio: "1:1",
    },
  };
});

export const GET = frameHandler;
export const POST = frameHandler;
