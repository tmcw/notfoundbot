Wikipedia has a [pretty advanced system for preventing and checking linkrot](https://en.wikipedia.org/wiki/Wikipedia:Link_rot):

- [DeadLinkChecker](https://github.com/wikimedia/DeadlinkChecker/blob/master/src/CheckIfDead.php)
  for detecting dead pages. Supports a bunch of protocols that this won't attempt to - linking to FTP
  etc isn't very common on blogs anymore.
- [Internet Archive Bot](https://github.com/internetarchive/internetarchivebot/blob/master/app/src/Core/parse.php)
  relinks those to the Internet Archive.
