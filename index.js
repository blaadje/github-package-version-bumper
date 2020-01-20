const github = require('@actions/github')
const core = require('@actions/core')
const semver = require('semver')

const myToken = core.getInput('github-token')

const octokit = new github.GitHub(myToken)

const settings = {
  owner: github.context.repo.owner,
  repo: github.context.repo.repo
}

const CHANGELOG_ORDER = [
  'feat',
  'fix',
  'perf',
  'test',
  'refactor',
  'chore',
  'docs',
  'revert',
  'other'
]

function bump(previousVersion = '0.0.0', commits = {}) {
  const hasFeat = commits.feat && commits.feat.length > 0
  const bumpType = hasFeat ? 'minor' : 'patch'

  return { bumpType, newVersion: semver.inc(String(previousVersion), bumpType) }
}

async function tags() {
  try {
    const { data } = await octokit.repos.listTags(settings)

    return (data.length && data) || undefined
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function getCommits() {
  try {
    const commits = {}
    const { data } = await octokit.repos.listCommits(settings)

    data.forEach(({ commit }) => {
      const { message } = commit

      if (!message) {
        commits.other = commits.other || []
        commits.other.push(`* ${commit}`)

        return
      }

      let type = message.substring(0, message.indexOf('('))
      type = type === 'prefeat' ? 'feat' : type

      if (!CHANGELOG_ORDER.includes(type)) {
        type = 'other'
      }

      commits[type] = commits[type] || []
      commits[type].push(`* - ${message}`)
    })

    return commits
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function updatePackageJson(newVersion) {
  const path = 'package.json'
  const { data: existingFile } = await octokit.repos.getContents({
    ...settings,
    path
  })

  const file = JSON.parse(
    Buffer.from(existingFile.content, 'base64').toString('utf-8')
  )
  const updatedFile = { ...file, version: newVersion }

  const content = Buffer.from(JSON.stringify(updatedFile, null, 2)).toString(
    'base64'
  )

  try {
    const { data } = await octokit.repos.createOrUpdateFile({
      ...settings,
      path,
      message: `v${newVersion}`,
      sha: existingFile.sha,
      content
    })
    return data.commit.sha
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function run() {
  const fetchedTags = await tags()
  const commits = await getCommits()
  const { newVersion } = bump(fetchedTags, commits)
  const sha = await updatePackageJson(newVersion, commits)
  const { data } = await octokit.git.createTag({
    ...settings,
    tag: `v${newVersion}`,
    message: `v${newVersion}`,
    object: sha,
    type: 'commit'
  })

  await octokit.git.createRef({
    ...settings,
    ref: `refs/tags/v${newVersion}`,
    sha: data.sha
  })
}

run()
