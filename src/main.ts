import * as github from '@actions/github'
import * as core from '@actions/core'

async function run(): Promise<void> {
  const myToken = core.getInput('github-token')

  const octokit = new github.GitHub(myToken)

  const foo = await octokit.repos.listBranches({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo
  })

  console.log(foo)
}

run()
