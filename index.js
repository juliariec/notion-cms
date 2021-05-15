require("dotenv").config();
// https://github.com/makenotion/notion-sdk-js
const { Client } = require("@notionhq/client");
const fs = require("fs"),
  util = require("util"),
  path = require("path"),
  simpleGit = require("simple-git");

// Initializations
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});
const gitOptions = {
  baseDir: process.env.BLOG_DIRECTORY,
};
const git = simpleGit(gitOptions);
const logFile = fs.createWriteStream(__dirname + "/error.log", { flags: "a" });

// Settings
const runEveryXMin = 60;
const dbFilter = {
  property: "Status",
  select: {
    equals: "Publish",
  },
};
const dbUpdate = {
  Status: {
    select: { name: "Published" },
  },
};

main();
setInterval(main, runEveryXMin * 60000);

/**
 * Main function: saves posts from Notion in Markdown, pushes to Github.
 */
async function main() {
  const result = await savePosts();
  let upload = true;
  if (result.success && result.posts.length > 0) {
    for (post of result.posts) {
      try {
        git
          .add(path.join(process.env.POSTS_DIRECTORY, post.name))
          .then(git.commit(`Posted ${post.name}`))
          .then(updatePost(post));
      } catch (error) {
        handleError(error);
        upload = false;
      }
    }
  } else {
    upload = false;
  }

  if (upload) git.push();
}

/**
 * Saves newly published posts from Notion into post directory for Gatsby site.
 * @returns Status object with properties: success (bool) and posts (list of post names)
 */
async function savePosts() {
  let status = {
    success: true,
    posts: [],
  };

  try {
    let posts = await getPostsToPublish();

    for (const post of posts) {
      let name = await createMarkdownFile(post);
      status.posts.push({ id: post.id, name });
    }
  } catch (error) {
    status.success = false;
    handleError(error);
  }

  return status;
}

/**
 * Get posts to publish, including all relevant properties.
 */
async function getPostsToPublish() {
  // Pulls the posts in my blog database checked Publish
  const response = await notion.databases
    .query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: dbFilter,
    })
    .catch((error) => handleError(error));
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
  const filePath = path.join(
    process.env.BLOG_DIRECTORY,
    process.env.POSTS_DIRECTORY,
    fileName
  );
  fs.writeFile(filePath, text, function err(e) {
    if (e) throw e;
  });

  return fileName;
}

/**
 * Updates the status of the post.
 * @param {Object} post  Post to update.
 */
async function updatePost(post) {
  await notion.pages
    .update({
      page_id: post.id,
      properties: {
        dbUpdate,
      },
    })
    .catch((error) => handleError(error));
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

/**
 * Logs error to file.
 * @param {Error} error Error to log
 */
function handleError(error) {
  let date = new Date();
  logFile.write(util.format(date.toUTCString() + error.stack) + "\n\n");
}
