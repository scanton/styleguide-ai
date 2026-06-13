// Slugs of articles hidden from the /articles page.
// These are community-challenge announcement posts, not art history content.
// They stay in the DB (RSS may re-insert them) but are excluded from the browse page.
// They remain visible in global search results.
export const ARTICLES_BLOCKLIST = new Set([
  "themecember-2-57f044814864",
  "noventure-6673ae1354d5",
  "supertember-1a308bec995a",
  "awwgust-cute-and-adorable-summer-b69309c7adb1",
  "julibrary-ai-art-challenges-inspired-by-book-genres-e7c587579cc0",
  "junique-e8ac60fbf441",
  "april-tools-626873109fba",
  "%EF%B8%8F-announcing-themecember-bcc355649ce2",
  "teddybeargpt-using-chatgpt-to-create-art-quickie-cd82701e43ea",
  "omg-its-fingervember-%EF%B8%8F-cf59ff067b92",
  "there-are-links-in-the-article-to-the-ai-platform-used-to-create-all-of-the-examples-18012de4e286",
]);
