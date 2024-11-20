import { gql, GraphQLClient } from "graphql-request";
import fs from 'fs';

const graphQLClient = new GraphQLClient(
  "https://api.studio.thegraph.com/query/23537/moxie_protocol_stats_mainnet/version/latest"
);

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

const variable = {
  symbol: "fid:250772",
};

(async () => {
  try {
    const data = await graphQLClient.request(query, variable);
    console.log(data);

    // Simpan data ke dalam file JSON
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
    console.log("Data berhasil disimpan ke data.json");

  } catch (e) {
    console.error("Error:", e);
  }
})();
