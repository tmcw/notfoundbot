# Linkrot

[![Maintainability](https://api.codeclimate.com/v1/badges/60d76b0ce5d82d6fedbf/maintainability)](https://codeclimate.com/github/tmcw/linkrot/maintainability)

Linkrot is a GitHub Action that helps you automatically maintain the correctness of your
website's outgoing links. It finds links that need fixing and opens pull requests
that fix them.

This action is intended for websites and blogs powered by static site generators.

Linkrot does the following fixes:

- Upgrades outgoing HTTP links to HTTPS
- Replaces broken outgoing links with links to the [Wayback Machine](https://web.archive.org/)

By using post dates derived from filenames, Linkrot searches for Wayback Machine archives
of linked resources that are contemporary to the post itself: broken links in a 2011 blog post
will be linked to archives from around that era.

## Features

- Post date detection: supports filename-based dates, YAML & TOML frontmatter

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
