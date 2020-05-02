# linkrot

```
$ yarn global add @tmcw/linkrot

# in jekyll root directory
$ linkrot
```

This is a specialized tool for Jekyll blogs and other blogs that use Markdown for their
posts. It scans all posts, compiles a list of every external link, then checks those external
sites, automatically upgrading HTTP to HTTPS links and interactively fixing redirected
links.

It stores cached results in `.linkrot.json` in the working directory, which can be
checked into Git to speed up future runs.
