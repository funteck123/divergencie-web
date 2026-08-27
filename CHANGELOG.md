# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.2.0](https://github.com/funteck123/divergencie-web/compare/v0.1.1...v0.2.0) (2026-08-27)

### ⚠ BREAKING CHANGES

* **users:** any existing plaintext-password integration reading
  Password off GET /api/users or GET /api/regforms will now get undefined.
  Passwords are one-way hashed and can only be reset, never displayed.
* **auth:** SESSION_SECRET is now required in production; the app
  will throw at startup if it's unset. Set it before deploying.

### Features

* **accounts:** one-click reset-password + copy-to-clipboard (TKT-0137) ([641ea9c](https://github.com/funteck123/divergencie-web/commit/641ea9c29c12705849ec34a9f9cf69733f5fd789))
* **attendance:** teacher/student can log for each other (TKT-0037) ([07307b3](https://github.com/funteck123/divergencie-web/commit/07307b3fa26d3016d834179f8fbe1dc101dacc80))
* **attendance:** TKT-0095, Management can edit any attendance record ([3b2f404](https://github.com/funteck123/divergencie-web/commit/3b2f404bbe1f40027c50db1f69fffdca4cbdaebc))
* **billing:** add approve payment workflow for Invoices and Paychecks ([930a896](https://github.com/funteck123/divergencie-web/commit/930a896d21f0e247f200a4637336c880d1c8874e))
* **billing:** add filtering, bulk send, FX-rate reveal, submit confirmations ([1a111c9](https://github.com/funteck123/divergencie-web/commit/1a111c94511f495bef4bc189fd0f5545be022f09))
* **billing:** bill invoices month-wise instead of per-subject ([7b2bf26](https://github.com/funteck123/divergencie-web/commit/7b2bf269bd95e211a6be4ea1094b04a470a02d8f))
* **billing:** bill paychecks month-wise, mirroring invoices ([97454ee](https://github.com/funteck123/divergencie-web/commit/97454ee85fd28bcfdc19561ae358b6991689a087))
* **billing:** bill unlogged classes, don't pay for them (TKT-0035) ([5cd0084](https://github.com/funteck123/divergencie-web/commit/5cd0084a5cfbb2992d7601fb45086af63484ca93))
* **billing:** block $0 invoice/paycheck creation, report skips instead ([97e07c3](https://github.com/funteck123/divergencie-web/commit/97e07c3808b763ef3dbf5165a1d8155f9f0a77a4))
* **billing:** breathable design pass on admin billing cards and tables ([8cb2bee](https://github.com/funteck123/divergencie-web/commit/8cb2bee4fe4f1330e1e0dd525b59231d605b7961))
* **billing:** full-fee mode for invoices, attendance-based proration off (TKT-0104) ([28a2106](https://github.com/funteck123/divergencie-web/commit/28a210609f4f811bdc27573c40d3707b71edbdcb))
* **billing:** group Paychecks/Invoices by type and person (TKT-0030) ([755ad18](https://github.com/funteck123/divergencie-web/commit/755ad1887a4edced1be9da75d4bf4dcd978ad5f0))
* **billing:** manual invoice creation is month-wise (TKT-0013) ([086a2af](https://github.com/funteck123/divergencie-web/commit/086a2afd4574740cdf25ef1d8f442d291e8b7f3d))
* **billing:** Rebuild Drafts for stale invoice/paycheck line items (TKT-0110) ([46d6e79](https://github.com/funteck123/divergencie-web/commit/46d6e799b8136b297fa577a38115fcc40961ff77))
* **billing:** track Sent/Received dates across the app (TKT-0033) ([056958f](https://github.com/funteck123/divergencie-web/commit/056958f8441c78630f431b00ae3cefd00c3e3e2f))
* **billing:** visual-refinement pass, 7 changes grounded in cited UX research ([25a4354](https://github.com/funteck123/divergencie-web/commit/25a43544b099083856fda5f0d03c8f193db18762))
* **dashboards:** add search to every portal's own tables (TKT-0129/0130) ([d54f01e](https://github.com/funteck123/divergencie-web/commit/d54f01e1b32cfcd1566c4e350bf79d0b43c0067d))
* **dashboards:** surface existing LoggedAt/SentAt/PaidAt/ReceivedAt timestamps to the account they belong to (TKT-0107) ([523c08f](https://github.com/funteck123/divergencie-web/commit/523c08fbbec00119ed1168e52fb986098ea625a8))
* **dates:** standardize all date displays to DD/MM/YYYY ([c71db2d](https://github.com/funteck123/divergencie-web/commit/c71db2d9a7a63bff2ee0301e52e51a399fb44bb1))
* **enrollments:** add bulk-enroll one student into many services ([c673727](https://github.com/funteck123/divergencie-web/commit/c67372749efbc40120b8463c31f327b57aa2a1b1))
* **enrollments:** allow custom rate creation in bulk enroll (TKT-0015) ([1388f40](https://github.com/funteck123/divergencie-web/commit/1388f405a4332efb3d3646e0bd85edfc100d2400))
* **enrollments:** show Batch day/time in the picker (TKT-0026) ([c4ec302](https://github.com/funteck123/divergencie-web/commit/c4ec3029b3c79161df66281efc4f210c8b1e21ad))
* **interview:** add Request a Trial box for Teacher candidates (TKT-0133) ([a901861](https://github.com/funteck123/divergencie-web/commit/a9018617c0bf960e540a0cbcd94c6cd5d1c0d69f))
* **interview:** admin assigns slot on approval, not candidate (TKT-0021) ([1ecc70d](https://github.com/funteck123/divergencie-web/commit/1ecc70dd4cc28a3f58ff04322ae6709a7975e818))
* **interview:** gate task submission behind an explicit Send Task step (TKT-0119) ([c6a0910](https://github.com/funteck123/divergencie-web/commit/c6a0910741e2e9895b2cb8ce72e886afb694f616))
* **interview:** TKT-0120/TKT-0123, self-service Personal Info + Documents ([1cf62d5](https://github.com/funteck123/divergencie-web/commit/1cf62d5bcec7859da57fae6355610950ba5e5afb))
* **pipeline:** show scheduled time/instructor, require resume before interview request (TKT-0111) ([f6bf4db](https://github.com/funteck123/divergencie-web/commit/f6bf4db15b37cec350a356b9afa1cdc78161f01c))
* **pipeline:** visual step-sequence indicator for Trial/Interview (TKT-0131) ([05d1746](https://github.com/funteck123/divergencie-web/commit/05d17467ac7225e235e8c4bc0cc2b1c5b1245e0d))
* **prototypes:** add answer-resolution pipeline for image-based MS files ([7a259a3](https://github.com/funteck123/divergencie-web/commit/7a259a387beb3e08c8eff98b54da194449b160a8))
* **prototypes:** add library-browsing mode to mcq-digitizer ([650b2e3](https://github.com/funteck123/divergencie-web/commit/650b2e37b027ba7852e18e59a7b654b5ed1e25c3))
* **prototypes:** add mcq-digitizer, a fully rule-based MCQ tool ([7696efe](https://github.com/funteck123/divergencie-web/commit/7696efebf3ee19d28febd296947b152987d064a9))
* **prototypes:** serve mcq-digitizer's library flow from the pre-built database ([3f79a42](https://github.com/funteck123/divergencie-web/commit/3f79a42e8abb54c618900e73755c1584971e60ba))
* **prototypes:** support CAIE's Section B multiple-completion question format ([9c7a229](https://github.com/funteck123/divergencie-web/commit/9c7a2296e1227dd0c088d1401bf20272cf99b059))
* **resources:** auto-list Drive folder contents on Worksheets page ([692c3db](https://github.com/funteck123/divergencie-web/commit/692c3dbe0f79f617d6de7b6dc9382a6a5d36b22e))
* **schedule:** add a Conflicts-only filter and per-row badge for attendance conflicts (TKT-0108) ([9bd6506](https://github.com/funteck123/divergencie-web/commit/9bd65068b5abd82ba0d769c1e9cf5894f304e978))
* **schedule:** add dedicated Attendance Conflicts panel (TKT-0132) ([0d239ee](https://github.com/funteck123/divergencie-web/commit/0d239eedababb7a032128d12ce24ab8283fe4f54))
* **schedule:** add DELETE endpoints for ScheduleItem and AttendanceItem (TKT-0048 1/2) ([c5ac52d](https://github.com/funteck123/divergencie-web/commit/c5ac52d56779f458f00b3c78fee110659495c983))
* **schedule:** global pending-reschedule-requests panel (TKT-0029) ([ee3f82a](https://github.com/funteck123/divergencie-web/commit/ee3f82abd0a5ea5bd2048ec9bdd86c8b370f3a32))
* **schedule:** hide past sessions by default in list views (TKT-0027) ([45501ae](https://github.com/funteck123/divergencie-web/commit/45501aebf405a68675429e0d512a4004769b2872))
* **services:** add search box to Services tab ([38f0f3d](https://github.com/funteck123/divergencie-web/commit/38f0f3d00fc7af4db2fd37f7fb67a82b68a2aedc))
* **services:** optional Teacher-account link for Facilitator (TKT-0028) ([155f069](https://github.com/funteck123/divergencie-web/commit/155f069b8024361341dd8d857cae9fa065279a82))
* **tickets:** add optional resolution note on close ([b7a0e51](https://github.com/funteck123/divergencie-web/commit/b7a0e515f5e29b27ebc47d06a1822467804bda58))
* **tickets:** let admin edit a ticket's message ([73820ae](https://github.com/funteck123/divergencie-web/commit/73820ae886078e47aeac12de11344a890d9e9be1))
* **tickets:** show ticket number in admin Tickets tab ([ceaff0b](https://github.com/funteck123/divergencie-web/commit/ceaff0b7b000ef8b4cffdfb615d7c35c5f678842))
* **trial:** add Pay online button to Trial portal invoices (TKT-0126) ([d572b2a](https://github.com/funteck123/divergencie-web/commit/d572b2a2002f21b18db780fdf21c6abb91756795))
* **trial:** TKT-0080, remove Trial time-choice step ([46beff2](https://github.com/funteck123/divergencie-web/commit/46beff255bd253c46d4042e6cf19be7425e6f12a))
* **ui:** add loading/disabled states to action buttons ([2205fd5](https://github.com/funteck123/divergencie-web/commit/2205fd51136d98aaf0024c66b341ea3700bcdaec))
* **users:** add DELETE /api/users for accounts with no real history ([6612b59](https://github.com/funteck123/divergencie-web/commit/6612b59196b58c38209231dffd2a3570b6c1a962))
* **users:** add optional Parent Email field to Student accounts ([a6bfe90](https://github.com/funteck123/divergencie-web/commit/a6bfe908d0594920a23dd240c8ab256760b3bc45))
* **ux:** non-invasive Management dashboard audit + Web Interface Guidelines pass ([35ed6d4](https://github.com/funteck123/divergencie-web/commit/35ed6d47076d60da3812ba26885066b13499d111))

### Bug Fixes

* **a11y:** convert img tags to next/image, fix misplaced eslint-disable ([19fdb6a](https://github.com/funteck123/divergencie-web/commit/19fdb6a6ede5a11ed880f149df3783a324e6d412))
* **accounts:** show new password after reset in Accounts Edit form (TKT-0125) ([0e4828d](https://github.com/funteck123/divergencie-web/commit/0e4828d5bdfa1ed9060fb5e8138e7d071ee30333))
* **accounts:** unstick Converted-but-unlinked interview accounts ([cd506b1](https://github.com/funteck123/divergencie-web/commit/cd506b12515ca3de22d860f9b492c4cc92549f07))
* **attendance:** refresh parent dashboard after logging via SessionAttendance (TKT-0128) ([d3f0cdc](https://github.com/funteck123/divergencie-web/commit/d3f0cdc21f2f9bf872b3950652c5f3fa2e22a87d))
* **attendance:** stop leaking other students' attendance records in the raw API response (TKT-0109) ([b2435dc](https://github.com/funteck123/divergencie-web/commit/b2435dc1cc07cc5feec7daedd5418e5696af9bad))
* **attendance:** TKT-0073, hide co-enrolled peers of the same type ([a6b4fb0](https://github.com/funteck123/divergencie-web/commit/a6b4fb0fb5419b8b3d0a7e0bb14ba6dc280c613c))
* **attendance:** TKT-0074, one failed log() no longer blanks the roster ([a64d4bc](https://github.com/funteck123/divergencie-web/commit/a64d4bce077c87f3f9eb22a3e4bcadbc153bdaef))
* **attendance:** TKT-0094, log create/edit to the audit trail ([a368c42](https://github.com/funteck123/divergencie-web/commit/a368c42d3020df2a433037c79c190e522fbbbbb1))
* **attendance:** TKT-0097, close a real race in POST /api/attendance ([c4f662f](https://github.com/funteck123/divergencie-web/commit/c4f662f7f510de149d54be10904b75566457156b))
* **auth:** remove hardcoded fallback session secret ([02f456d](https://github.com/funteck123/divergencie-web/commit/02f456d70325e77c47aeb2aaa64a7accf4532e54))
* **auth:** show real error on wrong login password (TKT-0023) ([80b168b](https://github.com/funteck123/divergencie-web/commit/80b168b8c213f7a744878f97ec1fc6bcf01f1fb9))
* **billing:** add missing Attended hrs column to Parent Invoices table (TKT-0032) ([44a2333](https://github.com/funteck123/divergencie-web/commit/44a23337eb7607c5b57a76f760e4546783cbe04f))
* **billing:** alignment and decluttering fixes, same UI/functions (TKT-0045) ([78362ec](https://github.com/funteck123/divergencie-web/commit/78362ec1eb7d70a03caf49ffce9e0ab1256c4ce2))
* **billing:** correct stale INR-conversion help text (TKT-0044) ([5f70be9](https://github.com/funteck123/divergencie-web/commit/5f70be9b3aeee05c3f8b587d9484ba67c9a6a9c3))
* **billing:** format INR Amount/Due columns consistently (TKT-0034) ([0194b9f](https://github.com/funteck123/divergencie-web/commit/0194b9fbf873d9a2f3ab0e103f92d719f2638b38))
* **billing:** label the missed checkbox, add invoice/paycheck lifecycle guidance ([8405ce4](https://github.com/funteck123/divergencie-web/commit/8405ce43e8f6f1786e6a3191e72009a199c28682))
* **billing:** make Pay online invoice-specific (TKT-0039) ([f75cd02](https://github.com/funteck123/divergencie-web/commit/f75cd021222fc2ea68da9b1d4c904e822e2157c7))
* **billing:** match Trial's Add Service invoice shape to regular invoices (TKT-0105) ([d566d05](https://github.com/funteck123/divergencie-web/commit/d566d056acf7643c42843a0c18c84e99b538a307))
* **billing:** prevent duplicate invoices, warn on existing dups ([2454784](https://github.com/funteck123/divergencie-web/commit/24547847e255288851c4998f5e49d0db757fa90a))
* **billing:** stop silently zeroing future-month invoices/paychecks ([afce2a4](https://github.com/funteck123/divergencie-web/commit/afce2a401bfa2d553c08e72154aafff08d3774a4))
* **convert:** gate account conversion on offer acceptance / service added (TKT-0113) ([e1a7e3e](https://github.com/funteck123/divergencie-web/commit/e1a7e3e4ed475fd482d992b7fd8da161e08a7270))
* **convert:** stop .find() from picking a stale trial/interview item (TKT-0124) ([b209a4f](https://github.com/funteck123/divergencie-web/commit/b209a4febeadcd360618159f2da7900452a48978))
* **db:** mint ids atomically via Postgres to fix concurrent-request duplicate IDs ([7ba209c](https://github.com/funteck123/divergencie-web/commit/7ba209cf71d6a4a732bddd06ba48ecb6cf458862))
* **db:** route real deletions through targeted delete_rows, not writeDB inference ([ec4011f](https://github.com/funteck123/divergencie-web/commit/ec4011fca90cb6be460628f3b5c0da4ad9e94e80))
* **db:** self-heal nextId() against counter drift (TKT-0022) ([1d48d0f](https://github.com/funteck123/divergencie-web/commit/1d48d0f24b45284b116006aca4d614cc9eca6f1c))
* **dev:** allow trycloudflare.com quick tunnels as dev origins ([eb8eda5](https://github.com/funteck123/divergencie-web/commit/eb8eda5acf935274528b983a4f45cd8626fe6aa6))
* **enrollments:** add labels to Service/Batch/Rate selects ([12a92a5](https://github.com/funteck123/divergencie-web/commit/12a92a51770ca5d128120e752c7f748cda4fb34d))
* **enrollments:** cap each enrollment list to a scrollable max-height (TKT-0114) ([ca2f8c4](https://github.com/funteck123/divergencie-web/commit/ca2f8c4f19979a5d3d579a3a55675f70ee317697))
* **enrollments:** show real rates for role-based Services, stop silent rate auto-pick (TKT-0122) ([d379d24](https://github.com/funteck123/divergencie-web/commit/d379d2454729cf0813e7e579a80c5e8c8ac08361))
* **guides:** DELETE returned 200 but never actually removed the record ([888b028](https://github.com/funteck123/divergencie-web/commit/888b0289163d784479696f5a3e6cc5a385a1c8d8))
* **interview:** stop showing interviewer name to candidate (TKT-0018) ([e2d21c2](https://github.com/funteck123/divergencie-web/commit/e2d21c235fc9d7c2168e8a6bfc3018f6fcf0c489))
* **invoices:** validate payment-proof file type and size on upload ([dbc43e6](https://github.com/funteck123/divergencie-web/commit/dbc43e611cd9389e22de0f4e68ab1055337d962e))
* **login:** add rate limiting to stop unthrottled brute-force attempts ([eb7e6b0](https://github.com/funteck123/divergencie-web/commit/eb7e6b066a81d8877adc608860d8a5ad2680c341))
* **mcq-digitizer:** match near-miss QP/MS filenames via fuzzy + chapter-prefix fallback ([623a923](https://github.com/funteck123/divergencie-web/commit/623a923ed97a8a478c7b4de4ddb8e42e3ee24ccc))
* **mcq-digitizer:** resolve last QP/MS count mismatches and two crop-boundary bugs ([4d2b59f](https://github.com/funteck123/divergencie-web/commit/4d2b59f4037cc8256550082196d199c423089331))
* **mcq-digitizer:** stop MS resolver from mistaking stray letters and negated-question polarity ([52246f0](https://github.com/funteck123/divergencie-web/commit/52246f09d8d62378da522c79b6482dae9c0c342f))
* **pdf:** TKT-0092, update contact email to finance@divergencie.co.uk ([d910e10](https://github.com/funteck123/divergencie-web/commit/d910e10225b50b4c8cb3e581ebfd13416b1fc021))
* **pdf:** TKT-0093, remove the always-0% Tax line from invoices ([e87ce58](https://github.com/funteck123/divergencie-web/commit/e87ce58868018af6db49ecd90cd162fceab049ea))
* **pipeline:** show Batch name in the open-slot picker (TKT-0112) ([88e8a10](https://github.com/funteck123/divergencie-web/commit/88e8a101815a048ecae6c9af0b66baf265392b98))
* **pipeline:** status filter + sortable Scheduled column (TKT-0148/0149) ([d132b3b](https://github.com/funteck123/divergencie-web/commit/d132b3b549dfd16243617bf6271ee3f28269b7de))
* **prototypes:** account for vector-drawn diagrams in crop bounds and option detection ([d5de5f5](https://github.com/funteck123/divergencie-web/commit/d5de5f55513a7a85fbf100b6512c216f04e03462))
* **prototypes:** combine multi-page question crops into one image ([2596993](https://github.com/funteck123/divergencie-web/commit/25969935e906dd55a5957568d59af6c49fdffefc))
* **prototypes:** default optionLetters to A-D when a QP question has image-rendered options ([4c7cd56](https://github.com/funteck123/divergencie-web/commit/4c7cd5626399dbc33d5882fffe1af594f6d5303e))
* **prototypes:** detect option letters trailing a value line, not just leading ([255fd3c](https://github.com/funteck123/divergencie-web/commit/255fd3c1b4f098d56af71f2d6f92916eb486987c))
* **prototypes:** drop branding-only trailing pages instead of stitching them ([de9aa4f](https://github.com/funteck123/divergencie-web/commit/de9aa4f9cf6f7547891383b053a30628b4a482a6))
* **prototypes:** extend heading-stem merging to multiple lines, guard against field labels ([7004fb4](https://github.com/funteck123/divergencie-web/commit/7004fb4cf4715bed170a48e3575a90d8f879f982))
* **prototypes:** extend short heading stems with their own following lines ([97f9cc8](https://github.com/funteck123/divergencie-web/commit/97f9cc80c1e5760f556279b04dee6baae45bcd2d))
* **prototypes:** fix two real QP/MS pairing bugs found in a quality audit ([b51243e](https://github.com/funteck123/divergencie-web/commit/b51243ee2eac44ff57412307bea77da91e9ff531))
* **prototypes:** harden mcq-digitizer QP/MS content against real corruption ([e07e882](https://github.com/funteck123/divergencie-web/commit/e07e882da18c5fcb2fb1fb40f7eaae95d84ad4d6))
* **prototypes:** harden mcq-digitizer server against adversarial requests ([a907d80](https://github.com/funteck123/divergencie-web/commit/a907d8007416240e8f581d3db8a6ce5edd1b5a69))
* **prototypes:** make mcq-digitizer heading detection font-size-independent ([b021e43](https://github.com/funteck123/divergencie-web/commit/b021e43de0fcbbc01d49e82c48cb9998dfc27f92))
* **prototypes:** massive real-corpus sweep finds and fixes 6 more heading-detection bugs ([7de2e15](https://github.com/funteck123/divergencie-web/commit/7de2e15851f9a49c73a1722b449d736f85c12d65))
* **prototypes:** rebuild mcq-digitizer around real-world QP/MS formats ([8c2a1dd](https://github.com/funteck123/divergencie-web/commit/8c2a1dd73005694c42120508f49887d6ea0ef428))
* **prototypes:** recognize a nearby embedded image as evidence of a real question ([7adbdee](https://github.com/funteck123/divergencie-web/commit/7adbdee65e62860282cd5b084cb1bee16b164fad))
* **prototypes:** recognize a stray glyph and a new answer phrasing in MS text ([0685090](https://github.com/funteck123/divergencie-web/commit/068509093b4942b68cf8abf4243f1af338fa1def))
* **prototypes:** stop isotope-notation subscripts from splitting real Section B questions ([0fd1ab7](https://github.com/funteck123/divergencie-web/commit/0fd1ab7460f1932522c97162ea9df2cebb9167bd))
* **prototypes:** stop lightweight icon-detection producing out-of-range answer letters ([e5b2c5e](https://github.com/funteck123/divergencie-web/commit/e5b2c5ecebfc7d330286eea93d75e8d80f80c821))
* **prototypes:** stop ruler/diagram tick-mark numbers from splitting real questions ([d1fa47d](https://github.com/funteck123/divergencie-web/commit/d1fa47d9c2703ef4d4ec6c440ae873657f787801))
* **prototypes:** stop Section B detector from false-positive-ing on ruler/graph tick marks ([3cec631](https://github.com/funteck123/divergencie-web/commit/3cec6319542b918aba6701eea46b3dd8ead27102))
* **prototypes:** treat unparseable question-shaped headings as crop boundaries ([b750ebc](https://github.com/funteck123/divergencie-web/commit/b750ebcbb3420cf0865351b961166b5121b9e044))
* **prototypes:** trim same-page branding, close a real heading-detection gap ([32d08ed](https://github.com/funteck123/divergencie-web/commit/32d08ed7a7d7f986a804adba6bf5f62a77240c75))
* **register:** add rate limiting to public registration endpoint ([f93b93b](https://github.com/funteck123/divergencie-web/commit/f93b93b88249d3d0395e87657918396d0528070e))
* **resources:** enforce ownership check on Drive-folder listing ([299196f](https://github.com/funteck123/divergencie-web/commit/299196f70b089f64b39f9d2385eb0a83f3f6df3a))
* **schedule-image:** never leave the Teacher Batch field blank (TKT-0106) ([3913830](https://github.com/funteck123/divergencie-web/commit/3913830786a32e252aad6f83e4f1ea2d593e8f54))
* **schedule-image:** only color cells with an actual class ([2d0422c](https://github.com/funteck123/divergencie-web/commit/2d0422c7f88d341a4c31a99cf49144786e465d78))
* **schedule-image:** show course, fix batch timezone mislabeling ([3bda3c3](https://github.com/funteck123/divergencie-web/commit/3bda3c3138b4c9caecf2439b4db5f371109723ca))
* **schedule:** await missed nextId() call that broke schedule reads (TKT-0048 2/2) ([21ab085](https://github.com/funteck123/divergencie-web/commit/21ab085328f93bcaa0dbd83e1632028bd459f17f))
* **schedule:** cap calendar cell height, add day-detail popover, scrollable week grid ([9dc9951](https://github.com/funteck123/divergencie-web/commit/9dc9951ba6e715f40f2b2713b3201e161cc0c5f2))
* **schedule:** derive Teacher batch label from enrollment, not manual field (TKT-0041) ([a3eec6f](https://github.com/funteck123/divergencie-web/commit/a3eec6f138086149fa41ee19ac5c4d00cbbbadff))
* **schedule:** reject non-positive slot duration ([3a38910](https://github.com/funteck123/divergencie-web/commit/3a38910abe0310daa17216f03586f8ca69eff4bf))
* **schedule:** remove Batch value from Teacher schedule image (TKT-0041 follow-up) ([2896796](https://github.com/funteck123/divergencie-web/commit/28967961938d3432bf325f9e3d37f7e478b3be95))
* **schedule:** sync stale future ScheduleItems when their Service changes (TKT-0127) ([eb6fbb5](https://github.com/funteck123/divergencie-web/commit/eb6fbb5528b23a78723c5b9c45c007d409548700))
* **schedule:** TKT-0079, IST timezone + restore 9 deleted slots ([2860152](https://github.com/funteck123/divergencie-web/commit/2860152f30b0d885e62a687bd23a4fd251665ec7))
* **services:** label and widen the Rate group-restrict select (visual audit) ([5d61cb9](https://github.com/funteck123/divergencie-web/commit/5d61cb9de0f8f1544f6ee8ab85d320c171eb88a0))
* **services:** label recurring occurrence fields, scope Instructor picker to role group (TKT-0117) ([1f0ada5](https://github.com/funteck123/divergencie-web/commit/1f0ada5e54c4ee2387f00ff329181c43c400e336))
* **services:** reset Type when Group changes on the Create Service form (TKT-0116) ([b667b11](https://github.com/funteck123/divergencie-web/commit/b667b118f1c41e4a145515565cd11505b9d90ec5))
* **trial:** TKT-0071, exclude Book services from Trial picker ([eb452f0](https://github.com/funteck123/divergencie-web/commit/eb452f09587fa74f74805fa7faf4fcb962a8c451))
* **trial:** TKT-0078, remove instructor name from student trial view ([0e8d520](https://github.com/funteck123/divergencie-web/commit/0e8d5206f1a6053a3337661fd347e2077c9c0af4))
* **trial:** TKT-0091, fix broken invoice mark-as-paid button ([9d901e6](https://github.com/funteck123/divergencie-web/commit/9d901e6b099286e503b3d386f3a94523ed224908))
* **ui:** add labels to unlabeled form controls repo-wide (TKT-0047) ([cb7feca](https://github.com/funteck123/divergencie-web/commit/cb7feca2c29be4c55049a8e315eee1e527be4324))
* **ui:** full portal review with real data, 3 more issues found ([53c8b73](https://github.com/funteck123/divergencie-web/commit/53c8b73a4f5c05bfb2b977f3c9646b89316d4de3))
* **ui:** portal-side spacing fixes from screenshot audit ([6a25676](https://github.com/funteck123/divergencie-web/commit/6a25676e8a6135ac0afbf390f976051adc242c8c))
* **ui:** remove internal-process language from candidate-facing status messages (TKT-0025) ([5f1538a](https://github.com/funteck123/divergencie-web/commit/5f1538aa828377ca5ae3f51c18c909250f2c62fa))
* **ui:** remove Management-naming from Report an Issue confirmation (TKT-0025 follow-up) ([269a9ad](https://github.com/funteck123/divergencie-web/commit/269a9ade66687e0380c721bc5cb6dbac0abe86d1))
* **ui:** TKT-0024, Pipeline tab horizontal overflow with real data ([8a7127f](https://github.com/funteck123/divergencie-web/commit/8a7127fae56e4585b01e1f3f737f162b7c8b609e))
* **ui:** TKT-0090 follow-up, replace the native file picker itself ([649b26b](https://github.com/funteck123/divergencie-web/commit/649b26bab699200cb221932b8b33585423ebb87e))
* **ui:** TKT-0090, label the payment-proof file picker ([a22951d](https://github.com/funteck123/divergencie-web/commit/a22951d9d95da39ebaf355c37a3deb1a6081cf10))
* **users:** hash passwords, stop returning them from GET, migrate live data ([6b0ea3c](https://github.com/funteck123/divergencie-web/commit/6b0ea3cc22738643c7899049c1b445641fa9f82e))
* **ux:** cap every unbounded Management table to a scrollable max-height (TKT-0134) ([9659d1c](https://github.com/funteck123/divergencie-web/commit/9659d1cef9f60c9c990cd63d64946bd6d9b48113))
* **ux:** default portal Schedule views to Calendar, keep Weekly (TKT-0136) ([ff27274](https://github.com/funteck123/divergencie-web/commit/ff272746fa66e89b06bc6db0a9a53cb3cedbfb5a))
* **ux:** wrap every table in overflow-x-auto to stop page-wide horizontal scroll (TKT-0135) ([e7aead6](https://github.com/funteck123/divergencie-web/commit/e7aead6a9782b0441f73c390b18b2c71e54e0a03))
## [0.1.1](https://github.com/funteck123/divergencie-web/compare/v0.1.0...v0.1.1) (2026-07-30)

### Added
- Automated versioning/changelog via `commit-and-tag-version` (`npm run
  release`) — computes the next SemVer version and rewrites this file from
  Conventional Commits, commits and tags locally, but never pushes; push
  stays a deliberate manual step since it triggers Vercel's production deploy.
- Error monitoring via Sentry (server + client instrumentation), tuned for
  free-tier usage: low trace sampling (5%), 404s and browser-extension noise
  filtered out before they count against quota.
- Management audit trail (`auditlog` table) — every mutating admin action
  (services, users, invoices, paychecks, enrollments, reschedule approvals,
  API keys, ticket close/reopen) now records who did what, when.
- App-level structured logging (`applogs` table) alongside the audit trail.
- Generic issue-reporting Tickets feature: any signed-in account can raise a
  ticket (message + optional attachment URL) via a "Report an issue" button
  on every dashboard; Management can view, close, and reopen tickets from a
  new Tickets tab.

### Fixed
- `$0`-total invoice warning now only fires when it's actually misleading.
- Reschedule-request approval closed an IDOR (a non-owner could act on
  someone else's request).

### Notes
- This release also ships the full backlog of commits from Jul 19 onward
  that had never been pushed to `origin/main` before now — see `git log`
  for the complete list; only the changes above were made in the session
  that added this changelog and the tickets/monitoring features.
