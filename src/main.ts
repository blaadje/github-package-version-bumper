import * as github from '@actions/github'
import * as core from '@actions/core'

async function run(): Promise<void> {
  const myToken = core.getInput('github-token')

  const octokit = new github.GitHub(myToken)

  const tags = await octokit.repos.listTags({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo
  })

  console.log(tags)
}

run()
