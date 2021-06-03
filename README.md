# notfoundbot

[![Maintainability](https://api.codeclimate.com/v1/badges/1870414e70039aad07f3/maintainability)](https://codeclimate.com/github/tmcw/notfoundbot/maintainability) [![Test Coverage](https://api.codeclimate.com/v1/badges/1870414e70039aad07f3/test_coverage)](https://codeclimate.com/github/tmcw/notfoundbot/test_coverage)

notfoundbot is a GitHub Action that helps you automatically maintain the correctness of your
website's outgoing links. It finds links that need fixing and opens pull requests
that fix them.

This action is intended for websites and blogs powered by static site generators.

notfoundbot does the following fixes:

- Upgrades outgoing HTTP links to HTTPS
- Replaces broken outgoing links with links to the [Wayback Machine](https://web.archive.org/)

By using post dates derived from filenames, notfoundbot searches for Wayback Machine archives
of linked resources that are contemporary to the post itself: broken links in a 2011 blog post
will be linked to archives from around that era.

## Example YAML

```yaml
name: notfoundbot
on:
  schedule:
    - cron: "0 5 * * *"
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Fix links
        uses: tmcw/notfoundbot@v2.0.2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Some websites will return different information for notfoundbot than for a typical user. When false positives become a repetitive issue an exceptions list can be used. The exception list is a space separated list of hosts that will always return an ok status.

```yaml
name: notfoundbot
on:
  schedule:
    - cron: "0 5 * * *"
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Fix links
        uses: tmcw/notfoundbot@v2.0.2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          EXCEPTIONS: www.host.com thisisok.org
```

By default notfoundbot will check `.md` files in the `_posts` directory. You can change this directory:

```yaml
      - name: Fix links
        uses: tmcw/notfoundbot@v2.0.2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          content-folder: custom-content
```

Notes:

- I might forget to update the version on `notfoundbot` here - make sure that it's
  the latest!
- Check out [crontab.guru](https://crontab.guru/#5_*_*_*_*) to customize the
  schedule line, which can run the task more or less often if you want.

## Features

- Post date detection: supports filename-based dates, YAML & TOML frontmatter
- notfoundbot uses [magic-string](https://github.com/rich-harris/magic-string) to
  selectively update links without affecting surrounding markup

## Workflow

- If there is an existing PR tagged `notfoundbot`, exit
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
