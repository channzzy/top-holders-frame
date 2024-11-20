import { init, fetchQuery } from "@airstack/node";
import { NextRequest, NextResponse } from "next/server";
import { gql, GraphQLClient } from "graphql-request";
import fs from "fs/promises"; // For reading JSON files
import path from 'path';

const apiKey = process.env.AIRSTACK_API_KEY;
if (!apiKey) {
  throw new Error("AIRSTACK_API_KEY is not defined");
}
init(apiKey);

const graphQLClient = new GraphQLClient(
  "https://api.studio.thegraph.com/query/23537/moxie_protocol_stats_mainnet/version/latest"
);

const userQuery = `
  query GetUserSocialCapital($userId: String!) {
    Socials(
      input: { filter: { userId: { _eq: $userId } }, blockchain: ethereum }
    ) {
      Social {
        profileName
        profileDisplayName
        profileImageContentValue {
          image {
            extraSmall
          }
        }
      }
    }
  }
`;

const query = gql`
  query MyQuery($symbol: String) {
    subjectTokens(where: { symbol: $symbol }) {
      portfolio(where: { balance_gt: 0 }) {
        balance
        user {
          id
        }
      }
    }
  }
`;

interface Portfolio {
  balance: string;
  user: {
    id: string;
  };
}

interface GraphQLResponse {
  subjectTokens: {
    portfolio: Portfolio[]; // Array of portfolio data
  }[];
}

interface MoxieResolve {
  profileName: string;
  fid: number;
  address: string;
  type: string;
}

interface AirstackSocial {
  profileName: string;
  profileDisplayName: string;
  profileImageContentValue: {
    image: {
      extraSmall: string;
    };
  };
}

const formatBalance = (balance: string) => {
    let balanceFormat = parseFloat(balance) / 1e18;
    return balanceFormat.toFixed(3);
  };

  function truncateProfileName(profileName:string, maxLength = 10) {
    if (profileName.length > maxLength) {
      return profileName.slice(0, maxLength) + "...";
    }
    return profileName;
  }
  

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId parameter is required" },
      { status: 400 }
    );
  }
  const filePath = path.join(process.cwd(), 'data', 'moxie_resolve.json');

  try {
    const variable = { symbol: `fid:${userId}` };

    // Request data from the GraphQL API
    const data = await graphQLClient.request<GraphQLResponse>(query, variable);

    // Ensure subjectTokens exists and is not empty
    const subjectTokens = data.subjectTokens?.[0]?.portfolio;

    if (!subjectTokens || subjectTokens.length === 0) {
      return NextResponse.json(null);
    }

    // Sort portfolio by balance in descending order
    const sortedPortfolio = subjectTokens.sort((a, b) =>
      Number(BigInt(b.balance) - BigInt(a.balance))
    );

    // Read data from moxie_resolve.json
    const moxieResolveData: MoxieResolve[] = JSON.parse(
      await fs.readFile(filePath, "utf-8")
    );

    if (!moxieResolveData || moxieResolveData.length === 0) {
      return NextResponse.json({ error: "Moxie resolve data is empty." }, { status: 500 });
    }

    // Filter the portfolio with only addresses found in moxie_resolve.json
    const filteredPortfolio = sortedPortfolio?.filter((portfolioItem) =>
      moxieResolveData.some(
        (item) => item.address.toLowerCase() === portfolioItem.user.id.toLowerCase()
      )
    );

    if (!filteredPortfolio || filteredPortfolio.length === 0) {
      return NextResponse.json({ error: "No valid portfolio data found." }, { status: 404 });
    }

    // Group the portfolio data by fid and sum the balances
    const groupedPortfolio = filteredPortfolio.reduce((acc, portfolioItem) => {
      const userDetails = moxieResolveData.find(
        (item) => item.address.toLowerCase() === portfolioItem.user.id.toLowerCase()
      );

      if (userDetails) {
        const existingEntry = acc.find((entry) => entry.fid === userDetails.fid);

        // If entry exists, sum the balance, otherwise add new entry
        if (existingEntry) {
          existingEntry.balance = (parseFloat(existingEntry.balance) + parseFloat(portfolioItem.balance)).toString();
        } else {
          acc.push({
            ...portfolioItem,
            fid: userDetails.fid,
            details: userDetails,
          });
        }
      }

      return acc;
    }, [] as any[]);

    // Sort grouped portfolio by balance in descending order after summing
    const sortedGroupedPortfolio = groupedPortfolio.sort((a, b) =>
      parseFloat(b.balance) - parseFloat(a.balance) // Sort by balance (largest to smallest)
    );

    // Add details from moxie_resolve.json to each portfolio item
    const portfolioWithDetails = await Promise.all(
        sortedGroupedPortfolio.map(async (portfolioItem) => {
          const userDetails = moxieResolveData.find(
            (item) => item.fid === portfolioItem.fid
          );
      
          if (userDetails) {
            const airstackResponse = await fetchQuery(userQuery, { userId: userDetails.fid.toString() });
      
            if (airstackResponse?.data?.Socials.Social?.length > 0) {
              const airstackSocial = airstackResponse.data.Socials.Social[0] as AirstackSocial;
      
              // Apply truncation to profileName
              const truncatedProfileName = truncateProfileName(airstackSocial.profileName);
      
              return {
                ...portfolioItem,
                balance: formatBalance(portfolioItem.balance),
                details: {
                  ...userDetails,
                  ...airstackSocial,
                  profileName: truncatedProfileName, // Update profileName with truncated value
                  shareName: airstackSocial.profileName, // Update profileName with truncated value
                },
              };
            } else {
              console.warn(`No social data found for userId: ${userDetails.fid}`);
            }
          }
        })
      );
      

    return NextResponse.json(portfolioWithDetails);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed to fetch data." }, { status: 500 });
  }
}
