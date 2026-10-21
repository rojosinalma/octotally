# Changelog

All notable changes to Octotally are documented here. The file is maintained by
[release-please](https://github.com/googleapis/release-please) from conventional commit messages.

## [0.3.0](https://github.com/rojosinalma/octotally/compare/v0.2.0...v0.3.0) (2026-10-21)


### Features

* hide the member switcher when the sibling list is old ([a561397](https://github.com/rojosinalma/octotally/commit/a561397f77860ee1649767ac037cd2fef4ee4498))
* hide the member switcher when the sibling list is old ([0e6c082](https://github.com/rojosinalma/octotally/commit/0e6c082e7a17c14dbd3ecddf7b5ff1cb7bd0613a))
* member switcher from the Octoforge sibling list ([b3c5644](https://github.com/rojosinalma/octotally/commit/b3c56446e3d514c99ce86a150a8950b019adda2a))
* member switcher from the Octoforge sibling list ([6458e17](https://github.com/rojosinalma/octotally/commit/6458e17ab23a27350dafb4b6a1e0d1fb393e5d54))

## [0.2.0](https://github.com/rojosinalma/octotally/compare/v0.1.2...v0.2.0) (2026-10-21)


### Features

* **db:** adopt another database for Octoforge ([5531f09](https://github.com/rojosinalma/octotally/commit/5531f0953f0cc3c24393ff2ce2dcac604d89e409))
* **db:** Postgres engine next to SQLite behind one async data layer ([040e2ed](https://github.com/rojosinalma/octotally/commit/040e2ede9403d5133162aade7bc2a3e6db693b95))
* Octoforge member contract v1 and Postgres support ([c6e770f](https://github.com/rojosinalma/octotally/commit/c6e770f05579709a32dc4957bd5a8071ae814e8e))
* **octoforge:** member contract v1 manifest and /api/octoforge routes ([9f9149e](https://github.com/rojosinalma/octotally/commit/9f9149e1a4051606f88e5d70f29e4dd5a963790d))


### Documentation

* octoforge integration, Postgres support and the new environment variables ([8541159](https://github.com/rojosinalma/octotally/commit/85411594fdb5bf57113f34f32e96c75499a226c0))

## [0.1.2](https://github.com/rojosinalma/octotally/compare/v0.1.1...v0.1.2) (2026-10-16)


### Documentation

* **changelog:** point commit links at the re-signed history ([fc91474](https://github.com/rojosinalma/octotally/commit/fc91474fe0c592e4fbf269a4d2b95248d42dd2b0))
* README to the standard shape with badges, usage and development sections; add the code of conduct ([8ecf948](https://github.com/rojosinalma/octotally/commit/8ecf948c3adbc460939e4e7122f5d184f8c86112))

## [0.1.1](https://github.com/rojosinalma/octotally/compare/v0.1.0...v0.1.1) (2026-10-16)


### Bug fixes

* **ci:** keep biome off release-please's manifest ([13acb8b](https://github.com/rojosinalma/octotally/commit/13acb8b6a1fc998a5c027f15f0099f9a7c7ee2bf))
* **ci:** tag the GHCR image with the release version; allow rebuilding an existing tag by hand ([655cfdd](https://github.com/rojosinalma/octotally/commit/655cfdd92b7d194aa64875a55b49a7d5dc5e005c))


### Documentation

* split the README into docs/ topic files and a design document ([cb64bae](https://github.com/rojosinalma/octotally/commit/cb64bae21b5c71c40ad60a0cb8007cfc03d906b7))

## 0.1.0 (2026-10-15)


### Features

* server, Primer web UI, repo files and CI ([293caeb](https://github.com/rojosinalma/octotally/commit/293caeb1f45a04836961861a17835608ab6267de))
* **web:** All view first, Discussions first in the type facet ([5bfa1e4](https://github.com/rojosinalma/octotally/commit/5bfa1e423dff5e8e49a9213d0db9e69037d86c45))
* **web:** Dracula theme generated from Primer's dark tokens ([01753f9](https://github.com/rojosinalma/octotally/commit/01753f9303105a780865a59715f2aa91f310f269))
* **web:** footer linking to the repository, issues, discussions and licence ([3956d62](https://github.com/rojosinalma/octotally/commit/3956d62455a2eed32d5d0e0e957216bdec605ece))


### Bug fixes

* **github:** type every issue/PR search so fine-grained PATs return results ([7214adb](https://github.com/rojosinalma/octotally/commit/7214adbd1e02628468865f523fba6a3bf7f98398))
* **server:** API_TOKEN is an extra credential, AUTH_PASSWORD is the only UI gate ([6980ff6](https://github.com/rojosinalma/octotally/commit/6980ff6a58356d764e814398366278f27b632a8a))
* **test:** look up the builtin 'active' view by id, not by position ([346b7cd](https://github.com/rojosinalma/octotally/commit/346b7cd158d6e808eb59035fd5e40eee1ff93fa4))
* **web:** facet checkboxes reflect selection; sticky header and independently scrolling sidebar; themed scrollbars ([8357739](https://github.com/rojosinalma/octotally/commit/8357739d66e409d55dbe473c93c65fce4fd828f8))
* **web:** resolve view placeholders before putting a view query in the search bar ([beb38af](https://github.com/rojosinalma/octotally/commit/beb38afb5d0388586f951719cc4be5d76e685718))


### Maintenance

* **ci:** bump the github-actions group across 1 directory with 7 updates ([#3](https://github.com/rojosinalma/octotally/issues/3)) ([88482fd](https://github.com/rojosinalma/octotally/commit/88482fd6df8afd2764645353b5cc83f14a885f01))
* **deps:** bump typescript ([#4](https://github.com/rojosinalma/octotally/issues/4)) ([03e4b5a](https://github.com/rojosinalma/octotally/commit/03e4b5ab4c6eb008036093321fa0daa1f13a75bb))
* prepare first release ([2b9e5ef](https://github.com/rojosinalma/octotally/commit/2b9e5ef1746c49e27cb9c62788fb68ba6f2ee906))
* scaffold monorepo with shared contract and search grammar ([b7b1b60](https://github.com/rojosinalma/octotally/commit/b7b1b6072efe97dfcad713f743f649e065139b12))
