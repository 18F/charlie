# Validating the configuration

When making changes to [`slack-github-issues.json`](slack-github-issues.json),
you may use the [web-based `hubot-slack-github-issues` configuration
validator](https://pages.18f.gov/hubot-slack-github-issues/) to check your
work.

More generally, when making changes to the configuration in this directory, be
sure to run the following before pushing your changes:

```sh
$ npm install
$ npm run validate-config
```
