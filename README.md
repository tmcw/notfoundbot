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
