require("dotenv").config();
const { Client } = require("@notionhq/client");

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

getPostsToPublish();

async function getPostsToPublish() {
  const databaseId = process.env.DATABASE_ID;
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "Publish",
      checkbox: {
        equals: true,
      },
    },
  });
  const posts = response.results;

  for (const post of posts) {
    console.log(post.properties.Name.title[0].plain_text);
  }
}
