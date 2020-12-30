# Linkrot

[![Maintainability](https://api.codeclimate.com/v1/badges/60d76b0ce5d82d6fedbf/maintainability)](https://codeclimate.com/github/tmcw/linkrot/maintainability)

Linkrot is a GitHub Action that helps you automatically maintain the correctness of your
website's outgoing links. It finds links that need fixing and opens pull requests
that fix them.

- [x] Conditionally upgrading HTTP links to HTTPS
- [ ] Alerts for 404 links
- [ ] Fixing some redirect failures

---

Wikipedia has a [pretty advanced system for preventing and checking linkrot](https://en.wikipedia.org/wiki/Wikipedia:Link_rot):

- [DeadLinkChecker](https://github.com/wikimedia/DeadlinkChecker/blob/master/src/CheckIfDead.php)
  for detecting dead pages. Supports a bunch of protocols that this won't attempt to - linking to FTP
  etc isn't very common on blogs anymore.
- [Internet Archive Bot](https://github.com/internetarchive/internetarchivebot/blob/master/app/src/Core/parse.php)
  relinks those to the Internet Archive.

---

As a GitHub Action, the development workflow here can be a little janky.

- https://github.com/actions/toolkit/blob/master/docs/github-package.md#mocking-the-github-context

## Workflow

- If there is an existing PR tagged `linkrot`, exit
- Gather post files and parse them, and then for each unique outlink URL
    - If the URL is not http or https, ignore it
    - If the URL is relative, ignore it
    - If the URL has been checked recently and is in the cache, ignore it
    - If the URL is HTTP, check its HTTPS equivalent.
        - If the HTTPS equivalent exists, upgrade the link to HTTPS
        - Otherwise, check the HTTP link
            - If the HTTP link resolves, ignore it
            - If the HTTP link fails, mark it as an error.
     - If the URL is HTTPS, check to see if it resolves
        - If the link resolves, ignore it
        - If the link fails, mark it as an error

Then, for each link marked as an error:

- Check the Internet Archive to find contemporary archives of each failed URL
    - If an archive exists, replace the link
    - Otherwise, ignore it.
