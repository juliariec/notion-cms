require("dotenv").config();
// https://github.com/makenotion/notion-sdk-js
const { Client } = require("@notionhq/client");
const fs = require("fs"),
  path = require("path"),
  dir = path.join(process.cwd(), "posts");

// Initializes Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

main();

async function main() {
  let posts = await getPostsToPublish();
  for (const post of posts) {
    await convertPostToMarkdown(post);
  }
}

/**
 * Get posts to publish, including all relevant properties.
 */
async function getPostsToPublish() {
  const databaseId = process.env.DATABASE_ID;
  // Pulls the posts in my blog database checked Publish
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "Publish",
      checkbox: {
        equals: true,
      },
    },
  });
  const full_posts = response.results;

  let posts = [];

  // Pulls relevant properties of the posts
  for (const post of full_posts) {
    posts.push({
      title: post.properties.Name.title[0].plain_text,
      id: post.id,
      published: post.last_edited_time,
      description: post.properties.Description.rich_text[0].plain_text,
      slug: post.properties.Slug.rich_text[0].plain_text,
      category: post.properties.Category.select.name,
      tags:
        post.properties.Tags.multi_select.length > 1
          ? post.properties.Tags.multi_select.map((tag) => tag.name)
          : [],
    });
  }

  return posts;
}

/**
 * Converts post in Notion into Markdown format.
 * @param {Object} post Post to convert to Markdown.
 */
async function convertPostToMarkdown(post) {
  let text =
    `---\ntitle: "${post.title}"\n` +
    `date: "${post.published.substring(0, 10)}"\n` +
    `description: "${post.description}"\n` +
    `tag: "${post.category.toLowerCase()}"\n` +
    `type: "post"\n---`;

  const page_blocks = await notion.blocks.children.list({
    block_id: post.id,
  });
  //console.log(page_blocks);

  const filePath = path.join(dir, `${post.slug}.md`);
  fs.writeFile(filePath, text, function err() {
    if (err) return console.log(err);
    console.log("success");
  });
}
