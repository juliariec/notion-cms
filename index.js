require("dotenv").config();
// https://github.com/makenotion/notion-sdk-js
const { Client } = require("@notionhq/client");
const fs = require("fs"),
  util = require("util"),
  path = require("path");

// Initializes Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// Registers logFile
let logFile = fs.createWriteStream(__dirname + "/error.log", { flags: "a" });

savePosts();

async function savePosts() {
  let status = {
    success: true,
    posts: [],
  };

  try {
    let posts = await getPostsToPublish();

    for (const post of posts) {
      let name = await createMarkdownFile(post);
      await updatePost(post);
      status.posts.push(name);
    }
  } catch (error) {
    status.success = false;
    let date = new Date();
    logFile.write(util.format(date.toUTCString() + error.stack) + "\n\n");
  }

  return status;
}

/**
 * Get posts to publish, including all relevant properties.
 */
async function getPostsToPublish() {
  // Pulls the posts in my blog database checked Publish
  const response = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID,
    filter: {
      property: "Status",
      select: {
        equals: "Publish",
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
 * @param {Object} post  Post to convert to Markdown.
 */
async function createMarkdownFile(post) {
  let text =
    `---\ntitle: "${post.title}"\n` +
    `date: "${post.published.substring(0, 10)}"\n` +
    `description: "${post.description}"\n` +
    `tag: "${post.category.toLowerCase()}"\n` +
    `type: "post"\n---\n\n`;

  const page_blocks = await notion.blocks.children.list({
    block_id: post.id,
  });

  // Generate text from block
  for (block of page_blocks.results) {
    // Blocks can be: paragraph, heading_1, heading_2, heading_3, or 'unsupported' (quote)

    switch (block.type) {
      case "paragraph":
        text += "\n";
        for (textblock of block.paragraph.text) {
          text += styledText(textblock) + " ";
        }
        text += "\n";
        break;
      case "heading_1":
        text += "\n";
        text += "# " + block.heading_1.text[0].plain_text + "\n";
        break;
      case "heading_2":
        text += "\n";
        text += "## " + block.heading_2.text[0].plain_text + "\n";
        break;
      case "heading_3":
        text += "\n";
        text += "### " + block.heading_3.text[0].plain_text + "\n";
        break;
      case "bulleted_list_item":
        text += " - " + block.bulleted_list_item.text[0].plain_text + "\n";
        break;
      default:
        break;
    }
  }

  // Write text to file
  let fileName = `${post.slug}.md`;
  const filePath = path.join(process.env.POSTS_DIRECTORY, fileName);
  fs.writeFile(filePath, text, function err(e) {
    if (e) throw e;
  });

  return fileName;
}

/**
 * Updates the status of the post to "Published".
 * @param {Object} post  Post to update.
 */
async function updatePost(post) {
  const response = await notion.pages.update({
    page_id: post.id,
    properties: {
      Status: {
        select: { name: "Published" },
      },
    },
  });
}

/**
 * Creates Markdown-styled text from Notion provided text object.
 * @param {Object} obj  Text object to style.
 * @returns {string}  Styled text
 */
function styledText(obj) {
  let content = obj.text.content.trim();
  let url = obj.text.link !== null ? obj.text.link.url : null;
  let annots = obj.annotations;
  // Manually handle quotes using own notation
  let quote = content.substring(0, 1) === "^";

  if (url) {
    content = `[${content}](${url})`;
  }

  if (annots.bold) {
    content = `**${content}**`;
  }

  if (annots.italic) {
    content = `*${content}*`;
  }

  if (annots.strikethrough) {
    content = `~~${content}~~`;
  }

  if (annots.code) {
    content = "`" + content + "`";
  }

  if (quote) {
    content = "> " + content.substring(2);
  }

  return content;
}
