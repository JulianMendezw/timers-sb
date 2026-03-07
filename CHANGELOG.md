# Changelog
## [1.10.0](https://github.com/JulianMendezw/timers-sb/compare/v1.9.0...v1.10.0) (2026-03-07)


### Features

* update last sample display to show UTC time format ([faac982](https://github.com/JulianMendezw/timers-sb/commit/faac9829d717cfb6369c8b4a47519491a28430f0))

## [1.9.0](https://github.com/JulianMendezw/timers-sb/compare/v1.8.5...v1.9.0) (2026-03-06)


### Features

* add container_type to ProductSummaryData and useExtraSample; enhance timer handling in useTimers ([ce574fa](https://github.com/JulianMendezw/timers-sb/commit/ce574fa284087f2f0fae3947bafccf47266f8d4c))

### [1.8.5](https://github.com/JulianMendezw/timers-sb/compare/v1.8.4...v1.8.5) (2026-03-05)

### [1.8.4](https://github.com/JulianMendezw/timers-sb/compare/v1.8.3...v1.8.4) (2026-03-05)


### Features

* sync rotation state on active products change and improve UTC timestamp handling ([25d91cd](https://github.com/JulianMendezw/timers-sb/commit/25d91cd81b729fafdc744dfb518f256929d1b5b5))

### [1.8.3](https://github.com/JulianMendezw/timers-sb/compare/v1.8.2...v1.8.3) (2026-03-05)

### [1.8.2](https://github.com/JulianMendezw/timers-sb/compare/v1.8.1...v1.8.2) (2026-03-05)


### Features

* enhance timer functionality with due timer checks and sync improvements ([e2e0bb5](https://github.com/JulianMendezw/timers-sb/commit/e2e0bb54e9e9d5d6465b90b2fc0064d6f769d11f))

### [1.8.1](https://github.com/JulianMendezw/timers-sb/compare/v1.8.0...v1.8.1) (2026-03-05)

## [1.8.0](https://github.com/JulianMendezw/timers-sb/compare/v1.7.0...v1.8.0) (2026-03-04)


### Features

* implement one-time SQL repair for active_products.sort_order normalization and update related logic ([dfde3bb](https://github.com/JulianMendezw/timers-sb/commit/dfde3bb31d196526058c1f6a6a7d4f5ec6be6382))

## 1.7.0 (2026-03-04)


### Features

* add activeProducts management and sample rotation utilities ([145b36b](https://github.com/JulianMendezw/timers-sb/commit/145b36ba7c188183bb0894583b0c9924cbb454ca))
* add product suggestion item and summary components with styles ([8f270ed](https://github.com/JulianMendezw/timers-sb/commit/8f270eda6c3b73d21abd71c1b79f8eca897650ee))
* adding db for timers ([b9abdd9](https://github.com/JulianMendezw/timers-sb/commit/b9abdd9026c7d94b4ac363e1da811e4df31fc217))
* blinking animation and styles ([a1564ae](https://github.com/JulianMendezw/timers-sb/commit/a1564ae5cf050d9466f61516a3cedfc5af457902))
* blinking light when a timer hit the current time ([6ecca32](https://github.com/JulianMendezw/timers-sb/commit/6ecca321208156a3dc162ea8f82c335105ea7352))
* blinking light when the timer hit the current time ([de2ec9d](https://github.com/JulianMendezw/timers-sb/commit/de2ec9d04d4723502c687c27f0df61836904408f))
* clock added ([3d691a5](https://github.com/JulianMendezw/timers-sb/commit/3d691a5d4750ae345a4c98539a7053aeff08078a))
* colon animation and indicator for next test ([63a719a](https://github.com/JulianMendezw/timers-sb/commit/63a719af3cedc4c6dd7be3b713b2712e207b346f))
* enhance production day handling and shift management with new utilities ([977800a](https://github.com/JulianMendezw/timers-sb/commit/977800a40e4bb2cf7c36c04918cde8fe75aff56e))
* **footer:** display app version in footer and add VITE_APP_VERSION to environment ([27b068c](https://github.com/JulianMendezw/timers-sb/commit/27b068c7b6c0982e255177960ad0654baa79707b))
* gren light when timer hit the goal time ([8f5a911](https://github.com/JulianMendezw/timers-sb/commit/8f5a911dc78e142ef2b5bcde368d44866a8d6b01))
* implement sample record insertion and enhance timer display with 24-hour format ([fbf2a49](https://github.com/JulianMendezw/timers-sb/commit/fbf2a496039174f762de3a57f48c2879b7f945b5))
* indicators for the next test ([4f19cbb](https://github.com/JulianMendezw/timers-sb/commit/4f19cbb54a5d9874d61f6213c52eb5aaf90b9307))
* modal now supports esc, enter and autofocus. ([f8648f9](https://github.com/JulianMendezw/timers-sb/commit/f8648f961bcf9e17010bbd73c891bb3d400ba0a0))
* peanut test schedule ([9256555](https://github.com/JulianMendezw/timers-sb/commit/9256555c9f5154f9753d65a8e6bea04b5fcb2f92))
* Sound notification for timers ([1151777](https://github.com/JulianMendezw/timers-sb/commit/11517775222fd3b25f8d90f737837d8b26f274f2))
* **timer:** enhance timer view with theme toggle and sound notifications ([dc33099](https://github.com/JulianMendezw/timers-sb/commit/dc330992f9dceae0495f0911f898525a7597e07a))


### Bug Fixes

* AM/PM was added to fix the issue of the light blinking when the timer matches the current time, as the timer is calculated based on the current time. ([dc2de09](https://github.com/JulianMendezw/timers-sb/commit/dc2de09dac1ca956ebff2d3583c0e8ffce383e49))
* cancel button dont modify the timer. ([536030a](https://github.com/JulianMendezw/timers-sb/commit/536030a6fbc4832bdde810fe9b0947ea7783dc47))
* consistent with for numbers ([2359042](https://github.com/JulianMendezw/timers-sb/commit/2359042b1080a0d15d602c42f10ce1d09017fcb8))
* next timer button set the next time for the timer ([1b24cc8](https://github.com/JulianMendezw/timers-sb/commit/1b24cc81f1ce6091fb18e50f31fdb89fd4932662))
* variable not used deleted ([f49ce98](https://github.com/JulianMendezw/timers-sb/commit/f49ce98673f330b40c7164d639fc324050364f76))


### Refactors

* adding footer ([2ef3260](https://github.com/JulianMendezw/timers-sb/commit/2ef32603f2ab95976becf0fab74349c3f8d3d1f0))
* am/pm removed from ui ([4c091b7](https://github.com/JulianMendezw/timers-sb/commit/4c091b782212730d03ecf1e56e401fb1235717f4))
* ampm to null ([082efb0](https://github.com/JulianMendezw/timers-sb/commit/082efb05aab0183be181cab9b3dddc4c878a1577))
* card for peanet test ([02a843e](https://github.com/JulianMendezw/timers-sb/commit/02a843e301c9c1fe999f28dce8165df0fe0afd54))
* change title app ([6408e01](https://github.com/JulianMendezw/timers-sb/commit/6408e01c63eee1631de2854b8f047552c8061ecd))
* commented unused imports ([93e377a](https://github.com/JulianMendezw/timers-sb/commit/93e377a05ea488b8b675f23325217eda4ce3b87f))
* condition if value is null on timpePicker comp ([bffcfd0](https://github.com/JulianMendezw/timers-sb/commit/bffcfd05f7b3f44c2dc887c4d740b3316675ac7a))
* hide arrows icons in the samples blcok ([9b20077](https://github.com/JulianMendezw/timers-sb/commit/9b2007714f1ac811fe8e769737696c278b2298f8))
* peanut schedule for 2026 ([da12835](https://github.com/JulianMendezw/timers-sb/commit/da12835faad07361af5f39e1024576205c931f47))
* remove unused loading state and cleanup sample rotation utility ([a81358f](https://github.com/JulianMendezw/timers-sb/commit/a81358f65d6aacac8d273744852989d89050e7fb))
* title removed from app file ([220c39b](https://github.com/JulianMendezw/timers-sb/commit/220c39b735d597927d3f45c782ddfc9f66fea77d))
* updating hook file for peanut test ([3c6eaf8](https://github.com/JulianMendezw/timers-sb/commit/3c6eaf8991963641514b76dc243d20a177322f43))


### Chores

* **release:** automate versioning and changelog ([315173a](https://github.com/JulianMendezw/timers-sb/commit/315173ae795746490ea6302481890cfe345ad0f0))

## 1.6.0 (2026-03-04)


### Features

* add activeProducts management and sample rotation utilities ([145b36b](https://github.com/JulianMendezw/timers-sb/commit/145b36ba7c188183bb0894583b0c9924cbb454ca))
* adding db for timers ([b9abdd9](https://github.com/JulianMendezw/timers-sb/commit/b9abdd9026c7d94b4ac363e1da811e4df31fc217))
* blinking animation and styles ([a1564ae](https://github.com/JulianMendezw/timers-sb/commit/a1564ae5cf050d9466f61516a3cedfc5af457902))
* blinking light when a timer hit the current time ([6ecca32](https://github.com/JulianMendezw/timers-sb/commit/6ecca321208156a3dc162ea8f82c335105ea7352))
* blinking light when the timer hit the current time ([de2ec9d](https://github.com/JulianMendezw/timers-sb/commit/de2ec9d04d4723502c687c27f0df61836904408f))
* clock added ([3d691a5](https://github.com/JulianMendezw/timers-sb/commit/3d691a5d4750ae345a4c98539a7053aeff08078a))
* colon animation and indicator for next test ([63a719a](https://github.com/JulianMendezw/timers-sb/commit/63a719af3cedc4c6dd7be3b713b2712e207b346f))
* enhance production day handling and shift management with new utilities ([977800a](https://github.com/JulianMendezw/timers-sb/commit/977800a40e4bb2cf7c36c04918cde8fe75aff56e))
* **footer:** display app version in footer and add VITE_APP_VERSION to environment ([27b068c](https://github.com/JulianMendezw/timers-sb/commit/27b068c7b6c0982e255177960ad0654baa79707b))
* gren light when timer hit the goal time ([8f5a911](https://github.com/JulianMendezw/timers-sb/commit/8f5a911dc78e142ef2b5bcde368d44866a8d6b01))
* implement sample record insertion and enhance timer display with 24-hour format ([fbf2a49](https://github.com/JulianMendezw/timers-sb/commit/fbf2a496039174f762de3a57f48c2879b7f945b5))
* indicators for the next test ([4f19cbb](https://github.com/JulianMendezw/timers-sb/commit/4f19cbb54a5d9874d61f6213c52eb5aaf90b9307))
* modal now supports esc, enter and autofocus. ([f8648f9](https://github.com/JulianMendezw/timers-sb/commit/f8648f961bcf9e17010bbd73c891bb3d400ba0a0))
* peanut test schedule ([9256555](https://github.com/JulianMendezw/timers-sb/commit/9256555c9f5154f9753d65a8e6bea04b5fcb2f92))
* Sound notification for timers ([1151777](https://github.com/JulianMendezw/timers-sb/commit/11517775222fd3b25f8d90f737837d8b26f274f2))
* **timer:** enhance timer view with theme toggle and sound notifications ([dc33099](https://github.com/JulianMendezw/timers-sb/commit/dc330992f9dceae0495f0911f898525a7597e07a))


### Bug Fixes

* AM/PM was added to fix the issue of the light blinking when the timer matches the current time, as the timer is calculated based on the current time. ([dc2de09](https://github.com/JulianMendezw/timers-sb/commit/dc2de09dac1ca956ebff2d3583c0e8ffce383e49))
* cancel button dont modify the timer. ([536030a](https://github.com/JulianMendezw/timers-sb/commit/536030a6fbc4832bdde810fe9b0947ea7783dc47))
* consistent with for numbers ([2359042](https://github.com/JulianMendezw/timers-sb/commit/2359042b1080a0d15d602c42f10ce1d09017fcb8))
* next timer button set the next time for the timer ([1b24cc8](https://github.com/JulianMendezw/timers-sb/commit/1b24cc81f1ce6091fb18e50f31fdb89fd4932662))
* variable not used deleted ([f49ce98](https://github.com/JulianMendezw/timers-sb/commit/f49ce98673f330b40c7164d639fc324050364f76))


### Refactors

* adding footer ([2ef3260](https://github.com/JulianMendezw/timers-sb/commit/2ef32603f2ab95976becf0fab74349c3f8d3d1f0))
* am/pm removed from ui ([4c091b7](https://github.com/JulianMendezw/timers-sb/commit/4c091b782212730d03ecf1e56e401fb1235717f4))
* ampm to null ([082efb0](https://github.com/JulianMendezw/timers-sb/commit/082efb05aab0183be181cab9b3dddc4c878a1577))
* card for peanet test ([02a843e](https://github.com/JulianMendezw/timers-sb/commit/02a843e301c9c1fe999f28dce8165df0fe0afd54))
* change title app ([6408e01](https://github.com/JulianMendezw/timers-sb/commit/6408e01c63eee1631de2854b8f047552c8061ecd))
* commented unused imports ([93e377a](https://github.com/JulianMendezw/timers-sb/commit/93e377a05ea488b8b675f23325217eda4ce3b87f))
* condition if value is null on timpePicker comp ([bffcfd0](https://github.com/JulianMendezw/timers-sb/commit/bffcfd05f7b3f44c2dc887c4d740b3316675ac7a))
* hide arrows icons in the samples blcok ([9b20077](https://github.com/JulianMendezw/timers-sb/commit/9b2007714f1ac811fe8e769737696c278b2298f8))
* peanut schedule for 2026 ([da12835](https://github.com/JulianMendezw/timers-sb/commit/da12835faad07361af5f39e1024576205c931f47))
* remove unused loading state and cleanup sample rotation utility ([a81358f](https://github.com/JulianMendezw/timers-sb/commit/a81358f65d6aacac8d273744852989d89050e7fb))
* title removed from app file ([220c39b](https://github.com/JulianMendezw/timers-sb/commit/220c39b735d597927d3f45c782ddfc9f66fea77d))
* updating hook file for peanut test ([3c6eaf8](https://github.com/JulianMendezw/timers-sb/commit/3c6eaf8991963641514b76dc243d20a177322f43))
