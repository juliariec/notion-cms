# notion-cms
Script to use Notion as CMS for Gatsby website.

## How it works
The script
1. uses the newly released Notion API to retrieve posts from a Notion database with the status "Publish",
2. converts the posts to Markdown (as best it can) and saves them into the local blog directory,
3. adds and commits all new posts to GitHub and then pushes them to their repository,
4. and updates their status in Notion to "Published".

Since my Gatsby site is automatically deployed through GitHub, Netlify will automatically rebuild the site with the new posts.

I've also added the functionality to run it as a Windows service so it all happens automatically.
