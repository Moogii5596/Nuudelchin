# CODEMAP — автоматаар үүсгэсэн (гараар бүү засаарай). Шинэчлэх: `cd game && npm run codemap`
# Хайх: `grep -n '<түлхүүр>' docs/CODEMAP.md` → олдсон мужийг л `sed -n 'a,bp' <файл>`. Ажлын эхэнд бүтнээр нь УНШИХГҮЙ.
# Мөр: FILE <зам> <хэмжээ> <мөр>L exports: … | SYM <зам>:<мөр> <төрөл> <нэр> | DOC <зам>:<эхлэл>-<төгсгөл> <гарчиг>
FILE game/src/device.ts 3.1KB 70L exports: isTouch,Quality,QUALITIES,QUALITY_NAME,quality,setQuality,QualitySpec,QUALITY_SPEC,Q,KEY_ICON,touchKeys
SYM game/src/device.ts:10 fn mq
SYM game/src/device.ts:13 const isTouch
SYM game/src/device.ts:16 type Quality
SYM game/src/device.ts:17 const QUALITIES
SYM game/src/device.ts:18 const QUALITY_NAME
SYM game/src/device.ts:21 fn stored
SYM game/src/device.ts:30 const quality
SYM game/src/device.ts:33 fn setQuality
SYM game/src/device.ts:41 interface QualitySpec
SYM game/src/device.ts:49 const QUALITY_SPEC
SYM game/src/device.ts:55 const Q
SYM game/src/device.ts:58 const KEY_ICON
SYM game/src/device.ts:63 fn touchKeys
FILE game/src/i18n/i18n.ts 0.5KB 16L exports: Lang,setLang,t
SYM game/src/i18n/i18n.ts:4 type Lang
SYM game/src/i18n/i18n.ts:8 fn setLang
SYM game/src/i18n/i18n.ts:13 fn t
FILE game/src/input/controller.ts 12.6KB 317L exports: ActionKind,ControllerHooks,PlayerController
SYM game/src/input/controller.ts:12 type ActionKind
SYM game/src/input/controller.ts:14 interface ControllerHooks
SYM game/src/input/controller.ts:26 fn angDiff
SYM game/src/input/controller.ts:33 class PlayerController
SYM game/src/input/controller.ts:58 method PlayerController.press
SYM game/src/input/controller.ts:133 method PlayerController.hold
SYM game/src/input/controller.ts:141 method PlayerController.shout
SYM game/src/input/controller.ts:147 method PlayerController.scare
SYM game/src/input/controller.ts:159 method PlayerController.useAction
SYM game/src/input/controller.ts:184 method PlayerController.isDown
SYM game/src/input/controller.ts:189 method PlayerController.moveTo
SYM game/src/input/controller.ts:194 method PlayerController.update
SYM game/src/input/controller.ts:280 method PlayerController.drive
FILE game/src/input/touch.ts 13.7KB 291L exports: TouchHooks,TouchUI
SYM game/src/input/touch.ts:15 interface TouchHooks
SYM game/src/input/touch.ts:32 class TouchUI
SYM game/src/input/touch.ts:219 method TouchUI.start
SYM game/src/input/touch.ts:225 method TouchUI.refreshInstall
SYM game/src/input/touch.ts:232 method TouchUI.install
SYM game/src/input/touch.ts:241 method TouchUI.bind
SYM game/src/input/touch.ts:259 method TouchUI.fullscreen
SYM game/src/input/touch.ts:272 method TouchUI.paused
SYM game/src/input/touch.ts:276 method TouchUI.portrait
SYM game/src/input/touch.ts:281 method TouchUI.update
FILE game/src/main.ts 26.5KB 434L
SYM game/src/main.ts:34 fn toast
SYM game/src/main.ts:47 fn start
FILE game/src/pwa.ts 4.9KB 107L exports: isIOS,isAndroid,inAppBrowser,installed,canLockLandscape,pwa,landscapeFullscreen,registerServiceWorker,onConnectionChange
SYM game/src/pwa.ts:17 const isIOS
SYM game/src/pwa.ts:18 const isAndroid
SYM game/src/pwa.ts:20 const inAppBrowser
SYM game/src/pwa.ts:23 const installed
SYM game/src/pwa.ts:29 const canLockLandscape
SYM game/src/pwa.ts:34 fn notify
SYM game/src/pwa.ts:48 const pwa
SYM game/src/pwa.ts:77 fn landscapeFullscreen
SYM game/src/pwa.ts:92 fn registerServiceWorker
SYM game/src/pwa.ts:104 fn onConnectionChange
FILE game/src/render/animals.ts 15.1KB 350L exports: AnimalsView
SYM game/src/render/animals.ts:41 fn legGeo
SYM game/src/render/animals.ts:45 fn helperMark
SYM game/src/render/animals.ts:52 fn sheepDef
SYM game/src/render/animals.ts:85 fn goatDef
SYM game/src/render/animals.ts:113 fn cowDef
SYM game/src/render/animals.ts:142 fn horseDef
SYM game/src/render/animals.ts:179 class AnimalsView
SYM game/src/render/animals.ts:216 method AnimalsView.setQuality
SYM game/src/render/animals.ts:221 method AnimalsView.snapshot
SYM game/src/render/animals.ts:235 method AnimalsView.update
SYM game/src/render/animals.ts:347 method AnimalsView.reset
FILE game/src/render/camera.ts 5.9KB 140L exports: FollowCamera
SYM game/src/render/camera.ts:10 class FollowCamera
SYM game/src/render/camera.ts:30 method FollowCamera.span
SYM game/src/render/camera.ts:116 method FollowCamera.update
SYM game/src/render/camera.ts:136 method FollowCamera.resize
FILE game/src/render/characters.ts 15.7KB 368L exports: Rig,makeHerder,makeHorse,swingLegs,CharactersView
SYM game/src/render/characters.ts:13 interface Rig
SYM game/src/render/characters.ts:21 fn makeHerder
SYM game/src/render/characters.ts:56 fn makeHorse
SYM game/src/render/characters.ts:72 fn makeWolf
SYM game/src/render/characters.ts:105 fn makeDog
SYM game/src/render/characters.ts:129 fn swingLegs
SYM game/src/render/characters.ts:140 fn makeBubble
SYM game/src/render/characters.ts:161 class CharactersView
SYM game/src/render/characters.ts:188 method CharactersView.say
SYM game/src/render/characters.ts:194 method CharactersView.seatHerder
SYM game/src/render/characters.ts:209 method CharactersView.herderObject
SYM game/src/render/characters.ts:213 method CharactersView.update
SYM game/src/render/characters.ts:292 method CharactersView.updateDogs
SYM game/src/render/characters.ts:330 method CharactersView.updateWolves
FILE game/src/render/items.ts 3.7KB 97L exports: ItemsView
SYM game/src/render/items.ts:12 fn canGeo
SYM game/src/render/items.ts:22 fn fiberGeo
SYM game/src/render/items.ts:37 class ItemsView
SYM game/src/render/items.ts:64 method ItemsView.update
FILE game/src/render/scene.ts 19.8KB 424L exports: GameView
SYM game/src/render/scene.ts:24 fn flakeTexture
SYM game/src/render/scene.ts:37 class GameView
SYM game/src/render/scene.ts:234 method GameView.applyQuality
SYM game/src/render/scene.ts:263 method GameView.snapshot
SYM game/src/render/scene.ts:276 method GameView.toggleHeatmap
SYM game/src/render/scene.ts:282 method GameView.frame
SYM game/src/render/scene.ts:341 method GameView.applyDaylight
SYM game/src/render/scene.ts:401 method GameView.updateFlakes
SYM game/src/render/scene.ts:417 method GameView.drawCalls
SYM game/src/render/scene.ts:421 method GameView.triangleCount
FILE game/src/render/staff.ts 4.8KB 131L exports: StaffView
SYM game/src/render/staff.ts:13 fn smallGer
SYM game/src/render/staff.ts:28 fn smallTent
SYM game/src/render/staff.ts:53 class StaffView
SYM game/src/render/staff.ts:58 method StaffView.update
SYM game/src/render/staff.ts:112 method StaffView.syncDwellings
FILE game/src/render/style.ts 15.6KB 409L exports: TimeVisual,SeasonVisual,GrassVisual,WaterVisual,SmokeVisual,CloudShadowVisual,FlowersVisual,MountainLayerVisual,VisualPalette,VisualStyle,validateVisualStyle,visualStyle,paletteHex
SYM game/src/render/style.ts:5 interface TimeVisual
SYM game/src/render/style.ts:17 interface SeasonVisual
SYM game/src/render/style.ts:24 interface GrassVisual
SYM game/src/render/style.ts:35 interface WaterVisual
SYM game/src/render/style.ts:45 interface SmokeVisual
SYM game/src/render/style.ts:49 interface CloudShadowVisual
SYM game/src/render/style.ts:58 interface FlowersVisual
SYM game/src/render/style.ts:65 interface MountainLayerVisual
SYM game/src/render/style.ts:75 interface VisualPalette
SYM game/src/render/style.ts:108 interface VisualStyle
SYM game/src/render/style.ts:128 fn isRecord
SYM game/src/render/style.ts:130 fn isColor
SYM game/src/render/style.ts:131 fn isPositive
SYM game/src/render/style.ts:134 fn validateVisualStyle
SYM game/src/render/style.ts:405 const visualStyle
SYM game/src/render/style.ts:407 fn paletteHex
FILE game/src/render/sumcenter.ts 24.7KB 545L exports: SumCenterView
SYM game/src/render/sumcenter.ts:12 fn label
SYM game/src/render/sumcenter.ts:32 fn houseModel
SYM game/src/render/sumcenter.ts:61 fn house
SYM game/src/render/sumcenter.ts:69 fn terrainFence
SYM game/src/render/sumcenter.ts:123 fn residentialPlot
SYM game/src/render/sumcenter.ts:203 fn resident
SYM game/src/render/sumcenter.ts:228 class SumCenterView
SYM game/src/render/sumcenter.ts:541 method SumCenterView.nearShop
FILE game/src/render/terrain.ts 60.4KB 1378L exports: TerrainView
SYM game/src/render/terrain.ts:28 fn typeLookup
SYM game/src/render/terrain.ts:59 fn grassClumpGeometry
SYM game/src/render/terrain.ts:94 fn flowerGeometry
SYM game/src/render/terrain.ts:142 class TerrainView
SYM game/src/render/terrain.ts:199 method TerrainView.heightAt
SYM game/src/render/terrain.ts:204 method TerrainView.sync
SYM game/src/render/terrain.ts:215 method TerrainView.updateSeason
SYM game/src/render/terrain.ts:225 method TerrainView.build
SYM game/src/render/terrain.ts:248 method TerrainView.dispose
SYM game/src/render/terrain.ts:280 method TerrainView.clearSmoke
SYM game/src/render/terrain.ts:291 method TerrainView.clearFlowers
SYM game/src/render/terrain.ts:300 method TerrainView.clearMountains
SYM game/src/render/terrain.ts:309 method TerrainView.disposeGeometries
SYM game/src/render/terrain.ts:315 method TerrainView.setQuality
SYM game/src/render/terrain.ts:332 method TerrainView.updateVisualTime
SYM game/src/render/terrain.ts:360 method TerrainView.buildGround
SYM game/src/render/terrain.ts:457 method TerrainView.buildWater
SYM game/src/render/terrain.ts:539 method TerrainView.buildGrassTextures
SYM game/src/render/terrain.ts:586 method TerrainView.buildTufts
SYM game/src/render/terrain.ts:739 method TerrainView.buildFlowers
SYM game/src/render/terrain.ts:790 method TerrainView.smoothBiomass
SYM game/src/render/terrain.ts:821 method TerrainView.updateGrass
SYM game/src/render/terrain.ts:911 method TerrainView.updateGrassCenter
SYM game/src/render/terrain.ts:919 method TerrainView.buildDecor
SYM game/src/render/terrain.ts:1002 method TerrainView.buildMountains
SYM game/src/render/terrain.ts:1052 method TerrainView.buildOvoo
SYM game/src/render/terrain.ts:1097 method TerrainView.buildCampStructures
SYM game/src/render/terrain.ts:1107 method TerrainView.buildPostFence
SYM game/src/render/terrain.ts:1135 method TerrainView.buildShed
SYM game/src/render/terrain.ts:1205 method TerrainView.buildPostAndFire
SYM game/src/render/terrain.ts:1229 method TerrainView.syncHay
SYM game/src/render/terrain.ts:1255 method TerrainView.buildDens
SYM game/src/render/terrain.ts:1292 method TerrainView.buildHome
FILE game/src/render/ui/names.ts 4.6KB 107L exports: stageName,speciesEmoji,PRODUCT_EMOJI,productName,unitOf,expenseName,PROCESSOR_NAME,fmtMoney,fmtNum,fmtMinutes,PASTURE_NAME,SEASON_NAME,SEASON_EMOJI,CAMP_HINT,+2
SYM game/src/render/ui/names.ts:22 fn stageName
SYM game/src/render/ui/names.ts:33 fn speciesEmoji
SYM game/src/render/ui/names.ts:37 const PRODUCT_EMOJI
SYM game/src/render/ui/names.ts:41 fn productName
SYM game/src/render/ui/names.ts:45 fn unitOf
SYM game/src/render/ui/names.ts:61 fn expenseName
SYM game/src/render/ui/names.ts:65 const PROCESSOR_NAME
SYM game/src/render/ui/names.ts:71 fn fmtMoney
SYM game/src/render/ui/names.ts:76 fn fmtNum
SYM game/src/render/ui/names.ts:80 fn fmtMinutes
SYM game/src/render/ui/names.ts:86 const PASTURE_NAME
SYM game/src/render/ui/names.ts:96 const SEASON_NAME
SYM game/src/render/ui/names.ts:97 const SEASON_EMOJI
SYM game/src/render/ui/names.ts:99 const CAMP_HINT
SYM game/src/render/ui/names.ts:106 const WATER_NAME
SYM game/src/render/ui/names.ts:107 const WOLF_LEVEL_NAME
FILE game/src/render/ui/panels.ts 70.2KB 1011L exports: UiHooks,Panels
SYM game/src/render/ui/panels.ts:85 interface UiHooks
SYM game/src/render/ui/panels.ts:92 class Panels
SYM game/src/render/ui/panels.ts:133 method Panels.isOpen
SYM game/src/render/ui/panels.ts:137 method Panels.open
SYM game/src/render/ui/panels.ts:160 method Panels.close
SYM game/src/render/ui/panels.ts:174 method Panels.showReport
SYM game/src/render/ui/panels.ts:186 method Panels.refresh
SYM game/src/render/ui/panels.ts:192 method Panels.showArrive
SYM game/src/render/ui/panels.ts:198 method Panels.render
SYM game/src/render/ui/panels.ts:216 method Panels.storageHtml
SYM game/src/render/ui/panels.ts:278 method Panels.buyItems
SYM game/src/render/ui/panels.ts:302 method Panels.vehicleButtons
SYM game/src/render/ui/panels.ts:310 method Panels.cargoList
SYM game/src/render/ui/panels.ts:324 method Panels.cargoHtml
SYM game/src/render/ui/panels.ts:393 method Panels.selectedAnimals
SYM game/src/render/ui/panels.ts:401 method Panels.shopHtml
SYM game/src/render/ui/panels.ts:474 method Panels.arriveHtml
SYM game/src/render/ui/panels.ts:515 method Panels.reportHtml
SYM game/src/render/ui/panels.ts:561 method Panels.wolfKillsHtml
SYM game/src/render/ui/panels.ts:568 method Panels.dogsHtml
SYM game/src/render/ui/panels.ts:596 method Panels.campsHtml
SYM game/src/render/ui/panels.ts:643 method Panels.cheatHtml
SYM game/src/render/ui/panels.ts:656 method Panels.teahouseHtml
SYM game/src/render/ui/panels.ts:679 method Panels.helpersHtml
SYM game/src/render/ui/panels.ts:730 method Panels.otorHtml
SYM game/src/render/ui/panels.ts:756 method Panels.payHtml
SYM game/src/render/ui/panels.ts:776 method Panels.act
FILE game/src/render/util.ts 4.3KB 123L exports: VisualRng,strSeed,clamp,angDiff,mat,boxGeo,merge,meshBox,limb,batchStatic
SYM game/src/render/util.ts:8 class VisualRng
SYM game/src/render/util.ts:13 method VisualRng.next
SYM game/src/render/util.ts:20 method VisualRng.range
SYM game/src/render/util.ts:25 fn strSeed
SYM game/src/render/util.ts:31 const clamp
SYM game/src/render/util.ts:33 fn angDiff
SYM game/src/render/util.ts:42 fn mat
SYM game/src/render/util.ts:52 fn boxGeo
SYM game/src/render/util.ts:61 fn merge
SYM game/src/render/util.ts:74 fn meshBox
SYM game/src/render/util.ts:83 fn limb
SYM game/src/render/util.ts:95 fn batchStatic
FILE game/src/render/vehicles.ts 9.6KB 202L exports: makeVehicleModel,VehiclesView
SYM game/src/render/vehicles.ts:18 fn wheel
SYM game/src/render/vehicles.ts:33 fn makeCart
SYM game/src/render/vehicles.ts:69 fn makeTruck
SYM game/src/render/vehicles.ts:98 fn makeVehicleModel
SYM game/src/render/vehicles.ts:102 class VehiclesView
SYM game/src/render/vehicles.ts:111 method VehiclesView.rig
SYM game/src/render/vehicles.ts:122 method VehiclesView.buildRoad
SYM game/src/render/vehicles.ts:167 method VehiclesView.update
FILE game/src/render/worldmap.ts 15.9KB 366L exports: WorldMapView
SYM game/src/render/worldmap.ts:18 fn textSprite
SYM game/src/render/worldmap.ts:40 class WorldMapView
SYM game/src/render/worldmap.ts:169 method WorldMapView.heightAt
SYM game/src/render/worldmap.ts:178 method WorldMapView.addCamp
SYM game/src/render/worldmap.ts:190 method WorldMapView.addSum
SYM game/src/render/worldmap.ts:204 method WorldMapView.addPath
SYM game/src/render/worldmap.ts:216 method WorldMapView.resize
SYM game/src/render/worldmap.ts:222 method WorldMapView.partyModel
SYM game/src/render/worldmap.ts:247 method WorldMapView.snapshot
SYM game/src/render/worldmap.ts:256 method WorldMapView.applySeason
SYM game/src/render/worldmap.ts:278 method WorldMapView.update
SYM game/src/render/worldmap.ts:329 method WorldMapView.replaceLabel
SYM game/src/render/worldmap.ts:361 fn segDist
FILE game/src/render/zones.ts 3.5KB 100L exports: ZonesView
SYM game/src/render/zones.ts:22 class ZonesView
SYM game/src/render/zones.ts:32 method ZonesView.toggle
SYM game/src/render/zones.ts:38 method ZonesView.ring
SYM game/src/render/zones.ts:51 method ZonesView.line
SYM game/src/render/zones.ts:64 method ZonesView.update
FILE game/src/sim/autotrip.ts 4.1KB 95L exports: AutoTripPlan,AutoTripPhase,AutoTrip
SYM game/src/sim/autotrip.ts:11 interface AutoTripPlan
SYM game/src/sim/autotrip.ts:17 type AutoTripPhase
SYM game/src/sim/autotrip.ts:19 class AutoTrip
SYM game/src/sim/autotrip.ts:25 method AutoTrip.finished
SYM game/src/sim/autotrip.ts:29 method AutoTrip.fail
SYM game/src/sim/autotrip.ts:36 method AutoTrip.tick
SYM game/src/sim/autotrip.ts:89 method AutoTrip.run
FILE game/src/sim/clock.ts 4.3KB 93L exports: TimeState,DayPhase,ClockEvent,newTime,phaseOf,isNight,activeDayMinutes,fullDayMinutes,tick,realSecondsPerMinute,realSecondsPerDay,formatTime
SYM game/src/sim/clock.ts:11 interface TimeState
SYM game/src/sim/clock.ts:16 type DayPhase
SYM game/src/sim/clock.ts:18 type ClockEvent
SYM game/src/sim/clock.ts:26 fn newTime
SYM game/src/sim/clock.ts:31 fn earliestHome
SYM game/src/sim/clock.ts:35 fn phaseOf
SYM game/src/sim/clock.ts:41 fn isNight
SYM game/src/sim/clock.ts:46 fn activeDayMinutes
SYM game/src/sim/clock.ts:51 fn fullDayMinutes
SYM game/src/sim/clock.ts:56 fn tick
SYM game/src/sim/clock.ts:77 fn realSecondsPerMinute
SYM game/src/sim/clock.ts:83 fn realSecondsPerDay
SYM game/src/sim/clock.ts:89 fn formatTime
FILE game/src/sim/commands.ts 16.2KB 321L exports: Command,CommandResult,nearHome,applyCommand
SYM game/src/sim/commands.ts:24 type Command
SYM game/src/sim/commands.ts:62 interface CommandResult
SYM game/src/sim/commands.ts:68 fn nearHome
SYM game/src/sim/commands.ts:77 fn ok
SYM game/src/sim/commands.ts:78 fn fail
SYM game/src/sim/commands.ts:80 fn applyCommand
FILE game/src/sim/config.ts 15.7KB 328L exports: Species,Sex,Season,SeasonsConfig,SPECIES,TimeConfig,SpeciesConfig,AnimalsConfig,PastureTypeConfig,GrazingConfig,HerdConfig,PastureConfig,WaterShape,TerrainConfig,+8
SYM game/src/sim/config.ts:22 type Species
SYM game/src/sim/config.ts:23 type Sex
SYM game/src/sim/config.ts:24 type Season
SYM game/src/sim/config.ts:27 interface SeasonsConfig
SYM game/src/sim/config.ts:45 const SPECIES
SYM game/src/sim/config.ts:47 interface TimeConfig
SYM game/src/sim/config.ts:61 interface SpeciesConfig
SYM game/src/sim/config.ts:76 interface AnimalsConfig
SYM game/src/sim/config.ts:95 interface PastureTypeConfig
SYM game/src/sim/config.ts:102 interface GrazingConfig
SYM game/src/sim/config.ts:125 interface HerdConfig
SYM game/src/sim/config.ts:144 interface PastureConfig
SYM game/src/sim/config.ts:166 type WaterShape
SYM game/src/sim/config.ts:171 interface TerrainConfig
SYM game/src/sim/config.ts:182 interface CampConfig
SYM game/src/sim/config.ts:192 interface HomeConfig
SYM game/src/sim/config.ts:204 interface WorldLocation
SYM game/src/sim/config.ts:209 interface WorldMapConfig
SYM game/src/sim/config.ts:220 interface StartAnimal
SYM game/src/sim/config.ts:228 interface GameConfig
SYM game/src/sim/config.ts:247 fn loadConfig
SYM game/src/sim/config.ts:274 fn validateConfig
FILE game/src/sim/rng.ts 1.3KB 49L exports: Rng
SYM game/src/sim/rng.ts:6 class Rng
SYM game/src/sim/rng.ts:14 method Rng.state
SYM game/src/sim/rng.ts:18 method Rng.fromState
SYM game/src/sim/rng.ts:23 method Rng.next
SYM game/src/sim/rng.ts:32 method Rng.range
SYM game/src/sim/rng.ts:37 method Rng.int
SYM game/src/sim/rng.ts:41 method Rng.chance
SYM game/src/sim/rng.ts:45 method Rng.pick
FILE game/src/sim/sim.ts 9.9KB 229L exports: DayReport,SimEvent,Sim
SYM game/src/sim/sim.ts:27 interface DayReport
SYM game/src/sim/sim.ts:49 type SimEvent
SYM game/src/sim/sim.ts:51 class Sim
SYM game/src/sim/sim.ts:71 method Sim.on
SYM game/src/sim/sim.ts:78 method Sim.emit
SYM game/src/sim/sim.ts:82 method Sim.command
SYM game/src/sim/sim.ts:89 method Sim.emitTravel
SYM game/src/sim/sim.ts:94 method Sim.step
SYM game/src/sim/sim.ts:148 method Sim.refreshQuality
SYM game/src/sim/sim.ts:153 method Sim.runDays
SYM game/src/sim/sim.ts:158 method Sim.endDay
SYM game/src/sim/sim.ts:220 method Sim.spend
SYM game/src/sim/sim.ts:226 method Sim.random
FILE game/src/sim/state.ts 11.0KB 267L exports: SAVE_VERSION,ProductId,PRODUCTS,AnimalMode,Animal,GroundItem,Batch,ProcessorKind,ProcessorState,VehicleId,VEHICLES,BuyOrder,Place,FleetVehicle,+8
SYM game/src/sim/state.ts:14 const SAVE_VERSION
SYM game/src/sim/state.ts:16 type ProductId
SYM game/src/sim/state.ts:17 const PRODUCTS
SYM game/src/sim/state.ts:21 type AnimalMode
SYM game/src/sim/state.ts:23 interface Animal
SYM game/src/sim/state.ts:51 interface GroundItem
SYM game/src/sim/state.ts:60 interface Batch
SYM game/src/sim/state.ts:66 type ProcessorKind
SYM game/src/sim/state.ts:68 interface ProcessorState
SYM game/src/sim/state.ts:74 type VehicleId
SYM game/src/sim/state.ts:75 const VEHICLES
SYM game/src/sim/state.ts:77 type BuyOrder
SYM game/src/sim/state.ts:90 type Place
SYM game/src/sim/state.ts:93 interface FleetVehicle
SYM game/src/sim/state.ts:105 interface MapState
SYM game/src/sim/state.ts:113 interface CampState
SYM game/src/sim/state.ts:121 interface DayStats
SYM game/src/sim/state.ts:134 interface PlayerState
SYM game/src/sim/state.ts:149 interface GameState
SYM game/src/sim/state.ts:179 fn emptyDayStats
SYM game/src/sim/state.ts:183 fn newAnimal
SYM game/src/sim/state.ts:216 fn createInitialState
FILE game/src/sim/systems/animals.ts 5.2KB 123L exports: AnimalBody,frameKg,liveWeightKg,salePrice,buyPrice,sheepUnits,herdSheepUnits,grazingSheepUnits,dailyConditionDelta,dailyAnimals
SYM game/src/sim/systems/animals.ts:8 interface AnimalBody
SYM game/src/sim/systems/animals.ts:21 fn frameKg
SYM game/src/sim/systems/animals.ts:44 fn liveWeightKg
SYM game/src/sim/systems/animals.ts:50 fn salePrice
SYM game/src/sim/systems/animals.ts:59 fn buyPrice
SYM game/src/sim/systems/animals.ts:64 fn sheepUnits
SYM game/src/sim/systems/animals.ts:70 fn herdSheepUnits
SYM game/src/sim/systems/animals.ts:77 fn grazingSheepUnits
SYM game/src/sim/systems/animals.ts:87 fn dailyConditionDelta
SYM game/src/sim/systems/animals.ts:98 fn dailyAnimals
FILE game/src/sim/systems/breeding.ts 3.3KB 75L exports: BreedingResult,dailyBreeding
SYM game/src/sim/systems/breeding.ts:11 interface BreedingResult
SYM game/src/sim/systems/breeding.ts:16 fn dailyBreeding
SYM game/src/sim/systems/breeding.ts:23 fn breedGroup
FILE game/src/sim/systems/camps.ts 4.3KB 96L exports: moveHours,startMove,moveStep
SYM game/src/sim/systems/camps.ts:17 fn moveHours
SYM game/src/sim/systems/camps.ts:27 fn startMove
SYM game/src/sim/systems/camps.ts:47 fn moveStep
FILE game/src/sim/systems/cheats.ts 6.8KB 174L exports: CheatAction,applyCheat
SYM game/src/sim/systems/cheats.ts:12 type CheatAction
SYM game/src/sim/systems/cheats.ts:24 fn applyCheat
FILE game/src/sim/systems/dogs.ts 13.5KB 310L exports: DogOrderKind,DOG_ORDERS,Dog,newDog,DOG_ORDER_NAME,orderDog,dogGoal,dogsStep,dogsDaily,relocateDogs
SYM game/src/sim/systems/dogs.ts:25 type DogOrderKind
SYM game/src/sim/systems/dogs.ts:26 const DOG_ORDERS
SYM game/src/sim/systems/dogs.ts:28 interface Dog
SYM game/src/sim/systems/dogs.ts:50 fn newDog
SYM game/src/sim/systems/dogs.ts:59 const DOG_ORDER_NAME
SYM game/src/sim/systems/dogs.ts:68 fn orderDog
SYM game/src/sim/systems/dogs.ts:90 fn nearestHerdKey
SYM game/src/sim/systems/dogs.ts:104 fn speciesCenter
SYM game/src/sim/systems/dogs.ts:127 fn dogGoal
SYM game/src/sim/systems/dogs.ts:158 fn dogsStep
SYM game/src/sim/systems/dogs.ts:260 fn dogsDaily
SYM game/src/sim/systems/dogs.ts:265 fn hash01
SYM game/src/sim/systems/dogs.ts:273 fn pickWander
SYM game/src/sim/systems/dogs.ts:286 fn move
SYM game/src/sim/systems/dogs.ts:297 fn relocateDogs
FILE game/src/sim/systems/grazing.ts 9.9KB 254L exports: flockCenters,grazingStep,driveFlock
SYM game/src/sim/systems/grazing.ts:23 fn flockCenters
SYM game/src/sim/systems/grazing.ts:43 fn flockKey
SYM game/src/sim/systems/grazing.ts:48 fn decide
SYM game/src/sim/systems/grazing.ts:97 fn scoreAt
SYM game/src/sim/systems/grazing.ts:130 fn moveToward
SYM game/src/sim/systems/grazing.ts:145 fn grazingStep
SYM game/src/sim/systems/grazing.ts:223 fn eat
SYM game/src/sim/systems/grazing.ts:243 fn driveFlock
FILE game/src/sim/systems/helpers.ts 42.1KB 882L exports: HelperKind,HelperTask,HerdGroup,HelperTrip,Helper,CandidateMember,Candidate,OtorGroup,Dwelling,HelpersState,HelperEvent,newHelpersState,bedsTotal,bedsUsed,+21
SYM game/src/sim/systems/helpers.ts:32 type HelperKind
SYM game/src/sim/systems/helpers.ts:33 type HelperTask
SYM game/src/sim/systems/helpers.ts:34 type HerdGroup
SYM game/src/sim/systems/helpers.ts:36 interface HelperTrip
SYM game/src/sim/systems/helpers.ts:43 interface Helper
SYM game/src/sim/systems/helpers.ts:67 interface CandidateMember
SYM game/src/sim/systems/helpers.ts:73 interface Candidate
SYM game/src/sim/systems/helpers.ts:80 interface OtorGroup
SYM game/src/sim/systems/helpers.ts:92 interface Dwelling
SYM game/src/sim/systems/helpers.ts:101 interface HelpersState
SYM game/src/sim/systems/helpers.ts:112 type HelperEvent
SYM game/src/sim/systems/helpers.ts:117 fn newHelpersState
SYM game/src/sim/systems/helpers.ts:124 fn freeSlot
SYM game/src/sim/systems/helpers.ts:132 fn bedsTotal
SYM game/src/sim/systems/helpers.ts:136 fn bedsUsed
SYM game/src/sim/systems/helpers.ts:141 fn addDwelling
SYM game/src/sim/systems/helpers.ts:147 fn spareTents
SYM game/src/sim/systems/helpers.ts:153 fn homeOf
SYM game/src/sim/systems/helpers.ts:163 fn refreshCandidates
SYM game/src/sim/systems/helpers.ts:200 fn nearTeahouse
SYM game/src/sim/systems/helpers.ts:206 fn hire
SYM game/src/sim/systems/helpers.ts:254 fn familyOf
SYM game/src/sim/systems/helpers.ts:259 fn leave
SYM game/src/sim/systems/helpers.ts:269 fn fire
SYM game/src/sim/systems/helpers.ts:280 fn setTask
SYM game/src/sim/systems/helpers.ts:294 fn payWithAnimal
SYM game/src/sim/systems/helpers.ts:306 fn playerOwned
SYM game/src/sim/systems/helpers.ts:311 fn payWages
SYM game/src/sim/systems/helpers.ts:336 fn moveToward
SYM game/src/sim/systems/helpers.ts:350 fn groupOf
SYM game/src/sim/systems/helpers.ts:356 fn flock
SYM game/src/sim/systems/helpers.ts:366 fn driveAnimal
SYM game/src/sim/systems/helpers.ts:374 fn bestPasture
SYM game/src/sim/systems/helpers.ts:397 fn ensureHorseCamp
SYM game/src/sim/systems/helpers.ts:424 fn helperGuardRadius
SYM game/src/sim/systems/helpers.ts:429 fn areaScore
SYM game/src/sim/systems/helpers.ts:436 fn herderPhase
SYM game/src/sim/systems/helpers.ts:445 fn herderStep
SYM game/src/sim/systems/helpers.ts:542 fn eveningSpot
SYM game/src/sim/systems/helpers.ts:549 fn childStep
SYM game/src/sim/systems/helpers.ts:601 fn driverStep
SYM game/src/sim/systems/helpers.ts:672 fn helpersStep
SYM game/src/sim/systems/helpers.ts:693 fn guardingHelpers
SYM game/src/sim/systems/helpers.ts:700 fn sendOtor
SYM game/src/sim/systems/helpers.ts:717 fn recallOtor
SYM game/src/sim/systems/helpers.ts:740 fn setOtorCollector
SYM game/src/sim/systems/helpers.ts:763 fn takeFromOtor
SYM game/src/sim/systems/helpers.ts:794 fn dailyOtor
SYM game/src/sim/systems/helpers.ts:875 fn relocateHelpers
FILE game/src/sim/systems/herder.ts 4.9KB 126L exports: ridingHorse,herderStep,shout,toggleUurga,toggleMount
SYM game/src/sim/systems/herder.ts:13 fn ridingHorse
SYM game/src/sim/systems/herder.ts:18 fn herderStep
SYM game/src/sim/systems/herder.ts:68 fn shout
SYM game/src/sim/systems/herder.ts:102 fn toggleUurga
SYM game/src/sim/systems/herder.ts:108 fn toggleMount
FILE game/src/sim/systems/herds.ts 10.8KB 246L exports: Herd,flockKey,findHerds,drinkPoint,cellScore,areaScore,FlockCenter,cohesionCenters,HerdDecision,herdDecide
SYM game/src/sim/systems/herds.ts:20 interface Herd
SYM game/src/sim/systems/herds.ts:29 const flockKey
SYM game/src/sim/systems/herds.ts:36 fn findHerds
SYM game/src/sim/systems/herds.ts:104 fn drinkPoint
SYM game/src/sim/systems/herds.ts:114 fn cellScore
SYM game/src/sim/systems/herds.ts:123 fn areaScore
SYM game/src/sim/systems/herds.ts:135 fn pickySpecies
SYM game/src/sim/systems/herds.ts:139 interface FlockCenter
SYM game/src/sim/systems/herds.ts:149 fn cohesionCenters
SYM game/src/sim/systems/herds.ts:172 interface HerdDecision
SYM game/src/sim/systems/herds.ts:184 fn herdDecide
FILE game/src/sim/systems/night.ts 5.5KB 111L exports: goesHome,homeSpot,atHome,eveningStep,sleepAll,intakeFactor,dailyMilkLiters,morning
SYM game/src/sim/systems/night.ts:17 fn goesHome
SYM game/src/sim/systems/night.ts:22 fn homeSpot
SYM game/src/sim/systems/night.ts:31 fn atHome
SYM game/src/sim/systems/night.ts:38 fn eveningStep
SYM game/src/sim/systems/night.ts:54 fn sleepAll
SYM game/src/sim/systems/night.ts:64 fn intakeFactor
SYM game/src/sim/systems/night.ts:70 fn dailyMilkLiters
SYM game/src/sim/systems/night.ts:75 fn bump
SYM game/src/sim/systems/night.ts:79 fn drop
SYM game/src/sim/systems/night.ts:85 fn morning
FILE game/src/sim/systems/pasture.ts 7.3KB 159L exports: GrassGrid,buildGrid,cellIndex,typeIdOf,typeQualities,absBiomass,grassHeightCm,grassCapacity,dailyRegrowth,degradeGain,dailyCampDegrade,nearestWater,averageBiomass
SYM game/src/sim/systems/pasture.ts:12 interface GrassGrid
SYM game/src/sim/systems/pasture.ts:23 fn hashNoise
SYM game/src/sim/systems/pasture.ts:30 fn buildGrid
SYM game/src/sim/systems/pasture.ts:60 fn cellIndex
SYM game/src/sim/systems/pasture.ts:67 fn typeIdOf
SYM game/src/sim/systems/pasture.ts:72 fn typeQualities
SYM game/src/sim/systems/pasture.ts:84 fn absBiomass
SYM game/src/sim/systems/pasture.ts:90 fn grassHeightCm
SYM game/src/sim/systems/pasture.ts:96 fn grassCapacity
SYM game/src/sim/systems/pasture.ts:104 fn dailyRegrowth
SYM game/src/sim/systems/pasture.ts:117 fn degradeGain
SYM game/src/sim/systems/pasture.ts:126 fn dailyCampDegrade
SYM game/src/sim/systems/pasture.ts:139 fn nearestWater
SYM game/src/sim/systems/pasture.ts:148 fn averageBiomass
FILE game/src/sim/systems/processing.ts 2.1KB 47L exports: recipe,canStart,start,processingStep
SYM game/src/sim/systems/processing.ts:10 fn recipe
SYM game/src/sim/systems/processing.ts:14 fn canStart
SYM game/src/sim/systems/processing.ts:21 fn start
SYM game/src/sim/systems/processing.ts:29 fn processingStep
FILE game/src/sim/systems/production.ts 1.7KB 37L exports: groundAgingStep
SYM game/src/sim/systems/production.ts:9 fn bump
SYM game/src/sim/systems/production.ts:14 fn groundAgingStep
FILE game/src/sim/systems/seasons.ts 11.2KB 232L exports: yearDay,seasonStart,seasonOf,seasonProgress,yearOf,snowAccess,applyAccess,campAccess,dailySnow,dailyGrass,dailyAwayGrass,ShelterFn,coldNight,feedHay,+3
SYM game/src/sim/systems/seasons.ts:17 fn yearDay
SYM game/src/sim/systems/seasons.ts:22 fn seasonStart
SYM game/src/sim/systems/seasons.ts:31 fn seasonOf
SYM game/src/sim/systems/seasons.ts:41 fn seasonProgress
SYM game/src/sim/systems/seasons.ts:47 fn yearOf
SYM game/src/sim/systems/seasons.ts:52 fn dayNoise
SYM game/src/sim/systems/seasons.ts:60 fn snowAccess
SYM game/src/sim/systems/seasons.ts:67 fn applyAccess
SYM game/src/sim/systems/seasons.ts:72 fn campAccess
SYM game/src/sim/systems/seasons.ts:77 fn dailySnow
SYM game/src/sim/systems/seasons.ts:95 fn dailyGrass
SYM game/src/sim/systems/seasons.ts:116 fn dailyAwayGrass
SYM game/src/sim/systems/seasons.ts:132 type ShelterFn
SYM game/src/sim/systems/seasons.ts:138 fn coldNight
SYM game/src/sim/systems/seasons.ts:160 fn feedHay
SYM game/src/sim/systems/seasons.ts:189 fn birthYearDay
SYM game/src/sim/systems/seasons.ts:210 fn snowfallToday
SYM game/src/sim/systems/seasons.ts:221 fn seasonLook
FILE game/src/sim/systems/storage.ts 2.9KB 74L exports: capacity,used,freeSpace,count,add,take,dailyStorageAging
SYM game/src/sim/systems/storage.ts:8 fn capacity
SYM game/src/sim/systems/storage.ts:12 fn used
SYM game/src/sim/systems/storage.ts:16 fn freeSpace
SYM game/src/sim/systems/storage.ts:20 fn count
SYM game/src/sim/systems/storage.ts:25 fn add
SYM game/src/sim/systems/storage.ts:35 fn take
SYM game/src/sim/systems/storage.ts:52 fn dailyStorageAging
FILE game/src/sim/systems/travel.ts 23.4KB 523L exports: TravelEvent,fleetOf,initFleetVehicle,addVehicle,syncAway,cargoUnits,hayInOrders,hayRoom,cargoSlots,nearestVehicle,enterVehicle,exitVehicle,boardBest,takeFromStorage,+19
SYM game/src/sim/systems/travel.ts:21 type TravelEvent
SYM game/src/sim/systems/travel.ts:26 fn fleetOf
SYM game/src/sim/systems/travel.ts:31 fn initFleetVehicle
SYM game/src/sim/systems/travel.ts:42 fn addVehicle
SYM game/src/sim/systems/travel.ts:48 fn syncAway
SYM game/src/sim/systems/travel.ts:53 fn cargoUnits
SYM game/src/sim/systems/travel.ts:58 fn hayInOrders
SYM game/src/sim/systems/travel.ts:63 fn hayRoom
SYM game/src/sim/systems/travel.ts:69 fn cargoSlots
SYM game/src/sim/systems/travel.ts:74 fn nearestVehicle
SYM game/src/sim/systems/travel.ts:88 fn enterVehicle
SYM game/src/sim/systems/travel.ts:102 fn exitVehicle
SYM game/src/sim/systems/travel.ts:120 fn boardBest
SYM game/src/sim/systems/travel.ts:140 fn takeFromStorage
SYM game/src/sim/systems/travel.ts:159 fn droveAnimals
SYM game/src/sim/systems/travel.ts:170 fn canTravel
SYM game/src/sim/systems/travel.ts:175 fn originKm
SYM game/src/sim/systems/travel.ts:181 fn sumId
SYM game/src/sim/systems/travel.ts:186 fn driveVehicle
SYM game/src/sim/systems/travel.ts:204 fn leaveToMap
SYM game/src/sim/systems/travel.ts:219 fn mapGo
SYM game/src/sim/systems/travel.ts:232 fn mapSpeedKmPerMin
SYM game/src/sim/systems/travel.ts:242 fn droveSlows
SYM game/src/sim/systems/travel.ts:248 fn partySpeedKmPerMin
SYM game/src/sim/systems/travel.ts:254 fn mapStep
SYM game/src/sim/systems/travel.ts:273 fn spend
SYM game/src/sim/systems/travel.ts:279 fn arrive
SYM game/src/sim/systems/travel.ts:344 fn migrateHere
SYM game/src/sim/systems/travel.ts:355 fn atLoadingSpot
SYM game/src/sim/systems/travel.ts:361 fn loadCargo
SYM game/src/sim/systems/travel.ts:389 fn unloadCargo
SYM game/src/sim/systems/travel.ts:414 interface TradePlan
SYM game/src/sim/systems/travel.ts:421 fn sellableAtShop
SYM game/src/sim/systems/travel.ts:430 fn sellableAnimals
SYM game/src/sim/systems/travel.ts:436 fn animalRoom
SYM game/src/sim/systems/travel.ts:448 fn trade
FILE game/src/sim/systems/trip.ts 4.2KB 109L exports: VehicleSpec,vehicleCfg,bestTruck,parkingSpot,productPrice,orderPrice,animalSlots,deliver
SYM game/src/sim/systems/trip.ts:14 type VehicleSpec
SYM game/src/sim/systems/trip.ts:16 fn vehicleCfg
SYM game/src/sim/systems/trip.ts:21 fn bestTruck
SYM game/src/sim/systems/trip.ts:31 fn parkingSpot
SYM game/src/sim/systems/trip.ts:35 fn productPrice
SYM game/src/sim/systems/trip.ts:39 fn orderPrice
SYM game/src/sim/systems/trip.ts:65 fn animalSlots
SYM game/src/sim/systems/trip.ts:71 fn deliver
FILE game/src/sim/systems/wolves.ts 30.6KB 644L exports: Den,WolfMode,Wolf,isPup,hungerStage,WolfState,Zone,WolfEvent,spawnWolves,protectionZones,isProtected,spookAnimals,scareWolf,wolvesStep,+6
SYM game/src/sim/systems/wolves.ts:36 interface Den
SYM game/src/sim/systems/wolves.ts:43 type WolfMode
SYM game/src/sim/systems/wolves.ts:45 interface Wolf
SYM game/src/sim/systems/wolves.ts:67 fn isPup
SYM game/src/sim/systems/wolves.ts:72 fn hungerStage
SYM game/src/sim/systems/wolves.ts:78 interface WolfState
SYM game/src/sim/systems/wolves.ts:89 interface Zone
SYM game/src/sim/systems/wolves.ts:96 type WolfEvent
SYM game/src/sim/systems/wolves.ts:107 fn campSeed
SYM game/src/sim/systems/wolves.ts:113 fn spawnWolves
SYM game/src/sim/systems/wolves.ts:139 fn protectionZones
SYM game/src/sim/systems/wolves.ts:162 fn isProtected
SYM game/src/sim/systems/wolves.ts:170 fn moveToward
SYM game/src/sim/systems/wolves.ts:185 fn pushOut
SYM game/src/sim/systems/wolves.ts:203 fn spookAnimals
SYM game/src/sim/systems/wolves.ts:259 fn scareWolf
SYM game/src/sim/systems/wolves.ts:267 fn wolvesStep
SYM game/src/sim/systems/wolves.ts:461 fn nextDen
SYM game/src/sim/systems/wolves.ts:470 fn nearestPrey
SYM game/src/sim/systems/wolves.ts:490 fn raidStep
SYM game/src/sim/systems/wolves.ts:529 fn nightRaid
SYM game/src/sim/systems/wolves.ts:558 fn wolvesDaily
SYM game/src/sim/systems/wolves.ts:612 fn killWolf
SYM game/src/sim/systems/wolves.ts:617 fn endRaid
SYM game/src/sim/systems/wolves.ts:629 fn scareWolves
SYM game/src/sim/systems/wolves.ts:642 fn huntingWolves
FILE game/src/sim/terrain.ts 3.5KB 89L exports: smoothstep,riverZ,waterDistance,baseHeightAt,heightAt,waterLevel,sumHeightAt
SYM game/src/sim/terrain.ts:7 fn clamp
SYM game/src/sim/terrain.ts:8 const smoothstep
SYM game/src/sim/terrain.ts:14 fn riverZ
SYM game/src/sim/terrain.ts:22 fn waterDistance
SYM game/src/sim/terrain.ts:28 fn baseHeightAt
SYM game/src/sim/terrain.ts:54 fn heightAt
SYM game/src/sim/terrain.ts:77 fn waterLevel
SYM game/src/sim/terrain.ts:85 fn sumHeightAt
FILE tools/balance_sim/run.ts 24.6KB 430L
SYM tools/balance_sim/run.ts:41 fn applyOverrides
SYM tools/balance_sim/run.ts:62 fn escort
SYM tools/balance_sim/run.ts:69 fn dogsGuard
SYM tools/balance_sim/run.ts:75 fn collectAll
SYM tools/balance_sim/run.ts:85 fn processAll
SYM tools/balance_sim/run.ts:92 fn surplusMales
SYM tools/balance_sim/run.ts:107 fn tripIfUseful
SYM tools/balance_sim/run.ts:129 fn bestSpot
SYM tools/balance_sim/run.ts:166 fn rotateCamp
SYM tools/balance_sim/run.ts:182 fn buyPlan
SYM tools/balance_sim/run.ts:236 fn mediumStrategy
SYM tools/balance_sim/run.ts:321 fn run
SYM tools/balance_sim/run.ts:365 fn killsTxt
SYM tools/balance_sim/run.ts:372 fn median
SYM tools/balance_sim/run.ts:377 fn fmt
FILE tools/codemap.ts 8.3KB 203L exports: CONTEXT_START,CONTEXT_END,INDEXED_DOCS,Generated,extractSymbols,extractH2,generate
SYM tools/codemap.ts:18 const CONTEXT_START
SYM tools/codemap.ts:19 const CONTEXT_END
SYM tools/codemap.ts:21 const INDEXED_DOCS
SYM tools/codemap.ts:25 interface Generated
SYM tools/codemap.ts:30 fn norm
SYM tools/codemap.ts:34 fn readNorm
SYM tools/codemap.ts:38 fn walk
SYM tools/codemap.ts:52 fn lineCount
SYM tools/codemap.ts:57 fn kb
SYM tools/codemap.ts:70 fn extractSymbols
SYM tools/codemap.ts:106 fn extractH2
SYM tools/codemap.ts:127 fn shortLabel
SYM tools/codemap.ts:132 fn indexLine
SYM tools/codemap.ts:141 fn generate
SYM tools/codemap.ts:195 fn main
FILE game/tests/animals.test.ts 2.3KB 39L
FILE game/tests/breeding.test.ts 1.4KB 33L
FILE game/tests/clock.test.ts 2.3KB 47L
FILE game/tests/config.test.ts 0.6KB 16L
FILE game/tests/docs.test.ts 4.0KB 76L
FILE game/tests/dogs.test.ts 7.5KB 190L
FILE game/tests/grazing.test.ts 2.3KB 46L
FILE game/tests/helpers.ts 0.8KB 20L
FILE game/tests/herder.test.ts 7.0KB 153L
FILE game/tests/herds.test.ts 5.1KB 112L
FILE game/tests/night.test.ts 6.5KB 127L
FILE game/tests/pasture.test.ts 3.8KB 72L
FILE game/tests/playthrough.test.ts 6.3KB 133L
FILE game/tests/products.test.ts 3.0KB 56L
FILE game/tests/rng.test.ts 0.8KB 26L
FILE game/tests/seasons.test.ts 7.2KB 140L
FILE game/tests/sim.test.ts 1.4KB 32L
FILE game/tests/staff.test.ts 12.0KB 229L
FILE game/tests/style.test.ts 3.9KB 80L
FILE game/tests/trip.test.ts 9.2KB 173L
FILE game/tests/wolves.test.ts 14.7KB 337L
FILE docs/CONTEXT.md 11.9KB 95L
DOC docs/CONTEXT.md:12-18 ## 1. Тоглоом юу вэ
DOC docs/CONTEXT.md:19-28 ## 2. Стек ба командууд
DOC docs/CONTEXT.md:29-69 ## 3. Файлын зураглал (`game/src/`)
DOC docs/CONTEXT.md:70-72 ## 4. `data/*.json` → аль файл хэрэглэдэг
DOC docs/CONTEXT.md:73-81 ## 5. Архитектурын дүрэм ([[architecture]])
DOC docs/CONTEXT.md:82-85 ## 6. Баримтын давуу эрх (зөрчилдвөл дээд нь хүчинтэй)
DOC docs/CONTEXT.md:86-88 ## 7. Нээлттэй асуултууд
DOC docs/CONTEXT.md:89-95 ## 8. Баримтын хэсгийн индекс (мөрийн муж)
FILE docs/INDEX.md 11.1KB 115L
DOC docs/INDEX.md:16-30 ## 1. Унших дараалал ба давуу эрх
DOC docs/INDEX.md:31-86 ## 2. Баримтууд
DOC docs/INDEX.md:87-90 ## 3. Гол тоо
DOC docs/INDEX.md:91-109 ## 4. Нэр томьёо
DOC docs/INDEX.md:110-115 ## 5. Баримт засах дүрэм
FILE docs/architecture.md 17.4KB 234L
DOC docs/architecture.md:16-29 ## 1. Технологи
DOC docs/architecture.md:30-68 ## 2. Хавтасны бүтэц
DOC docs/architecture.md:69-138 ## 3. Гол зарчмууд
DOC docs/architecture.md:139-179 ## 4. Өгөгдлийн загвар (товч)
DOC docs/architecture.md:180-189 ## 5. Дүрслэл
DOC docs/architecture.md:190-197 ## 6. Хадгалалт (M6)
DOC docs/architecture.md:198-205 ## 7. Хэл
DOC docs/architecture.md:206-216 ## 8. Тест ба тэнцвэр
DOC docs/architecture.md:217-222 ## 9. Туршилтын цэс
DOC docs/architecture.md:223-234 ## 10. Ажиллуулах
FILE docs/decisions.md 16.8KB 133L
DOC docs/decisions.md:16-82 ## 0. Хэрэглэгчийн шийдвэрийн түүх
DOC docs/decisions.md:83-108 ## 13. Нээлттэй шийдвэрүүд 🙋 (бүх баримтаас нэгтгэсэн)
DOC docs/decisions.md:109-124 ## 14. Нээлттэй шийдвэр — бусад эх сурвалжаас нэгтгэсэн (2026-11-15)
DOC docs/decisions.md:125-133 ## 15. Баримтуудын зөрүү (2026-11-15-ны шилжүүлэлтээр илэрсэн, хэрэглэгч шийдэх)
FILE docs/grazing-livestock.md 27.4KB 316L
DOC docs/grazing-livestock.md:17-125 ## 1. Малын үзүүлэлтүүд
DOC docs/grazing-livestock.md:126-146 ## 2. Үнэ = амьдын жин × кг-ын үнэ
DOC docs/grazing-livestock.md:147-210 ## 3. Бэлчээрлэх механик: мал бодитоор өвс иднэ
DOC docs/grazing-livestock.md:211-233 ## 4. Бэлчээрийн төрлүүд (Хангай)
DOC docs/grazing-livestock.md:234-263 ## 5. Өвсний төрлүүд
DOC docs/grazing-livestock.md:264-301 ## 6. Цастай өдөр ба өвс тэжээл
DOC docs/grazing-livestock.md:302-309 ## 7. Хүрээ
DOC docs/grazing-livestock.md:310-316 ## Эх сурвалж
FILE docs/helpers-m5.md 7.1KB 61L
DOC docs/helpers-m5.md:14-32 ## 1. Хэрэглэгчийн шийдвэрүүд (2026-11-14)
DOC docs/helpers-m5.md:33-44 ## 2. Код
DOC docs/helpers-m5.md:45-55 ## 3. Тэнцвэр (улиралгүй үед; 6 seed × 200 өдөр, `--only Менежер,Залхуу`)
DOC docs/helpers-m5.md:56-61 ## 4. Хязгаарлалт / 🙋
FILE docs/milestones.md 8.9KB 45L
DOC docs/milestones.md:39-45 ## Эрсдэл
FILE docs/mvp-spec.md 40.9KB 386L
DOC docs/mvp-spec.md:17-22 ## 0. Хэрэглэгчийн шийдвэрийн түүх
DOC docs/mvp-spec.md:23-43 ## 1. Хүрээ
DOC docs/mvp-spec.md:44-62 ## 2. Цаг (M4.5, M5.5)
DOC docs/mvp-spec.md:63-78 ## 3. Эхлэл
DOC docs/mvp-spec.md:79-127 ## 4. Бүтээгдэхүүн: мал үлдээнэ, малчин цуглуулна (Farm Frenzy маяг)
DOC docs/mvp-spec.md:128-179 ## 5. Үнэ, тээвэр ба сумын төв
DOC docs/mvp-spec.md:180-222 ## 6. Туслах малчид (M5 — [[helpers-m5]])
DOC docs/mvp-spec.md:223-264 ## 7. Бэлчээр, бууц сэлгэх, доройтол
DOC docs/mvp-spec.md:265-294 ## 8. Чоно (M4, M4.5, B6)
DOC docs/mvp-spec.md:295-310 ## 9. Төллөлт ба нас (M5.5)
DOC docs/mvp-spec.md:311-348 ## 10. Тоглоомын зорилго ба замын тэмдэгтүүд
DOC docs/mvp-spec.md:349-371 ## 11. Прототипоос хасагдах, өөрчлөгдөх зүйл
DOC docs/mvp-spec.md:372-377 ## 12. Хөгжүүлэлтийн явц
DOC docs/mvp-spec.md:378-382 ## 13. Нээлттэй шийдвэрүүд 🙋
DOC docs/mvp-spec.md:383-386 ## Эх сурвалж
FILE docs/night-transport.md 9.4KB 106L
DOC docs/night-transport.md:18-32 ## 1. Цаг ба шөнө
DOC docs/night-transport.md:33-44 ## 2. Хотлох (хэрэглэгчийн дүрэм)
DOC docs/night-transport.md:45-68 ## 3. Сүү, ноос хоносон газраа (хэрэглэгчийн дүрэм)
DOC docs/night-transport.md:69-87 ## 4. Шөнийн чоно (хэрэглэгчийн дүрэм)
DOC docs/night-transport.md:88-103 ## 5. Тээвэр
DOC docs/night-transport.md:104-106 ## 6. Хэрэглэгчийн шийдвэр 🙋
FILE docs/plan/M6.md 9.7KB 60L
DOC docs/plan/M6.md:15-17 ## Зорилго
DOC docs/plan/M6.md:18-33 ## MVP «дууссан» шалгуур (D1–D10 — M6 ба M7-ийн нийт)
DOC docs/plan/M6.md:34-36 ## Одоогийн байдал
DOC docs/plan/M6.md:37-49 ## Блокууд
DOC docs/plan/M6.md:50-52 ## Нээлттэй асуулт
DOC docs/plan/M6.md:53-58 ## Эрсдэл
DOC docs/plan/M6.md:59-60 ## Хуваарь
FILE docs/plan/M7.md 5.7KB 31L
DOC docs/plan/M7.md:12-21 ## Блокууд
DOC docs/plan/M7.md:22-24 ## Асуулга (8 асуулт)
DOC docs/plan/M7.md:25-27 ## Нээлттэй асуулт
DOC docs/plan/M7.md:28-31 ## Эрсдэл
FILE docs/plan/V.md 8.0KB 67L
DOC docs/plan/V.md:13-15 ## Зорилго
DOC docs/plan/V.md:16-20 ## Гарах шалгуур ([[visuals-plan]] §V3–V5, §7.1)
DOC docs/plan/V.md:21-48 ## Блокууд ба чеклист (2026-11-15)
DOC docs/plan/V.md:49-51 ## Нээлттэй асуулт
DOC docs/plan/V.md:52-57 ## Зогссон цэг
DOC docs/plan/V.md:58-67 ## Шийдвэрийн чеклист
FILE docs/plan/playtest.md 4.4KB 48L
DOC docs/plan/playtest.md:13-18 ## A. FPS ба төхөөрөмж
DOC docs/plan/playtest.md:19-24 ## B. Харааны ба соёлын баталгаажуулалт ([[V]])
DOC docs/plan/playtest.md:25-48 ## C. Мэдрэмж, үе шат бүрээр
FILE docs/seasons-camps.md 10.2KB 104L
DOC docs/seasons-camps.md:17-40 ## 1. Хэрэглэгчийн шийдвэрүүд
DOC docs/seasons-camps.md:41-54 ## 2. Улирал
DOC docs/seasons-camps.md:55-67 ## 3. Бууцнууд
DOC docs/seasons-camps.md:68-73 ## 4. Саравчтай дулаан бууц, хүйтэн
DOC docs/seasons-camps.md:74-80 ## 5. Боодол өвс
DOC docs/seasons-camps.md:81-86 ## 6. Төллөлт
DOC docs/seasons-camps.md:87-92 ## 7. Отор (M5-ын үргэлжлэл)
DOC docs/seasons-camps.md:93-99 ## 8. Дүрслэл, UI
DOC docs/seasons-camps.md:100-104 ## 9. Тэнцвэр ба 🙋
FILE docs/terrain-review-ai.md 16.0KB 184L
DOC docs/terrain-review-ai.md:17-22 ## 0. Товч дүгнэлт
DOC docs/terrain-review-ai.md:23-34 ## 1. AI заавал дагах хязгаарлалт
DOC docs/terrain-review-ai.md:35-47 ## 2. P0: Өвс яагаад гацаадаг вэ (нотолгоо)
DOC docs/terrain-review-ai.md:48-118 ## 3. P0 засвар
DOC docs/terrain-review-ai.md:119-154 ## 4. P1: `visuals.json` ба кодын нийцэл
DOC docs/terrain-review-ai.md:155-162 ## 5. P2: Уншигдах байдал ба жижиг алдаа
DOC docs/terrain-review-ai.md:163-171 ## 6. Хүлээн авах шалгуур
DOC docs/terrain-review-ai.md:172-179 ## 7. Дараалал
DOC docs/terrain-review-ai.md:180-184 ## 8. Хаалтын тэмдэглэл (2026-11-14)
FILE docs/visuals-plan.md 28.3KB 277L
DOC docs/visuals-plan.md:19-31 ## 1. Зорилго
DOC docs/visuals-plan.md:32-40 ## 2. Зарчим
DOC docs/visuals-plan.md:41-96 ## 3. Хэв маяг (V0-д батлах)
DOC docs/visuals-plan.md:97-109 ## 4. Одоо байгаа зүйл
DOC docs/visuals-plan.md:110-215 ## 5. Үе шатууд
DOC docs/visuals-plan.md:216-233 ## 6. Чанарын түвшин
DOC docs/visuals-plan.md:234-257 ## 7. Хэмжилт
DOC docs/visuals-plan.md:258-261 ## 8. Хойшлогдох (V1+)
DOC docs/visuals-plan.md:262-274 ## 9. Шийдвэрүүд 🙋
DOC docs/visuals-plan.md:275-277 ## 10–11. Хэрэгжүүлэлтийн тэмдэглэл ба ажлын чеклист
FILE docs/water-horses-transport.md 11.5KB 162L
DOC docs/water-horses-transport.md:16-55 ## 1. Ус ба цангалт
DOC docs/water-horses-transport.md:56-74 ## 2. Худаг ба бензин (V1)
DOC docs/water-horses-transport.md:75-104 ## 3. Машин ба нүүдэл
DOC docs/water-horses-transport.md:105-142 ## 4. Адуу
DOC docs/water-horses-transport.md:143-150 ## 5. Эдийн засгийн нөлөө (анхны тооцоо, прототипын үнийн түвшин)
DOC docs/water-horses-transport.md:151-158 ## 6. Хэрэглэгчийн шийдвэр
DOC docs/water-horses-transport.md:159-162 ## Эх сурвалж
FILE docs/world-map-mvp.md 11.8KB 120L
DOC docs/world-map-mvp.md:19-26 ## 1. Хэрэглэгчийн шийдвэрүүд (2026-11-14)
DOC docs/world-map-mvp.md:27-59 ## 2. Газрын зураг
DOC docs/world-map-mvp.md:60-66 ## 3. 3D-д жолоодох ба гарах
DOC docs/world-map-mvp.md:67-73 ## 4. Хотонд ачаа бэлтгэх (T)
DOC docs/world-map-mvp.md:74-91 ## 5. Сумын төв 3D
DOC docs/world-map-mvp.md:92-98 ## 6. Өөр бууцанд очих
DOC docs/world-map-mvp.md:99-102 ## 7. Автомат аялал (бот, тест, жолооч)
DOC docs/world-map-mvp.md:103-114 ## 8. Тэнцвэр (M4.6-ын үеийн, 12 seed × 200–220 өдөр, 1 өдөр = 1× хурдаар 2.8 мин)
DOC docs/world-map-mvp.md:115-120 ## 9. Хэрэглэгчийн шийдвэр
