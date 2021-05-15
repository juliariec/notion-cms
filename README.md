# notion-cms
Script to use Notion as CMS for Gatsby website.

## Description
The script
1. uses the newly released [Notion API](https://developers.notion.com/docs/getting-started) to retrieve posts from a Notion database with the status "Publish",
2. converts the posts to Markdown (as best it can, see "Limitations") and saves them into the local blog directory,
3. adds and commits all new posts to GitHub and then pushes them to their repository,
4. and updates their statuses in Notion to "Published".

Since my Gatsby site is deployed through GitHub and Netlify, the site is then rebuilt with the new posts.

I set the script on a timer and then installed it as a Windows service so that it always runs in the background.

## Setup and installation
1. Clone this repository on your local machine and run `npm install` to install all relevant modules.
2. If you want to use it as a Windows service, also run `npm link node-windows`.
3. Create an `.env` file with the following variables:
  - `NOTION_TOKEN`: Internal integration token provided by Notion 
  - `NOTION_DATABASE_ID`: ID for database to query for posts - you can use [this function](https://developers.notion.com/reference/get-databases) to find it
  - `BLOG_DIRECTORY`: Path to local GitHub repository for your blog - this is where Git commands will run from
  - `POSTS_DIRECTORY`: Path from blog directory to wherever posts should be saved - this should just be something like `src\posts`
4. Review the following settings in `index.js`:
  - `runEveryXMin`: How frequently the script should run, in minutes
  - `dbFilter`: What Notion properties the script should use to filter for new posts - see [here](https://developers.notion.com/reference/post-database-query#post-database-query-filter)
  - `dbUpdate`: What Notion properties the script should update upon success - see [here](https://developers.notion.com/reference/patch-page)
  - Other to note: the script pulls these properties from the Notion page, and you'll need to change this if you structure your posts differently: Description (text), Slug (text), Category (select), Tags (multi-select)
5. To run the script, type `npm start`.
6. To set it up as a serivce, type `node service.js`.


## Limitations
Right now, the Notion API has no support for quotes or for codeblocks, and this script has no support for numbered lists. 
