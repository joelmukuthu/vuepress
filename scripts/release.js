/**

 How to do a release:

 1. Make sure you have publish access for all packages:
 - You must be in the VuePress team in the npm @vuepress organization
 - Make sure you DO NOT have npm per-publish 2-factor / OTP enabled, as it
 does not work with Lerna (which we use for batch publishing).

 2. Run `yarn release`, follow prompts

 3A. If everything works properly, the tag should have been auto-pushed and a
 local changelog commit should have been generated. Go to 4.

 3B. If the publish fails half-way, things have gotten hairy. Now you need to
 go to npm to check which packages have been published and manually publish
 the ones that have not been published yet. After all have been published:

 3B.1. Push the release git tag to GitHub.
 3B.2. Run `yarn changelog` to generate changelog commit.

 4. Push the changelog commit to `next` branch.

 5. Go to GitHub and verify that the changelog is live.

 6. Go to GitHub releases page and publish the release.

 */

process.env.VUE_CLI_RELEASE = true

const execa = require('execa')
const semver = require('semver')
const inquirer = require('inquirer')

const curVersion = require('../lerna.json').version

const release = async () => {
  console.log(`Current version: ${curVersion}`)

  const bumps = ['patch', 'minor', 'major', 'prerelease', 'premajor']
  const versions = {}
  bumps.forEach(b => {
    versions[b] = semver.inc(curVersion, b)
  })
  const bumpChoices = bumps.map(b => ({ name: `${b} (${versions[b]})`, value: b }))

  const { bump, customVersion } = await inquirer.prompt([
    {
      name: 'bump',
      message: 'Select release type:',
      type: 'list',
      choices: [
        ...bumpChoices,
        { name: 'custom', value: 'custom' }
      ]
    },
    {
      name: 'customVersion',
      message: 'Input version:',
      type: 'input',
      when: answers => answers.bump === 'custom'
    }
  ])

  const version = customVersion || versions[bump]

  const { yes } = await inquirer.prompt([{
    name: 'yes',
    message: `Confirm releasing ${version}?`,
    type: 'list',
    choices: ['N', 'Y']
  }])

  if (yes === 'N') {
    console.log('[release] cancelled.')
    return
  }

  const releaseArguments = [
    'publish',
    '--repo-version',
    version,
    '--force-publish',
    '*'
  ]

  console.log(`lerna ${releaseArguments.join(' ')}`)

  await execa(require.resolve('lerna/bin/lerna'), [
    'publish',
    '--repo-version',
    version,
    '--force-publish',
    '*'
  ], { stdio: 'inherit' })

  require('./genChangelog')(version)
}

release().catch(err => {
  console.error(err)
  process.exit(1)
})
