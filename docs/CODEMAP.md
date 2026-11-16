# CODEMAP — автоматаар үүсгэсэн (гараар бүү засаарай). Шинэчлэх: `cd game && npm run codemap`
# Хайх: `grep -n '<түлхүүр>' docs/CODEMAP.md` → олдсон мужийг л `sed -n 'a,bp' <файл>`. Ажлын эхэнд бүтнээр нь УНШИХГҮЙ.
# Мөр: FILE <зам> <хэмжээ> <мөр>L exports: … | SYM <зам>:<мөр> <төрөл> <нэр> | DOC <зам>:<эхлэл>-<төгсгөл> <гарчиг>
FILE game/src/animalPreview.ts 3.2KB 50L
SYM game/src/animalPreview.ts:34 fn frame
FILE game/src/device.ts 3.1KB 71L exports: isTouch,Quality,QUALITIES,QUALITY_NAME,quality,setQuality,QualitySpec,QUALITY_SPEC,Q,KEY_ICON,touchKeys
SYM game/src/device.ts:11 fn mq
SYM game/src/device.ts:14 const isTouch
SYM game/src/device.ts:17 type Quality
SYM game/src/device.ts:18 const QUALITIES
SYM game/src/device.ts:19 const QUALITY_NAME
SYM game/src/device.ts:22 fn stored
SYM game/src/device.ts:31 const quality
SYM game/src/device.ts:34 fn setQuality
SYM game/src/device.ts:42 interface QualitySpec
SYM game/src/device.ts:50 const QUALITY_SPEC
SYM game/src/device.ts:56 const Q
SYM game/src/device.ts:59 const KEY_ICON
SYM game/src/device.ts:64 fn touchKeys
FILE game/src/i18n/i18n.ts 1.7KB 41L exports: Lang,LANG_KEY,resolveLang,setLang,getLang,t
SYM game/src/i18n/i18n.ts:4 type Lang
SYM game/src/i18n/i18n.ts:6 const LANG_KEY
SYM game/src/i18n/i18n.ts:13 fn resolveLang
SYM game/src/i18n/i18n.ts:19 fn initialLang
SYM game/src/i18n/i18n.ts:29 fn setLang
SYM game/src/i18n/i18n.ts:33 fn getLang
SYM game/src/i18n/i18n.ts:38 fn t
FILE game/src/i18n/msg.ts 0.9KB 20L exports: tm
SYM game/src/i18n/msg.ts:8 fn param
SYM game/src/i18n/msg.ts:14 fn tm
FILE game/src/i18n/npcStrings.ts 0.8KB 16L exports: npcText,NPC_LINES,npcLine
SYM game/src/i18n/npcStrings.ts:11 fn npcText
SYM game/src/i18n/npcStrings.ts:14 const NPC_LINES
SYM game/src/i18n/npcStrings.ts:16 const npcLine
FILE game/src/input/controller.ts 17.6KB 399L exports: ActionKind,ControllerHooks,driverSendTarget,PlayerController
SYM game/src/input/controller.ts:19 type ActionKind
SYM game/src/input/controller.ts:21 interface ControllerHooks
SYM game/src/input/controller.ts:33 fn angDiff
SYM game/src/input/controller.ts:44 fn driverSendTarget
SYM game/src/input/controller.ts:54 class PlayerController
SYM game/src/input/controller.ts:82 method PlayerController.press
SYM game/src/input/controller.ts:156 method PlayerController.hold
SYM game/src/input/controller.ts:164 method PlayerController.shout
SYM game/src/input/controller.ts:170 method PlayerController.scare
SYM game/src/input/controller.ts:186 method PlayerController.interact
SYM game/src/input/controller.ts:215 method PlayerController.useAction
SYM game/src/input/controller.ts:240 method PlayerController.isDown
SYM game/src/input/controller.ts:245 method PlayerController.moveTo
SYM game/src/input/controller.ts:250 method PlayerController.update
SYM game/src/input/controller.ts:358 method PlayerController.drive
FILE game/src/input/touch.ts 12.0KB 268L exports: TouchHooks,TouchUI
SYM game/src/input/touch.ts:16 interface TouchHooks
SYM game/src/input/touch.ts:33 class TouchUI
SYM game/src/input/touch.ts:192 method TouchUI.enterLandscape
SYM game/src/input/touch.ts:196 method TouchUI.start
SYM game/src/input/touch.ts:202 method TouchUI.refreshInstall
SYM game/src/input/touch.ts:209 method TouchUI.install
SYM game/src/input/touch.ts:218 method TouchUI.bind
SYM game/src/input/touch.ts:236 method TouchUI.fullscreen
SYM game/src/input/touch.ts:249 method TouchUI.paused
SYM game/src/input/touch.ts:253 method TouchUI.portrait
SYM game/src/input/touch.ts:258 method TouchUI.update
FILE game/src/main.ts 33.2KB 562L
SYM game/src/main.ts:45 fn toast
SYM game/src/main.ts:69 fn start
SYM game/src/main.ts:537 fn boot
FILE game/src/persist/autosave.ts 4.7KB 102L exports: SaveReason,AutosaveDeps,Autosave,attachSimEvents,attachPageEvents
SYM game/src/persist/autosave.ts:11 type SaveReason
SYM game/src/persist/autosave.ts:13 interface AutosaveDeps
SYM game/src/persist/autosave.ts:26 class Autosave
SYM game/src/persist/autosave.ts:38 method Autosave.request
SYM game/src/persist/autosave.ts:43 method Autosave.flush
SYM game/src/persist/autosave.ts:54 method Autosave.saveNow
SYM game/src/persist/autosave.ts:81 method Autosave.idle
SYM game/src/persist/autosave.ts:87 fn attachSimEvents
SYM game/src/persist/autosave.ts:96 fn attachPageEvents
FILE game/src/persist/file.ts 2.3KB 54L exports: FILE_EXT,exportBytes,importBytes,fileName,downloadFile,readFile
SYM game/src/persist/file.ts:9 const FILE_EXT
SYM game/src/persist/file.ts:11 fn pipe
SYM game/src/persist/file.ts:17 fn exportBytes
SYM game/src/persist/file.ts:22 fn importBytes
SYM game/src/persist/file.ts:36 fn fileName
SYM game/src/persist/file.ts:42 fn downloadFile
SYM game/src/persist/file.ts:52 fn readFile
FILE game/src/persist/idb.ts 8.8KB 201L exports: SLOTS,DB_NAME,SlotInfo,fnv1a,StoreHooks,SaveStore,requestPersistence
SYM game/src/persist/idb.ts:12 const SLOTS
SYM game/src/persist/idb.ts:13 const DB_NAME
SYM game/src/persist/idb.ts:29 interface SlotInfo
SYM game/src/persist/idb.ts:40 fn fnv1a
SYM game/src/persist/idb.ts:49 fn intact
SYM game/src/persist/idb.ts:52 interface StoreHooks
SYM game/src/persist/idb.ts:57 class SaveStore
SYM game/src/persist/idb.ts:64 method SaveStore.available
SYM game/src/persist/idb.ts:68 method SaveStore.open
SYM game/src/persist/idb.ts:80 method SaveStore.close
SYM game/src/persist/idb.ts:122 method SaveStore.rows
SYM game/src/persist/idb.ts:130 method SaveStore.list
SYM game/src/persist/idb.ts:146 method SaveStore.load
SYM game/src/persist/idb.ts:174 method SaveStore.remove
SYM game/src/persist/idb.ts:187 fn checkSlot
SYM game/src/persist/idb.ts:192 fn requestPersistence
FILE game/src/persist/transfer.ts 3.9KB 72L exports: TransferError,TransferOptions,createTransfer,redeemTransfer
SYM game/src/persist/transfer.ts:10 class TransferError
SYM game/src/persist/transfer.ts:17 interface TransferOptions
SYM game/src/persist/transfer.ts:23 fn isOnline
SYM game/src/persist/transfer.ts:26 fn failFrom
SYM game/src/persist/transfer.ts:38 fn createTransfer
SYM game/src/persist/transfer.ts:56 fn redeemTransfer
FILE game/src/persist/transferCode.ts 2.1KB 38L exports: CODE_ALPHABET,CODE_LENGTH,TTL_SECONDS,MAX_BYTES,API_PATH,newCode,normalizeCode,formatCode,TransferErrorKind
SYM game/src/persist/transferCode.ts:5 const CODE_ALPHABET
SYM game/src/persist/transferCode.ts:6 const CODE_LENGTH
SYM game/src/persist/transferCode.ts:8 const TTL_SECONDS
SYM game/src/persist/transferCode.ts:10 const MAX_BYTES
SYM game/src/persist/transferCode.ts:11 const API_PATH
SYM game/src/persist/transferCode.ts:14 fn newCode
SYM game/src/persist/transferCode.ts:26 fn normalizeCode
SYM game/src/persist/transferCode.ts:34 fn formatCode
SYM game/src/persist/transferCode.ts:38 type TransferErrorKind
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
FILE game/src/render/animal/config.ts 17.8KB 203L exports: LookSpecies,LOOK_SPECIES,V3,Pair,BodyLook,Bump,SkirtLook,DLook,HornLook,HeadLook,MotionLook,Gait,VariantLook,SpeciesLook,+3
SYM game/src/render/animal/config.ts:7 type LookSpecies
SYM game/src/render/animal/config.ts:8 const LOOK_SPECIES
SYM game/src/render/animal/config.ts:9 type V3
SYM game/src/render/animal/config.ts:10 type Pair
SYM game/src/render/animal/config.ts:12 interface BodyLook
SYM game/src/render/animal/config.ts:13 interface Bump
SYM game/src/render/animal/config.ts:14 interface SkirtLook
SYM game/src/render/animal/config.ts:15 interface DLook
SYM game/src/render/animal/config.ts:28 interface HornLook
SYM game/src/render/animal/config.ts:29 interface HeadLook
SYM game/src/render/animal/config.ts:38 interface MotionLook
SYM game/src/render/animal/config.ts:44 interface Gait
SYM game/src/render/animal/config.ts:45 interface VariantLook
SYM game/src/render/animal/config.ts:46 interface SpeciesLook
SYM game/src/render/animal/config.ts:55 interface AnimalLook
SYM game/src/render/animal/config.ts:71 fn fail
SYM game/src/render/animal/config.ts:72 fn isObj
SYM game/src/render/animal/config.ts:73 fn obj
SYM game/src/render/animal/config.ts:74 fn num
SYM game/src/render/animal/config.ts:76 fn hex
SYM game/src/render/animal/config.ts:77 fn tup
SYM game/src/render/animal/config.ts:78 fn pair
SYM game/src/render/animal/config.ts:79 fn v3
SYM game/src/render/animal/config.ts:82 fn leaves
SYM game/src/render/animal/config.ts:90 fn copyExtra
SYM game/src/render/animal/config.ts:95 fn parseD
SYM game/src/render/animal/config.ts:116 fn parseHead
SYM game/src/render/animal/config.ts:141 fn parseMotion
SYM game/src/render/animal/config.ts:153 fn parseSpecies
SYM game/src/render/animal/config.ts:176 fn parseAnimalLook
SYM game/src/render/animal/config.ts:203 const animalLook
FILE game/src/render/animal/cow.ts 0.2KB 4L exports: cowModel
SYM game/src/render/animal/cow.ts:4 const cowModel
FILE game/src/render/animal/dog.ts 0.2KB 4L exports: dogModel
SYM game/src/render/animal/dog.ts:4 const dogModel
FILE game/src/render/animal/far.ts 7.6KB 128L exports: POSE_OF,FMAT,buildFarGeometry,FarSet
SYM game/src/render/animal/far.ts:17 const POSE_OF
SYM game/src/render/animal/far.ts:18 fn vec
SYM game/src/render/animal/far.ts:21 const FMAT
SYM game/src/render/animal/far.ts:38 fn repRec
SYM game/src/render/animal/far.ts:42 fn buildFarGeometry
SYM game/src/render/animal/far.ts:78 class FarSet
SYM game/src/render/animal/far.ts:108 method FarSet.push
SYM game/src/render/animal/far.ts:118 method FarSet.end
FILE game/src/render/animal/geo.ts 9.4KB 147L exports: smooth01,triOf,ellipsoid,bodyGeo,neckCurve,neckGeo,tailGeo,skirtGeo,patchK,bodyTopY,markGeo,prep
SYM game/src/render/animal/geo.ts:11 const smooth01
SYM game/src/render/animal/geo.ts:15 fn pos
SYM game/src/render/animal/geo.ts:16 const triOf
SYM game/src/render/animal/geo.ts:19 fn ellipsoid
SYM game/src/render/animal/geo.ts:32 fn bodyGeo
SYM game/src/render/animal/geo.ts:67 const neckCurve
SYM game/src/render/animal/geo.ts:68 fn neckGeo
SYM game/src/render/animal/geo.ts:77 fn tailGeo
SYM game/src/render/animal/geo.ts:87 fn skirtGeo
SYM game/src/render/animal/geo.ts:117 const patchK
SYM game/src/render/animal/geo.ts:125 fn bodyTopY
SYM game/src/render/animal/geo.ts:133 fn markGeo
SYM game/src/render/animal/geo.ts:140 fn prep
FILE game/src/render/animal/goat.ts 0.2KB 4L exports: goatModel
SYM game/src/render/animal/goat.ts:4 const goatModel
FILE game/src/render/animal/head.ts 11.3KB 151L exports: HeadQ,Q_DETAIL,Q_LIGHT,Q_FAR,HeadOpt,headGeo
SYM game/src/render/animal/head.ts:12 interface HeadQ
SYM game/src/render/animal/head.ts:14 const Q_DETAIL
SYM game/src/render/animal/head.ts:15 const Q_LIGHT
SYM game/src/render/animal/head.ts:18 const Q_FAR
SYM game/src/render/animal/head.ts:20 fn pos
SYM game/src/render/animal/head.ts:22 fn sqK
SYM game/src/render/animal/head.ts:24 fn dropAt
SYM game/src/render/animal/head.ts:25 fn radAt
SYM game/src/render/animal/head.ts:32 fn headSkull
SYM game/src/render/animal/head.ts:48 fn surf
SYM game/src/render/animal/head.ts:53 fn hornGeo
SYM game/src/render/animal/head.ts:72 fn beardGeo
SYM game/src/render/animal/head.ts:84 interface HeadOpt
SYM game/src/render/animal/head.ts:85 fn headGeo
FILE game/src/render/animal/horse.ts 0.2KB 4L exports: horseModel
SYM game/src/render/animal/horse.ts:4 const horseModel
FILE game/src/render/animal/legs.ts 4.7KB 78L exports: legRm,legLens,legUpper,legLower,hockKnee
SYM game/src/render/animal/legs.ts:12 const legRm
SYM game/src/render/animal/legs.ts:13 fn legLens
SYM game/src/render/animal/legs.ts:18 fn lathe
SYM game/src/render/animal/legs.ts:25 fn hoofGeo
SYM game/src/render/animal/legs.ts:30 fn legUpper
SYM game/src/render/animal/legs.ts:43 fn legLower
SYM game/src/render/animal/legs.ts:67 fn merge2
SYM game/src/render/animal/legs.ts:75 fn hockKnee
FILE game/src/render/animal/lod.ts 14.9KB 226L exports: Level,Rec,Colors,PartDef,LMAT,buildParts,trisOf,RestPoses,AnimalSet
SYM game/src/render/animal/lod.ts:17 type Level
SYM game/src/render/animal/lod.ts:19 interface Rec
SYM game/src/render/animal/lod.ts:20 interface Colors
SYM game/src/render/animal/lod.ts:22 interface PartDef
SYM game/src/render/animal/lod.ts:35 fn vec
SYM game/src/render/animal/lod.ts:36 const LMAT
SYM game/src/render/animal/lod.ts:51 fn buildParts
SYM game/src/render/animal/lod.ts:137 const trisOf
SYM game/src/render/animal/lod.ts:141 class RestPoses
SYM game/src/render/animal/lod.ts:145 method RestPoses.get
SYM game/src/render/animal/lod.ts:158 class AnimalSet
SYM game/src/render/animal/lod.ts:187 method AnimalSet.put
SYM game/src/render/animal/lod.ts:204 method AnimalSet.push
SYM game/src/render/animal/lod.ts:209 method AnimalSet.pushRest
SYM game/src/render/animal/lod.ts:212 method AnimalSet.end
FILE game/src/render/animal/model.ts 2.7KB 48L exports: AnimalModel,createModel,ageIdxOf
SYM game/src/render/animal/model.ts:10 interface AnimalModel
SYM game/src/render/animal/model.ts:23 fn mixHex
SYM game/src/render/animal/model.ts:24 fn hash
SYM game/src/render/animal/model.ts:26 fn createModel
SYM game/src/render/animal/model.ts:48 const ageIdxOf
FILE game/src/render/animal/pose.ts 14.7KB 204L exports: Action,LegNode,PoseState,Rig,PoseInput,newState,makeRig,actionsOf,fitAction,gaitFor,poseAnimal,settle
SYM game/src/render/animal/pose.ts:12 type Action
SYM game/src/render/animal/pose.ts:16 interface LegNode
SYM game/src/render/animal/pose.ts:18 interface PoseState
SYM game/src/render/animal/pose.ts:24 interface Rig
SYM game/src/render/animal/pose.ts:31 interface PoseInput
SYM game/src/render/animal/pose.ts:47 fn rnd
SYM game/src/render/animal/pose.ts:48 const newState
SYM game/src/render/animal/pose.ts:50 fn group
SYM game/src/render/animal/pose.ts:52 fn makeRig
SYM game/src/render/animal/pose.ts:64 fn actionsOf
SYM game/src/render/animal/pose.ts:68 fn fitAction
SYM game/src/render/animal/pose.ts:83 fn gaitFor
SYM game/src/render/animal/pose.ts:93 fn poseAnimal
SYM game/src/render/animal/pose.ts:198 fn settle
FILE game/src/render/animal/ride.ts 1.7KB 23L exports: horseShown,horseWithers,riderSeat
SYM game/src/render/animal/ride.ts:9 fn horseShown
SYM game/src/render/animal/ride.ts:14 fn horseWithers
SYM game/src/render/animal/ride.ts:20 fn riderSeat
FILE game/src/render/animal/shapes.ts 10.2KB 156L exports: twoFaced,maneGeo,horseTailGeo,ruffGeo,bushyTailGeo,cowTailGeo,longTailGeo,dewlapGeo,udderGeo,saddleDims,saddleGeo,patchCyl
SYM game/src/render/animal/shapes.ts:12 fn twoFaced
SYM game/src/render/animal/shapes.ts:23 fn maneGeo
SYM game/src/render/animal/shapes.ts:43 fn horseTailGeo
SYM game/src/render/animal/shapes.ts:54 fn ruffGeo
SYM game/src/render/animal/shapes.ts:65 fn bushyTailGeo
SYM game/src/render/animal/shapes.ts:84 fn cowTailGeo
SYM game/src/render/animal/shapes.ts:94 fn longTailGeo
SYM game/src/render/animal/shapes.ts:102 fn dewlapGeo
SYM game/src/render/animal/shapes.ts:108 fn udderGeo
SYM game/src/render/animal/shapes.ts:114 const saddleDims
SYM game/src/render/animal/shapes.ts:117 fn saddleGeo
SYM game/src/render/animal/shapes.ts:148 fn patchCyl
FILE game/src/render/animal/sheep.ts 0.2KB 4L exports: sheepModel
SYM game/src/render/animal/sheep.ts:4 const sheepModel
FILE game/src/render/animal/static.ts 3.8KB 62L exports: StaticOpts,StaticAnimal,bakeAnimal
SYM game/src/render/animal/static.ts:23 interface StaticOpts
SYM game/src/render/animal/static.ts:24 interface StaticAnimal
SYM game/src/render/animal/static.ts:30 fn bakeAnimal
FILE game/src/render/animal/view.ts 10.7KB 181L exports: MODEL_SPECIES,hasModel,Placed,placedOf,ModelAnimals
SYM game/src/render/animal/view.ts:25 const MODEL_SPECIES
SYM game/src/render/animal/view.ts:26 const hasModel
SYM game/src/render/animal/view.ts:32 interface Placed
SYM game/src/render/animal/view.ts:53 fn placedOf
SYM game/src/render/animal/view.ts:68 class ModelAnimals
SYM game/src/render/animal/view.ts:84 method ModelAnimals.get
SYM game/src/render/animal/view.ts:97 method ModelAnimals.applyQuality
SYM game/src/render/animal/view.ts:117 method ModelAnimals.flush
SYM game/src/render/animal/view.ts:142 method ModelAnimals.place
SYM game/src/render/animal/view.ts:172 method ModelAnimals.newLight
FILE game/src/render/animal/wolf.ts 0.2KB 4L exports: wolfModel
SYM game/src/render/animal/wolf.ts:4 const wolfModel
FILE game/src/render/animals.ts 4.0KB 87L exports: AnimalsView
SYM game/src/render/animals.ts:25 class AnimalsView
SYM game/src/render/animals.ts:37 method AnimalsView.setQuality
SYM game/src/render/animals.ts:43 method AnimalsView.snapshot
SYM game/src/render/animals.ts:57 method AnimalsView.update
SYM game/src/render/animals.ts:83 method AnimalsView.reset
FILE game/src/render/building/civic.ts 41.6KB 327L exports: hipRoof,buildPublic,bandQuad,flares,buildTemple,railRun,buildMarket,floodlight,buildStadium,buildWrestle
SYM game/src/render/building/civic.ts:9 fn hipRoof
SYM game/src/render/building/civic.ts:19 fn buildPublic
SYM game/src/render/building/civic.ts:97 fn bandQuad
SYM game/src/render/building/civic.ts:101 fn flares
SYM game/src/render/building/civic.ts:104 fn buildTemple
SYM game/src/render/building/civic.ts:203 fn railRun
SYM game/src/render/building/civic.ts:211 fn buildMarket
SYM game/src/render/building/civic.ts:237 fn floodlight
SYM game/src/render/building/civic.ts:245 fn buildStadium
SYM game/src/render/building/civic.ts:276 fn buildWrestle
FILE game/src/render/building/config.ts 8.5KB 108L exports: BuildingConfig,TownEntry,TownConfig,buildingConfigErrors,validateBuildingData,BUILDING_CONFIG,TOWN
SYM game/src/render/building/config.ts:9 fn isObj
SYM game/src/render/building/config.ts:14 type BuildingConfig
SYM game/src/render/building/config.ts:16 interface TownEntry
SYM game/src/render/building/config.ts:31 interface TownConfig
SYM game/src/render/building/config.ts:47 fn collectErrors
SYM game/src/render/building/config.ts:99 fn buildingConfigErrors
SYM game/src/render/building/config.ts:101 fn validateBuildingData
SYM game/src/render/building/config.ts:107 const BUILDING_CONFIG
SYM game/src/render/building/config.ts:108 const TOWN
FILE game/src/render/building/core.ts 26.4KB 260L exports: sc,px2uv,rot,buildingAtlas,bandV,wallQuad,slab,panel,shadeDown,SIGN_KEYS,signDef,signRect,hCyl,groundQuad,+2
SYM game/src/render/building/core.ts:7 const sc
SYM game/src/render/building/core.ts:8 const px2uv
SYM game/src/render/building/core.ts:9 const rot
SYM game/src/render/building/core.ts:15 fn buildingAtlas
SYM game/src/render/building/core.ts:220 const bandV
SYM game/src/render/building/core.ts:222 fn wallQuad
SYM game/src/render/building/core.ts:229 fn slab
SYM game/src/render/building/core.ts:239 fn panel
SYM game/src/render/building/core.ts:247 const shadeDown
SYM game/src/render/building/core.ts:250 const SIGN_KEYS
SYM game/src/render/building/core.ts:251 const signDef
SYM game/src/render/building/core.ts:252 const signRect
SYM game/src/render/building/core.ts:253 fn hCyl
SYM game/src/render/building/core.ts:258 const groundQuad
SYM game/src/render/building/core.ts:259 const pt3
SYM game/src/render/building/core.ts:260 const dirRot
FILE game/src/render/building/houses.ts 18.1KB 199L exports: buildHouse,buildToilet,leanTo,roofHex,buildWoodshed,buildAnimalShed,buildGreenhouse,buildKennel,plantGeo,pathSeg
SYM game/src/render/building/houses.ts:7 fn buildHouse
SYM game/src/render/building/houses.ts:85 fn buildToilet
SYM game/src/render/building/houses.ts:103 fn leanTo
SYM game/src/render/building/houses.ts:113 const roofHex
SYM game/src/render/building/houses.ts:115 fn buildWoodshed
SYM game/src/render/building/houses.ts:128 fn buildAnimalShed
SYM game/src/render/building/houses.ts:144 fn buildGreenhouse
SYM game/src/render/building/houses.ts:163 fn buildKennel
SYM game/src/render/building/houses.ts:176 fn plantGeo
SYM game/src/render/building/houses.ts:190 fn pathSeg
FILE game/src/render/building/index.ts 7.8KB 132L exports: BuildingDoor,BuildingRoom,BuildingPoint,BuildingWheel,BuiltBuilding,BuildOpts,makeBuilding,Khashaa,makeKhashaa,appendAt,BuildingMaterials,makeBuildingMaterials,emptyGeo,PlotSpec,+2
SYM game/src/render/building/index.ts:21 interface BuildingDoor
SYM game/src/render/building/index.ts:22 interface BuildingRoom
SYM game/src/render/building/index.ts:23 interface BuildingPoint
SYM game/src/render/building/index.ts:24 interface BuildingWheel
SYM game/src/render/building/index.ts:25 interface BuiltBuilding
SYM game/src/render/building/index.ts:41 interface BuildOpts
SYM game/src/render/building/index.ts:44 fn makeBuilding
SYM game/src/render/building/index.ts:48 interface Khashaa
SYM game/src/render/building/index.ts:50 fn makeKhashaa
SYM game/src/render/building/index.ts:54 fn makeAny
SYM game/src/render/building/index.ts:79 fn appendAt
SYM game/src/render/building/index.ts:85 interface BuildingMaterials
SYM game/src/render/building/index.ts:93 fn makeBuildingMaterials
SYM game/src/render/building/index.ts:100 const emptyGeo
SYM game/src/render/building/index.ts:102 interface PlotSpec
SYM game/src/render/building/index.ts:110 interface Plot
SYM game/src/render/building/index.ts:132 fn makePlot
FILE game/src/render/building/interior.ts 19.1KB 163L exports: buildInterior,mirroredHouse,mirrorGeoX,makeInterior,trimFrontStrip
SYM game/src/render/building/interior.ts:7 fn buildInterior
SYM game/src/render/building/interior.ts:116 fn mirroredHouse
SYM game/src/render/building/interior.ts:120 fn mirrorGeoX
SYM game/src/render/building/interior.ts:128 fn makeInterior
SYM game/src/render/building/interior.ts:151 fn trimFrontStrip
FILE game/src/render/building/interiorData.ts 2.3KB 31L exports: HouseInteriorData,houseInteriorData
SYM game/src/render/building/interiorData.ts:5 fn r3
SYM game/src/render/building/interiorData.ts:6 interface HouseInteriorData
SYM game/src/render/building/interiorData.ts:15 fn houseInteriorData
FILE game/src/render/building/publicInterior.ts 51.7KB 449L exports: makePublicInterior
SYM game/src/render/building/publicInterior.ts:7 fn lth
SYM game/src/render/building/publicInterior.ts:9 fn appendY
SYM game/src/render/building/publicInterior.ts:11 fn discZ
SYM game/src/render/building/publicInterior.ts:19 fn makePublicInterior
SYM game/src/render/building/publicInterior.ts:56 fn furnishSchool
SYM game/src/render/building/publicInterior.ts:118 fn chair
SYM game/src/render/building/publicInterior.ts:125 fn studentDesk
SYM game/src/render/building/publicInterior.ts:133 fn furnishTemple
SYM game/src/render/building/publicInterior.ts:241 fn wuv
SYM game/src/render/building/publicInterior.ts:243 fn swivel
SYM game/src/render/building/publicInterior.ts:251 fn monitor
SYM game/src/render/building/publicInterior.ts:253 fn officeDesk
SYM game/src/render/building/publicInterior.ts:262 fn cabinet
SYM game/src/render/building/publicInterior.ts:269 fn waitRow
SYM game/src/render/building/publicInterior.ts:277 fn flagMN
SYM game/src/render/building/publicInterior.ts:288 fn emblem
SYM game/src/render/building/publicInterior.ts:293 fn signBoard
SYM game/src/render/building/publicInterior.ts:295 fn plant
SYM game/src/render/building/publicInterior.ts:299 fn furnishAdmin
SYM game/src/render/building/publicInterior.ts:334 fn furnishBank
SYM game/src/render/building/publicInterior.ts:374 fn milkCan
SYM game/src/render/building/publicInterior.ts:381 fn woolSack
SYM game/src/render/building/publicInterior.ts:391 fn furnishMilk
FILE game/src/render/building/shops.ts 21.1KB 175L exports: buildShop,goods,buildMilkWool,makeMoto,buildCarDealer,buildFuel,buildWoolStore
SYM game/src/render/building/shops.ts:10 fn buildShop
SYM game/src/render/building/shops.ts:58 fn goods
SYM game/src/render/building/shops.ts:82 fn buildMilkWool
SYM game/src/render/building/shops.ts:104 fn makeMoto
SYM game/src/render/building/shops.ts:113 fn buildCarDealer
SYM game/src/render/building/shops.ts:136 fn buildFuel
SYM game/src/render/building/shops.ts:162 fn buildWoolStore
FILE game/src/render/building/town.ts 2.1KB 39L exports: Season,TownWheel,TownPart,TownBuilder,LabModel,labModel,gerSlotLocal
SYM game/src/render/building/town.ts:10 type Season
SYM game/src/render/building/town.ts:11 interface TownWheel
SYM game/src/render/building/town.ts:12 interface TownPart
SYM game/src/render/building/town.ts:15 class TownBuilder
SYM game/src/render/building/town.ts:19 method TownBuilder.build
SYM game/src/render/building/town.ts:26 interface LabModel
SYM game/src/render/building/town.ts:28 fn labModel
SYM game/src/render/building/town.ts:36 fn gerSlotLocal
FILE game/src/render/building/yard.ts 14.7KB 149L exports: buildKhashaa,makePorter,makePlot
SYM game/src/render/building/yard.ts:11 fn buildKhashaa
SYM game/src/render/building/yard.ts:84 fn makePorter
SYM game/src/render/building/yard.ts:108 fn makePlot
FILE game/src/render/camclip.ts 4.7KB 82L exports: CamBox,CamCyl,CamSolids,V3,CAM_MARGIN,clipThroughSolids
SYM game/src/render/camclip.ts:9 interface CamBox
SYM game/src/render/camclip.ts:11 interface CamCyl
SYM game/src/render/camclip.ts:12 interface CamSolids
SYM game/src/render/camclip.ts:14 type V3
SYM game/src/render/camclip.ts:17 const CAM_MARGIN
SYM game/src/render/camclip.ts:24 fn slabHit
SYM game/src/render/camclip.ts:38 fn boxHit
SYM game/src/render/camclip.ts:48 fn cylHit
SYM game/src/render/camclip.ts:70 fn clipThroughSolids
FILE game/src/render/camera.ts 9.3KB 179L exports: FollowCamera
SYM game/src/render/camera.ts:15 class FollowCamera
SYM game/src/render/camera.ts:39 method FollowCamera.span
SYM game/src/render/camera.ts:125 method FollowCamera.update
SYM game/src/render/camera.ts:175 method FollowCamera.resize
FILE game/src/render/character/animate.ts 10.2KB 188L exports: CharacterPose,animateCharacter
SYM game/src/render/character/animate.ts:11 interface CharacterPose
SYM game/src/render/character/animate.ts:27 fn solveLeg
SYM game/src/render/character/animate.ts:52 fn sstep
SYM game/src/render/character/animate.ts:58 fn animateCharacter
FILE game/src/render/character/bake.ts 14.1KB 236L exports: flipWinding,BakeOptions,bakeSkinned,addOutline,StaticPart,StaticBakeOptions,bakeStatic,staticMeshes
SYM game/src/render/character/bake.ts:16 fn flipWinding
SYM game/src/render/character/bake.ts:26 interface BakeOptions
SYM game/src/render/character/bake.ts:37 fn bakeSkinned
SYM game/src/render/character/bake.ts:143 fn addOutline
SYM game/src/render/character/bake.ts:155 interface StaticPart
SYM game/src/render/character/bake.ts:160 interface StaticBakeOptions
SYM game/src/render/character/bake.ts:172 fn bakeStatic
SYM game/src/render/character/bake.ts:229 fn staticMeshes
FILE game/src/render/character/crowd.ts 4.7KB 86L exports: CrowdPart,CrowdLook,makeCrowdParts,makeCrowdFar
SYM game/src/render/character/crowd.ts:16 interface CrowdPart
SYM game/src/render/character/crowd.ts:22 interface CrowdLook
SYM game/src/render/character/crowd.ts:28 fn makeCrowdParts
SYM game/src/render/character/crowd.ts:59 fn makeCrowdFar
FILE game/src/render/character/face.ts 14.2KB 235L exports: Emotion,FaceState,FacePainter,FaceSpec,EMOTIONS,faceOffset,liveFace,atlasCount,atlasFace,staticFaceMat
SYM game/src/render/character/face.ts:14 interface Emotion
SYM game/src/render/character/face.ts:16 interface FaceState
SYM game/src/render/character/face.ts:17 interface FacePainter
SYM game/src/render/character/face.ts:19 type FaceSpec
SYM game/src/render/character/face.ts:22 const EMOTIONS
SYM game/src/render/character/face.ts:37 const faceOffset
SYM game/src/render/character/face.ts:44 fn drawFace
SYM game/src/render/character/face.ts:134 fn faceCanvas
SYM game/src/render/character/face.ts:144 fn keyOf
SYM game/src/render/character/face.ts:151 fn liveFace
SYM game/src/render/character/face.ts:175 fn atlasTexture
SYM game/src/render/character/face.ts:196 const atlasCount
SYM game/src/render/character/face.ts:199 fn atlasFace
SYM game/src/render/character/face.ts:223 fn staticFaceMat
FILE game/src/render/character/geom.ts 11.1KB 183L exports: Pt,Section,LatheOpt,mix,foldK,noOut,profile,ring,Detail,Kit,makeKit
SYM game/src/render/character/geom.ts:8 type Pt
SYM game/src/render/character/geom.ts:10 type Section
SYM game/src/render/character/geom.ts:11 interface LatheOpt
SYM game/src/render/character/geom.ts:23 const mix
SYM game/src/render/character/geom.ts:24 const foldK
SYM game/src/render/character/geom.ts:26 fn noOut
SYM game/src/render/character/geom.ts:28 fn profile
SYM game/src/render/character/geom.ts:33 const ring
SYM game/src/render/character/geom.ts:41 type Detail
SYM game/src/render/character/geom.ts:43 interface Kit
SYM game/src/render/character/geom.ts:66 fn makeKit
FILE game/src/render/character/lab.ts 14.9KB 262L
SYM game/src/render/character/lab.ts:35 fn startLab
SYM game/src/render/character/lab.ts:129 fn startLineup
FILE game/src/render/character/labShots.ts 5.1KB 96L exports: ShotApi,SHOTS,labScene,labRenderer,ShotResult,renderShot,hashPixels
SYM game/src/render/character/labShots.ts:10 interface ShotApi
SYM game/src/render/character/labShots.ts:18 const SHOTS
SYM game/src/render/character/labShots.ts:36 fn labScene
SYM game/src/render/character/labShots.ts:50 fn labRenderer
SYM game/src/render/character/labShots.ts:61 interface ShotResult
SYM game/src/render/character/labShots.ts:64 fn renderShot
SYM game/src/render/character/labShots.ts:92 fn hashPixels
FILE game/src/render/character/materials.ts 11.7KB 172L exports: css,darken,lighten,libraryStats,canvasTex,outline,flat,smooth,doubleSided,vertexColored,fabric,sleeve,cuff,silk,+5
SYM game/src/render/character/materials.ts:9 const css
SYM game/src/render/character/materials.ts:10 const darken
SYM game/src/render/character/materials.ts:12 fn lighten
SYM game/src/render/character/materials.ts:19 fn memo
SYM game/src/render/character/materials.ts:24 fn memoTex
SYM game/src/render/character/materials.ts:30 const libraryStats
SYM game/src/render/character/materials.ts:33 fn canvasTex
SYM game/src/render/character/materials.ts:43 fn lcg
SYM game/src/render/character/materials.ts:47 const outline
SYM game/src/render/character/materials.ts:49 const flat
SYM game/src/render/character/materials.ts:51 const smooth
SYM game/src/render/character/materials.ts:53 const doubleSided
SYM game/src/render/character/materials.ts:55 const vertexColored
SYM game/src/render/character/materials.ts:59 fn feltTex
SYM game/src/render/character/materials.ts:68 fn meanderTex
SYM game/src/render/character/materials.ts:81 fn drawBrocade
SYM game/src/render/character/materials.ts:96 fn brocadeTex
SYM game/src/render/character/materials.ts:97 fn brocadeSleeveTex
SYM game/src/render/character/materials.ts:99 fn furTex
SYM game/src/render/character/materials.ts:110 fn hairTex
SYM game/src/render/character/materials.ts:122 fn drawKnot
SYM game/src/render/character/materials.ts:137 fn bootShaftTex
SYM game/src/render/character/materials.ts:154 const fabric
SYM game/src/render/character/materials.ts:156 const sleeve
SYM game/src/render/character/materials.ts:158 const cuff
SYM game/src/render/character/materials.ts:160 const silk
SYM game/src/render/character/materials.ts:163 const fur
SYM game/src/render/character/materials.ts:166 const felt
SYM game/src/render/character/materials.ts:168 const cap
SYM game/src/render/character/materials.ts:169 const hair
SYM game/src/render/character/materials.ts:171 const bootShaft
FILE game/src/render/character/parts/arm.ts 7.7KB 118L exports: Curl,Arm,buildArm
SYM game/src/render/character/parts/arm.ts:10 type Curl
SYM game/src/render/character/parts/arm.ts:11 interface Arm
SYM game/src/render/character/parts/arm.ts:20 fn buildArm
FILE game/src/render/character/parts/hats.ts 17.1KB 268L exports: HatBuilder,HATS
SYM game/src/render/character/parts/hats.ts:12 fn toortsog
SYM game/src/render/character/parts/hats.ts:86 fn fox
SYM game/src/render/character/parts/hats.ts:121 fn scarfHat
SYM game/src/render/character/parts/hats.ts:197 fn shawl
SYM game/src/render/character/parts/hats.ts:253 fn ribbon
SYM game/src/render/character/parts/hats.ts:266 type HatBuilder
SYM game/src/render/character/parts/hats.ts:268 const HATS
FILE game/src/render/character/parts/head.ts 9.7KB 151L exports: headProfile,profileRadius,headSegments,buildHead
SYM game/src/render/character/parts/head.ts:13 fn headProfile
SYM game/src/render/character/parts/head.ts:24 fn profileRadius
SYM game/src/render/character/parts/head.ts:36 const headSegments
SYM game/src/render/character/parts/head.ts:38 fn headGeo
SYM game/src/render/character/parts/head.ts:45 fn hairTopGeo
SYM game/src/render/character/parts/head.ts:53 fn hairGeo
SYM game/src/render/character/parts/head.ts:82 fn braid
SYM game/src/render/character/parts/head.ts:106 fn buildHair
SYM game/src/render/character/parts/head.ts:137 fn buildHead
FILE game/src/render/character/parts/leg.ts 6.1KB 62L exports: buildLeg
SYM game/src/render/character/parts/leg.ts:21 fn buildLeg
FILE game/src/render/character/parts/torso.ts 13.2KB 169L exports: buildBodies
SYM game/src/render/character/parts/torso.ts:18 fn chestR
SYM game/src/render/character/parts/torso.ts:29 fn buildBody
SYM game/src/render/character/parts/torso.ts:110 fn buildApron
SYM game/src/render/character/parts/torso.ts:120 fn buildVest
SYM game/src/render/character/parts/torso.ts:152 fn winterHem
SYM game/src/render/character/parts/torso.ts:161 fn buildBodies
FILE game/src/render/character/rig.ts 9.7KB 182L exports: Pair,CharacterRig,BuildOptions,buildCharacter,wearOf,showOutfit,dressCharacter
SYM game/src/render/character/rig.ts:20 type Pair
SYM game/src/render/character/rig.ts:22 interface CharacterRig
SYM game/src/render/character/rig.ts:50 interface BuildOptions
SYM game/src/render/character/rig.ts:62 fn buildCharacter
SYM game/src/render/character/rig.ts:142 fn applyFigure
SYM game/src/render/character/rig.ts:162 fn wearOf
SYM game/src/render/character/rig.ts:169 fn showOutfit
SYM game/src/render/character/rig.ts:178 fn dressCharacter
FILE game/src/render/character/spec.ts 22.3KB 349L exports: BootPalette,BodyForm,ToortsogLook,FoxHatLook,HairStyle,HAIR_STYLES,Beard,BEARDS,EyeShape,EYE_SHAPES,BrowShape,BROW_SHAPES,CharacterHat,CHARACTER_HATS,+23
SYM game/src/render/character/spec.ts:10 interface BootPalette
SYM game/src/render/character/spec.ts:11 interface BodyForm
SYM game/src/render/character/spec.ts:12 interface ToortsogLook
SYM game/src/render/character/spec.ts:13 interface FoxHatLook
SYM game/src/render/character/spec.ts:15 type HairStyle
SYM game/src/render/character/spec.ts:16 const HAIR_STYLES
SYM game/src/render/character/spec.ts:17 type Beard
SYM game/src/render/character/spec.ts:18 const BEARDS
SYM game/src/render/character/spec.ts:19 type EyeShape
SYM game/src/render/character/spec.ts:20 const EYE_SHAPES
SYM game/src/render/character/spec.ts:21 type BrowShape
SYM game/src/render/character/spec.ts:22 const BROW_SHAPES
SYM game/src/render/character/spec.ts:24 type CharacterHat
SYM game/src/render/character/spec.ts:25 const CHARACTER_HATS
SYM game/src/render/character/spec.ts:28 interface HeadShape
SYM game/src/render/character/spec.ts:30 interface ScarfLook
SYM game/src/render/character/spec.ts:33 interface Figure
SYM game/src/render/character/spec.ts:46 interface FaceLook
SYM game/src/render/character/spec.ts:62 interface NpcDetail
SYM game/src/render/character/spec.ts:64 interface CharacterSpec
SYM game/src/render/character/spec.ts:88 type RoleKey
SYM game/src/render/character/spec.ts:89 const ROLE_KEYS
SYM game/src/render/character/spec.ts:92 interface CrowdNightSpec
SYM game/src/render/character/spec.ts:93 interface CrowdLookSpec
SYM game/src/render/character/spec.ts:95 type TalkEventName
SYM game/src/render/character/spec.ts:96 const TALK_EVENTS
SYM game/src/render/character/spec.ts:98 type EmotionSeq
SYM game/src/render/character/spec.ts:100 interface TalkConfig
SYM game/src/render/character/spec.ts:103 interface CharactersData
SYM game/src/render/character/spec.ts:117 interface CharacterColors
SYM game/src/render/character/spec.ts:119 const OUTFIT_BODIES
SYM game/src/render/character/spec.ts:120 const OUTFIT_HATS
SYM game/src/render/character/spec.ts:123 fn isObj
SYM game/src/render/character/spec.ts:125 fn fail
SYM game/src/render/character/spec.ts:129 fn group
SYM game/src/render/character/spec.ts:134 fn color
SYM game/src/render/character/spec.ts:138 fn num
SYM game/src/render/character/spec.ts:142 fn colors
SYM game/src/render/character/spec.ts:149 fn oneOf
SYM game/src/render/character/spec.ts:153 fn pair
SYM game/src/render/character/spec.ts:157 fn parseFigure
SYM game/src/render/character/spec.ts:164 fn bool
SYM game/src/render/character/spec.ts:165 fn parseFace
SYM game/src/render/character/spec.ts:187 fn parseScarf
SYM game/src/render/character/spec.ts:191 fn parseWear
SYM game/src/render/character/spec.ts:203 fn parseSpec
SYM game/src/render/character/spec.ts:246 fn merge
SYM game/src/render/character/spec.ts:253 fn validateCharacters
SYM game/src/render/character/spec.ts:328 const characters
SYM game/src/render/character/spec.ts:331 fn characterSpec
SYM game/src/render/character/spec.ts:338 fn withColors
SYM game/src/render/character/spec.ts:346 fn helperSpec
FILE game/src/render/character/talk.ts 3.2KB 63L exports: TalkBus,talkBus,postTalkEvent,EmotionQueue,SpeedSmoother,turnToward
SYM game/src/render/character/talk.ts:9 interface TalkBus
SYM game/src/render/character/talk.ts:16 const talkBus
SYM game/src/render/character/talk.ts:18 fn postTalkEvent
SYM game/src/render/character/talk.ts:24 class EmotionQueue
SYM game/src/render/character/talk.ts:29 method EmotionQueue.step
SYM game/src/render/character/talk.ts:43 class SpeedSmoother
SYM game/src/render/character/talk.ts:47 method SpeedSmoother.step
SYM game/src/render/character/talk.ts:59 fn turnToward
FILE game/src/render/characters.ts 17.1KB 342L exports: makeDog,poseDogLying,CharactersView
SYM game/src/render/characters.ts:29 fn makeDog
SYM game/src/render/characters.ts:33 fn poseDogLying
SYM game/src/render/characters.ts:36 fn makeBubble
SYM game/src/render/characters.ts:61 class CharactersView
SYM game/src/render/characters.ts:98 method CharactersView.setQuality
SYM game/src/render/characters.ts:104 method CharactersView.say
SYM game/src/render/characters.ts:111 method CharactersView.react
SYM game/src/render/characters.ts:116 method CharactersView.emotion
SYM game/src/render/characters.ts:134 method CharactersView.seatHerder
SYM game/src/render/characters.ts:147 method CharactersView.setSeason
SYM game/src/render/characters.ts:153 method CharactersView.herderObject
SYM game/src/render/characters.ts:157 method CharactersView.update
SYM game/src/render/characters.ts:226 method CharactersView.stepAnimals
SYM game/src/render/characters.ts:258 method CharactersView.updateDogs
SYM game/src/render/characters.ts:300 method CharactersView.updateWolves
FILE game/src/render/ger/atlas.ts 16.0KB 177L exports: AtlasMaps,doorAtlas,IN_RECT,interiorAtlas
SYM game/src/render/ger/atlas.ts:5 interface AtlasMaps
SYM game/src/render/ger/atlas.ts:7 fn hasDom
SYM game/src/render/ger/atlas.ts:8 fn doorAtlas
SYM game/src/render/ger/atlas.ts:110 const IN_RECT
SYM game/src/render/ger/atlas.ts:111 fn interiorAtlas
FILE game/src/render/ger/config.ts 9.9KB 129L exports: GerSize,DoorVariant,GerShape,GerWinter,GerPalette,TentPalette,GerInteriorColors,GerInterior,GerAtlas,GerConfig,TentKind,TentConfig,GerData,gerConfigErrors,+4
SYM game/src/render/ger/config.ts:7 interface GerSize
SYM game/src/render/ger/config.ts:8 interface DoorVariant
SYM game/src/render/ger/config.ts:9 interface GerShape
SYM game/src/render/ger/config.ts:15 interface GerWinter
SYM game/src/render/ger/config.ts:16 interface GerPalette
SYM game/src/render/ger/config.ts:17 interface TentPalette
SYM game/src/render/ger/config.ts:18 interface GerInteriorColors
SYM game/src/render/ger/config.ts:19 interface GerInterior
SYM game/src/render/ger/config.ts:27 interface GerAtlas
SYM game/src/render/ger/config.ts:28 interface GerConfig
SYM game/src/render/ger/config.ts:44 interface TentKind
SYM game/src/render/ger/config.ts:45 interface TentConfig
SYM game/src/render/ger/config.ts:50 interface GerData
SYM game/src/render/ger/config.ts:53 fn isObj
SYM game/src/render/ger/config.ts:56 fn check
SYM game/src/render/ger/config.ts:72 fn gerConfigErrors
SYM game/src/render/ger/config.ts:114 fn validateGerData
SYM game/src/render/ger/config.ts:121 const GER
SYM game/src/render/ger/config.ts:122 const TENT
SYM game/src/render/ger/config.ts:125 fn gerSize
FILE game/src/render/ger/geo.ts 10.2KB 158L exports: V3,V2,rgb,mix,px2uv,LatheOpts,LoftRow,LoftOpts,Geo,outlineMaterial
SYM game/src/render/ger/geo.ts:5 type V3
SYM game/src/render/ger/geo.ts:6 type V2
SYM game/src/render/ger/geo.ts:10 const rgb
SYM game/src/render/ger/geo.ts:11 const mix
SYM game/src/render/ger/geo.ts:12 const px2uv
SYM game/src/render/ger/geo.ts:14 interface LatheOpts
SYM game/src/render/ger/geo.ts:30 interface LoftRow
SYM game/src/render/ger/geo.ts:31 interface LoftOpts
SYM game/src/render/ger/geo.ts:41 class Geo
SYM game/src/render/ger/geo.ts:49 method Geo.tri
SYM game/src/render/ger/geo.ts:58 method Geo.quad
SYM game/src/render/ger/geo.ts:67 method Geo.lathe
SYM game/src/render/ger/geo.ts:97 method Geo.loft
SYM game/src/render/ger/geo.ts:113 method Geo.obox
SYM game/src/render/ger/geo.ts:123 method Geo.beam
SYM game/src/render/ger/geo.ts:133 method Geo.append
SYM game/src/render/ger/geo.ts:143 method Geo.build
SYM game/src/render/ger/geo.ts:154 fn outlineMaterial
FILE game/src/render/ger/ger.ts 14.9KB 165L exports: GerBuilt,GerOptions,makeGer
SYM game/src/render/ger/ger.ts:8 interface GerBuilt
SYM game/src/render/ger/ger.ts:20 interface GerOptions
SYM game/src/render/ger/ger.ts:34 fn makeGer
FILE game/src/render/ger/gerInterior.ts 18.3KB 174L exports: gerDims,GerInteriorOptions,GerInteriorBuilt,makeGerInterior
SYM game/src/render/ger/gerInterior.ts:10 fn gerDims
SYM game/src/render/ger/gerInterior.ts:19 interface GerInteriorOptions
SYM game/src/render/ger/gerInterior.ts:20 interface GerInteriorBuilt
SYM game/src/render/ger/gerInterior.ts:28 fn makeGerInterior
FILE game/src/render/ger/tent.ts 6.1KB 79L exports: TentOptions,makeTent
SYM game/src/render/ger/tent.ts:11 interface TentOptions
SYM game/src/render/ger/tent.ts:13 fn makeTent
FILE game/src/render/homeLights.ts 11.7KB 201L exports: HomeLightsConfig,homeLights,idHash,getHomeState,HomeLightsView
SYM game/src/render/homeLights.ts:19 interface HomeLightsConfig
SYM game/src/render/homeLights.ts:26 fn parse
SYM game/src/render/homeLights.ts:46 const homeLights
SYM game/src/render/homeLights.ts:49 fn idHash
SYM game/src/render/homeLights.ts:54 fn dayMinute
SYM game/src/render/homeLights.ts:58 fn getHomeState
SYM game/src/render/homeLights.ts:88 class HomeLightsView
SYM game/src/render/homeLights.ts:150 method HomeLightsView.update
SYM game/src/render/homeLights.ts:185 method HomeLightsView.dispose
SYM game/src/render/homeLights.ts:191 fn glowTexture
FILE game/src/render/interior.ts 17.5KB 337L exports: InteriorView
SYM game/src/render/interior.ts:22 class InteriorView
SYM game/src/render/interior.ts:43 method InteriorView.active
SYM game/src/render/interior.ts:48 method InteriorView.show
SYM game/src/render/interior.ts:63 method InteriorView.hide
SYM game/src/render/interior.ts:92 method InteriorView.releaseNpcs
SYM game/src/render/interior.ts:97 method InteriorView.update
SYM game/src/render/interior.ts:112 method InteriorView.buildGer
SYM game/src/render/interior.ts:145 method InteriorView.buildHouse
SYM game/src/render/interior.ts:190 method InteriorView.buildPublic
SYM game/src/render/interior.ts:237 method InteriorView.build
FILE game/src/render/items.ts 3.7KB 97L exports: ItemsView
SYM game/src/render/items.ts:12 fn canGeo
SYM game/src/render/items.ts:22 fn fiberGeo
SYM game/src/render/items.ts:37 class ItemsView
SYM game/src/render/items.ts:64 method ItemsView.update
FILE game/src/render/labelAtlas.ts 4.5KB 92L exports: LabelStyle,LabelAtlas
SYM game/src/render/labelAtlas.ts:8 interface LabelStyle
SYM game/src/render/labelAtlas.ts:14 fn drawCell
SYM game/src/render/labelAtlas.ts:34 class LabelAtlas
SYM game/src/render/labelAtlas.ts:42 method LabelAtlas.cell
SYM game/src/render/labelAtlas.ts:50 method LabelAtlas.add
SYM game/src/render/labelAtlas.ts:58 method LabelAtlas.build
SYM game/src/render/labelAtlas.ts:76 method LabelAtlas.setText
SYM game/src/render/labelAtlas.ts:82 method LabelAtlas.setCell
FILE game/src/render/npcs.ts 23.6KB 397L exports: getHomeState,NpcView
SYM game/src/render/npcs.ts:28 fn hex
SYM game/src/render/npcs.ts:53 fn idHash
SYM game/src/render/npcs.ts:61 fn getHomeState
SYM game/src/render/npcs.ts:65 class NpcView
SYM game/src/render/npcs.ts:89 method NpcView.shiftOf
SYM game/src/render/npcs.ts:102 method NpcView.anchors
SYM game/src/render/npcs.ts:110 method NpcView.homeOf
SYM game/src/render/npcs.ts:119 method NpcView.buildLeg
SYM game/src/render/npcs.ts:132 method NpcView.homeKey
SYM game/src/render/npcs.ts:139 method NpcView.homeState
SYM game/src/render/npcs.ts:151 method NpcView.spec
SYM game/src/render/npcs.ts:160 method NpcView.ensureRig
SYM game/src/render/npcs.ts:170 method NpcView.ensureFar
SYM game/src/render/npcs.ts:181 method NpcView.syncSeason
SYM game/src/render/npcs.ts:192 method NpcView.forEachPlaced
SYM game/src/render/npcs.ts:198 method NpcView.now
SYM game/src/render/npcs.ts:202 method NpcView.measure
SYM game/src/render/npcs.ts:209 method NpcView.drive
SYM game/src/render/npcs.ts:231 method NpcView.pickTalk
SYM game/src/render/npcs.ts:257 method NpcView.showSpeech
SYM game/src/render/npcs.ts:319 method NpcView.hideEntry
SYM game/src/render/npcs.ts:327 method NpcView.hideOutdoor
SYM game/src/render/npcs.ts:362 method NpcView.leaveIndoor
SYM game/src/render/npcs.ts:371 method NpcView.syncAwaySign
FILE game/src/render/scene.ts 27.4KB 547L exports: GameView
SYM game/src/render/scene.ts:30 fn flakeTexture
SYM game/src/render/scene.ts:43 class GameView
SYM game/src/render/scene.ts:247 method GameView.applyQuality
SYM game/src/render/scene.ts:279 method GameView.snapshot
SYM game/src/render/scene.ts:293 method GameView.toggleHeatmap
SYM game/src/render/scene.ts:299 method GameView.frame
SYM game/src/render/scene.ts:374 method GameView.hideHerderIfCameraInside
SYM game/src/render/scene.ts:383 method GameView.campSolids
SYM game/src/render/scene.ts:412 method GameView.frameInterior
SYM game/src/render/scene.ts:437 method GameView.leaveInterior
SYM game/src/render/scene.ts:454 method GameView.applyDaylight
SYM game/src/render/scene.ts:524 method GameView.updateFlakes
SYM game/src/render/scene.ts:540 method GameView.drawCalls
SYM game/src/render/scene.ts:544 method GameView.triangleCount
FILE game/src/render/staff.ts 8.9KB 187L exports: makeDwelling,StaffView
SYM game/src/render/staff.ts:28 fn helperRole
SYM game/src/render/staff.ts:37 fn makeDwelling
SYM game/src/render/staff.ts:65 class StaffView
SYM game/src/render/staff.ts:76 method StaffView.setQuality
SYM game/src/render/staff.ts:84 method StaffView.setSeason
SYM game/src/render/staff.ts:90 method StaffView.update
SYM game/src/render/staff.ts:166 method StaffView.syncDwellings
FILE game/src/render/style.ts 29.6KB 675L exports: TimeVisual,SeasonVisual,GrassVisual,WaterVisual,SmokeVisual,DogRestVisual,HerderEmotion,HerderEvent,HerderAnimVisual,SumResidentsVisual,OutfitBody,OutfitHat,HelperRole,OutfitsVisual,+11
SYM game/src/render/style.ts:5 interface TimeVisual
SYM game/src/render/style.ts:17 interface SeasonVisual
SYM game/src/render/style.ts:24 interface GrassVisual
SYM game/src/render/style.ts:35 interface WaterVisual
SYM game/src/render/style.ts:45 interface SmokeVisual
SYM game/src/render/style.ts:50 interface DogRestVisual
SYM game/src/render/style.ts:60 type HerderEmotion
SYM game/src/render/style.ts:61 type HerderEvent
SYM game/src/render/style.ts:62 interface HerderAnimVisual
SYM game/src/render/style.ts:88 interface SumResidentsVisual
SYM game/src/render/style.ts:97 type OutfitBody
SYM game/src/render/style.ts:98 type OutfitHat
SYM game/src/render/style.ts:99 type HelperRole
SYM game/src/render/style.ts:100 interface OutfitsVisual
SYM game/src/render/style.ts:106 interface MapPaperVisual
SYM game/src/render/style.ts:113 interface VehicleFxVisual
SYM game/src/render/style.ts:124 interface CloudShadowVisual
SYM game/src/render/style.ts:133 interface FlowersVisual
SYM game/src/render/style.ts:140 interface MountainLayerVisual
SYM game/src/render/style.ts:150 interface VisualPalette
SYM game/src/render/style.ts:184 interface NightVisual
SYM game/src/render/style.ts:196 interface VisualStyle
SYM game/src/render/style.ts:223 fn isRecord
SYM game/src/render/style.ts:225 fn isColor
SYM game/src/render/style.ts:226 fn isPositive
SYM game/src/render/style.ts:229 fn parseMapPaper
SYM game/src/render/style.ts:248 fn parseVehicleFx
SYM game/src/render/style.ts:269 fn parseHerderAnim
SYM game/src/render/style.ts:298 fn parseSumResidents
SYM game/src/render/style.ts:316 fn parseOutfits
SYM game/src/render/style.ts:346 fn parseNight
SYM game/src/render/style.ts:376 fn validateVisualStyle
SYM game/src/render/style.ts:671 const visualStyle
SYM game/src/render/style.ts:673 fn paletteHex
FILE game/src/render/sumcenter.ts 33.2KB 592L exports: SumCenterView
SYM game/src/render/sumcenter.ts:44 fn residentMatrix
SYM game/src/render/sumcenter.ts:48 fn residents
SYM game/src/render/sumcenter.ts:75 fn darkWindowMaterials
SYM game/src/render/sumcenter.ts:98 class SumCenterView
SYM game/src/render/sumcenter.ts:268 method SumCenterView.buildLamps
SYM game/src/render/sumcenter.ts:301 method SumCenterView.syncLamps
SYM game/src/render/sumcenter.ts:336 method SumCenterView.buildGates
SYM game/src/render/sumcenter.ts:354 method SumCenterView.setLeaves
SYM game/src/render/sumcenter.ts:370 method SumCenterView.syncGates
SYM game/src/render/sumcenter.ts:402 method SumCenterView.syncTown
SYM game/src/render/sumcenter.ts:420 method SumCenterView.buildTown
SYM game/src/render/sumcenter.ts:445 method SumCenterView.buildGers
SYM game/src/render/sumcenter.ts:483 method SumCenterView.syncTalk
SYM game/src/render/sumcenter.ts:527 method SumCenterView.syncNight
SYM game/src/render/sumcenter.ts:539 method SumCenterView.syncCrowd
SYM game/src/render/sumcenter.ts:565 method SumCenterView.takeLive
SYM game/src/render/sumcenter.ts:582 method SumCenterView.releaseLive
SYM game/src/render/sumcenter.ts:589 method SumCenterView.syncLot
FILE game/src/render/sumlayout.ts 51.9KB 892L exports: Rect,VehicleSlotView,HomeDoor,SumPlotView,SumGer,GateView,GateView,SumCenterBuild,buildSumCenter
SYM game/src/render/sumlayout.ts:20 interface Rect
SYM game/src/render/sumlayout.ts:22 interface VehicleSlotView
SYM game/src/render/sumlayout.ts:24 interface HomeDoor
SYM game/src/render/sumlayout.ts:36 interface SumPlotView
SYM game/src/render/sumlayout.ts:37 interface SumGer
SYM game/src/render/sumlayout.ts:39 interface GateView
SYM game/src/render/sumlayout.ts:41 interface GateView
SYM game/src/render/sumlayout.ts:42 interface SumCenterBuild
SYM game/src/render/sumlayout.ts:71 fn rng
SYM game/src/render/sumlayout.ts:87 fn mat
SYM game/src/render/sumlayout.ts:93 class Batch
SYM game/src/render/sumlayout.ts:95 method Batch.add
SYM game/src/render/sumlayout.ts:108 method Batch.box
SYM game/src/render/sumlayout.ts:111 method Batch.cyl
SYM game/src/render/sumlayout.ts:114 method Batch.mesh
SYM game/src/render/sumlayout.ts:129 fn gableGeometry
SYM game/src/render/sumlayout.ts:145 fn nearestOnPolyline
SYM game/src/render/sumlayout.ts:158 fn rectsOverlap
SYM game/src/render/sumlayout.ts:161 fn rectNearPolyline
SYM game/src/render/sumlayout.ts:178 fn buildSumCenter
FILE game/src/render/terrain.ts 61.6KB 1393L exports: TerrainView
SYM game/src/render/terrain.ts:31 fn typeLookup
SYM game/src/render/terrain.ts:62 fn grassClumpGeometry
SYM game/src/render/terrain.ts:97 fn flowerGeometry
SYM game/src/render/terrain.ts:145 class TerrainView
SYM game/src/render/terrain.ts:211 method TerrainView.heightAt
SYM game/src/render/terrain.ts:216 method TerrainView.sync
SYM game/src/render/terrain.ts:232 method TerrainView.syncExtraGers
SYM game/src/render/terrain.ts:250 method TerrainView.updateSeason
SYM game/src/render/terrain.ts:260 method TerrainView.build
SYM game/src/render/terrain.ts:287 method TerrainView.dispose
SYM game/src/render/terrain.ts:319 method TerrainView.clearSmoke
SYM game/src/render/terrain.ts:330 method TerrainView.clearFlowers
SYM game/src/render/terrain.ts:339 method TerrainView.clearMountains
SYM game/src/render/terrain.ts:348 method TerrainView.disposeGeometries
SYM game/src/render/terrain.ts:354 method TerrainView.setQuality
SYM game/src/render/terrain.ts:372 method TerrainView.updateVisualTime
SYM game/src/render/terrain.ts:402 method TerrainView.buildGround
SYM game/src/render/terrain.ts:499 method TerrainView.buildWater
SYM game/src/render/terrain.ts:581 method TerrainView.buildGrassTextures
SYM game/src/render/terrain.ts:628 method TerrainView.buildTufts
SYM game/src/render/terrain.ts:781 method TerrainView.buildFlowers
SYM game/src/render/terrain.ts:832 method TerrainView.smoothBiomass
SYM game/src/render/terrain.ts:863 method TerrainView.updateGrass
SYM game/src/render/terrain.ts:953 method TerrainView.updateGrassCenter
SYM game/src/render/terrain.ts:961 method TerrainView.buildDecor
SYM game/src/render/terrain.ts:1044 method TerrainView.buildMountains
SYM game/src/render/terrain.ts:1094 method TerrainView.buildOvoo
SYM game/src/render/terrain.ts:1139 method TerrainView.buildCampStructures
SYM game/src/render/terrain.ts:1149 method TerrainView.buildPostFence
SYM game/src/render/terrain.ts:1177 method TerrainView.buildShed
SYM game/src/render/terrain.ts:1247 method TerrainView.buildPostAndFire
SYM game/src/render/terrain.ts:1271 method TerrainView.syncHay
SYM game/src/render/terrain.ts:1297 method TerrainView.buildDens
SYM game/src/render/terrain.ts:1334 method TerrainView.buildHome
FILE game/src/render/ui/menu.ts 26.4KB 505L exports: Intent,takeIntent,putIntent,MenuDeps,MenuUI
SYM game/src/render/ui/menu.ts:25 type Intent
SYM game/src/render/ui/menu.ts:30 fn takeIntent
SYM game/src/render/ui/menu.ts:42 fn putIntent
SYM game/src/render/ui/menu.ts:46 interface MenuDeps
SYM game/src/render/ui/menu.ts:69 fn esc
SYM game/src/render/ui/menu.ts:71 class MenuUI
SYM game/src/render/ui/menu.ts:114 method MenuUI.showStart
SYM game/src/render/ui/menu.ts:119 method MenuUI.toggleGame
SYM game/src/render/ui/menu.ts:125 method MenuUI.close
SYM game/src/render/ui/menu.ts:132 method MenuUI.showIntro
SYM game/src/render/ui/menu.ts:139 method MenuUI.go
SYM game/src/render/ui/menu.ts:154 method MenuUI.refreshSlots
SYM game/src/render/ui/menu.ts:164 method MenuUI.onKey
SYM game/src/render/ui/menu.ts:175 method MenuUI.render
SYM game/src/render/ui/menu.ts:182 method MenuUI.ver
SYM game/src/render/ui/menu.ts:186 method MenuUI.back
SYM game/src/render/ui/menu.ts:190 method MenuUI.rStart
SYM game/src/render/ui/menu.ts:210 method MenuUI.netBtn
SYM game/src/render/ui/menu.ts:215 method MenuUI.rTransfer
SYM game/src/render/ui/menu.ts:229 method MenuUI.rCode
SYM game/src/render/ui/menu.ts:246 method MenuUI.xferError
SYM game/src/render/ui/menu.ts:251 method MenuUI.rGame
SYM game/src/render/ui/menu.ts:268 method MenuUI.slotInfoHtml
SYM game/src/render/ui/menu.ts:277 method MenuUI.rSlots
SYM game/src/render/ui/menu.ts:291 method MenuUI.rangeRow
SYM game/src/render/ui/menu.ts:296 method MenuUI.difficultyHtml
SYM game/src/render/ui/menu.ts:302 method MenuUI.rNew
SYM game/src/render/ui/menu.ts:317 method MenuUI.firstFreeSlot
SYM game/src/render/ui/menu.ts:322 method MenuUI.rFile
SYM game/src/render/ui/menu.ts:332 method MenuUI.rSettings
SYM game/src/render/ui/menu.ts:346 method MenuUI.rIntro
SYM game/src/render/ui/menu.ts:356 method MenuUI.finishIntro
SYM game/src/render/ui/menu.ts:363 method MenuUI.onInput
SYM game/src/render/ui/menu.ts:374 method MenuUI.onChange
SYM game/src/render/ui/menu.ts:388 method MenuUI.setDie
SYM game/src/render/ui/menu.ts:393 method MenuUI.onClick
SYM game/src/render/ui/menu.ts:501 method MenuUI.busyDo
FILE game/src/render/ui/names.ts 4.7KB 111L exports: stageName,speciesEmoji,PRODUCT_EMOJI,productName,unitOf,expenseName,PROCESSOR_NAME,fmtMoney,fmtNum,fmtMinutes,PASTURE_NAME,SEASON_NAME,SEASON_EMOJI,CAMP_HINT,+2
SYM game/src/render/ui/names.ts:22 fn stageName
SYM game/src/render/ui/names.ts:33 fn speciesEmoji
SYM game/src/render/ui/names.ts:37 const PRODUCT_EMOJI
SYM game/src/render/ui/names.ts:41 fn productName
SYM game/src/render/ui/names.ts:45 fn unitOf
SYM game/src/render/ui/names.ts:65 fn expenseName
SYM game/src/render/ui/names.ts:69 const PROCESSOR_NAME
SYM game/src/render/ui/names.ts:75 fn fmtMoney
SYM game/src/render/ui/names.ts:80 fn fmtNum
SYM game/src/render/ui/names.ts:84 fn fmtMinutes
SYM game/src/render/ui/names.ts:90 const PASTURE_NAME
SYM game/src/render/ui/names.ts:100 const SEASON_NAME
SYM game/src/render/ui/names.ts:101 const SEASON_EMOJI
SYM game/src/render/ui/names.ts:103 const CAMP_HINT
SYM game/src/render/ui/names.ts:110 const WATER_NAME
SYM game/src/render/ui/names.ts:111 const WOLF_LEVEL_NAME
FILE game/src/render/ui/panels.ts 72.4KB 1153L exports: UiHooks,Panels
SYM game/src/render/ui/panels.ts:94 interface UiHooks
SYM game/src/render/ui/panels.ts:101 class Panels
SYM game/src/render/ui/panels.ts:144 method Panels.isOpen
SYM game/src/render/ui/panels.ts:148 method Panels.open
SYM game/src/render/ui/panels.ts:178 method Panels.closedShop
SYM game/src/render/ui/panels.ts:185 method Panels.close
SYM game/src/render/ui/panels.ts:200 method Panels.showReport
SYM game/src/render/ui/panels.ts:212 method Panels.refresh
SYM game/src/render/ui/panels.ts:218 method Panels.showArrive
SYM game/src/render/ui/panels.ts:224 method Panels.render
SYM game/src/render/ui/panels.ts:247 method Panels.milestonesHtml
SYM game/src/render/ui/panels.ts:258 method Panels.spark
SYM game/src/render/ui/panels.ts:266 method Panels.ceremonyHtml
SYM game/src/render/ui/panels.ts:277 method Panels.storageHtml
SYM game/src/render/ui/panels.ts:331 method Panels.buyItems
SYM game/src/render/ui/panels.ts:355 method Panels.vehicleButtons
SYM game/src/render/ui/panels.ts:363 method Panels.cargoList
SYM game/src/render/ui/panels.ts:377 method Panels.cargoHtml
SYM game/src/render/ui/panels.ts:433 method Panels.selectedAnimals
SYM game/src/render/ui/panels.ts:441 method Panels.shopHtml
SYM game/src/render/ui/panels.ts:501 method Panels.traderHtml
SYM game/src/render/ui/panels.ts:524 method Panels.gerSellHtml
SYM game/src/render/ui/panels.ts:531 method Panels.townCommand
SYM game/src/render/ui/panels.ts:561 method Panels.townHtml
SYM game/src/render/ui/panels.ts:623 method Panels.lotHtml
SYM game/src/render/ui/panels.ts:651 method Panels.arriveHtml
SYM game/src/render/ui/panels.ts:677 method Panels.reportHtml
SYM game/src/render/ui/panels.ts:695 method Panels.wolfKillsHtml
SYM game/src/render/ui/panels.ts:702 method Panels.dogsHtml
SYM game/src/render/ui/panels.ts:725 method Panels.campsHtml
SYM game/src/render/ui/panels.ts:756 method Panels.cheatHtml
SYM game/src/render/ui/panels.ts:765 method Panels.teahouseHtml
SYM game/src/render/ui/panels.ts:783 method Panels.helpersHtml
SYM game/src/render/ui/panels.ts:832 method Panels.otorHtml
SYM game/src/render/ui/panels.ts:852 method Panels.payHtml
SYM game/src/render/ui/panels.ts:868 method Panels.act
FILE game/src/render/ui/sleepPanel.ts 2.4KB 49L exports: SleepCtx,SleepPanel
SYM game/src/render/ui/sleepPanel.ts:12 interface SleepCtx
SYM game/src/render/ui/sleepPanel.ts:19 fn hhmm
SYM game/src/render/ui/sleepPanel.ts:21 class SleepPanel
SYM game/src/render/ui/sleepPanel.ts:29 method SleepPanel.html
SYM game/src/render/ui/sleepPanel.ts:37 method SleepPanel.act
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
FILE game/src/render/vehicles.ts 19.8KB 415L exports: nightFactor,makeVehicleModel,VehiclesView
SYM game/src/render/vehicles.ts:26 fn fxColor
SYM game/src/render/vehicles.ts:29 fn nightFactor
SYM game/src/render/vehicles.ts:37 fn makeBeam
SYM game/src/render/vehicles.ts:71 fn placeBeam
SYM game/src/render/vehicles.ts:88 fn lamp
SYM game/src/render/vehicles.ts:97 class DustFx
SYM game/src/render/vehicles.ts:134 method DustFx.setAmbient
SYM game/src/render/vehicles.ts:141 method DustFx.emit
SYM game/src/render/vehicles.ts:156 method DustFx.update
SYM game/src/render/vehicles.ts:177 fn wheel
SYM game/src/render/vehicles.ts:192 fn makeCart
SYM game/src/render/vehicles.ts:231 fn makeTruck
SYM game/src/render/vehicles.ts:261 fn makeVehicleModel
SYM game/src/render/vehicles.ts:265 class VehiclesView
SYM game/src/render/vehicles.ts:282 method VehiclesView.setAmbient
SYM game/src/render/vehicles.ts:291 method VehiclesView.applyLights
SYM game/src/render/vehicles.ts:301 method VehiclesView.rig
SYM game/src/render/vehicles.ts:313 method VehiclesView.buildRoad
SYM game/src/render/vehicles.ts:358 method VehiclesView.update
FILE game/src/render/worldmap.ts 23.5KB 515L exports: paperPixels,WorldMapView
SYM game/src/render/worldmap.ts:23 fn textSprite
SYM game/src/render/worldmap.ts:49 fn paperPixels
SYM game/src/render/worldmap.ts:89 class WorldMapView
SYM game/src/render/worldmap.ts:241 method WorldMapView.inkLines
SYM game/src/render/worldmap.ts:293 method WorldMapView.heightAt
SYM game/src/render/worldmap.ts:302 method WorldMapView.addCamp
SYM game/src/render/worldmap.ts:314 method WorldMapView.addSum
SYM game/src/render/worldmap.ts:328 method WorldMapView.addPath
SYM game/src/render/worldmap.ts:340 method WorldMapView.resize
SYM game/src/render/worldmap.ts:346 method WorldMapView.partyModel
SYM game/src/render/worldmap.ts:371 method WorldMapView.snapshot
SYM game/src/render/worldmap.ts:381 method WorldMapView.applySeason
SYM game/src/render/worldmap.ts:404 method WorldMapView.syncTraffic
SYM game/src/render/worldmap.ts:426 method WorldMapView.update
SYM game/src/render/worldmap.ts:478 method WorldMapView.replaceLabel
SYM game/src/render/worldmap.ts:510 fn segDist
FILE game/src/render/zones.ts 3.5KB 100L exports: ZonesView
SYM game/src/render/zones.ts:22 class ZonesView
SYM game/src/render/zones.ts:32 method ZonesView.toggle
SYM game/src/render/zones.ts:38 method ZonesView.ring
SYM game/src/render/zones.ts:51 method ZonesView.line
SYM game/src/render/zones.ts:64 method ZonesView.update
FILE game/src/sim/autotrip.ts 4.3KB 98L exports: AutoTripPlan,AutoTripPhase,AutoTrip
SYM game/src/sim/autotrip.ts:12 interface AutoTripPlan
SYM game/src/sim/autotrip.ts:18 type AutoTripPhase
SYM game/src/sim/autotrip.ts:20 class AutoTrip
SYM game/src/sim/autotrip.ts:26 method AutoTrip.finished
SYM game/src/sim/autotrip.ts:30 method AutoTrip.fail
SYM game/src/sim/autotrip.ts:37 method AutoTrip.tick
SYM game/src/sim/autotrip.ts:92 method AutoTrip.run
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
FILE game/src/sim/commands.ts 21.7KB 440L exports: Command,CommandResult,nearHome,applyCommand
SYM game/src/sim/commands.ts:32 type Command
SYM game/src/sim/commands.ts:92 interface CommandResult
SYM game/src/sim/commands.ts:98 fn nearHome
SYM game/src/sim/commands.ts:110 fn ok
SYM game/src/sim/commands.ts:111 fn fail
SYM game/src/sim/commands.ts:113 fn applyCommand
FILE game/src/sim/config.ts 24.6KB 462L exports: Species,Sex,Season,SeasonsConfig,SPECIES,TimeConfig,SpeciesConfig,AnimalsConfig,PastureTypeConfig,GrazingConfig,HerdConfig,PastureConfig,WaterShape,TerrainConfig,+9
SYM game/src/sim/config.ts:42 type Species
SYM game/src/sim/config.ts:43 type Sex
SYM game/src/sim/config.ts:44 type Season
SYM game/src/sim/config.ts:47 interface SeasonsConfig
SYM game/src/sim/config.ts:65 const SPECIES
SYM game/src/sim/config.ts:67 interface TimeConfig
SYM game/src/sim/config.ts:81 interface SpeciesConfig
SYM game/src/sim/config.ts:96 interface AnimalsConfig
SYM game/src/sim/config.ts:115 interface PastureTypeConfig
SYM game/src/sim/config.ts:122 interface GrazingConfig
SYM game/src/sim/config.ts:147 interface HerdConfig
SYM game/src/sim/config.ts:166 interface PastureConfig
SYM game/src/sim/config.ts:188 type WaterShape
SYM game/src/sim/config.ts:193 interface TerrainConfig
SYM game/src/sim/config.ts:204 interface CampConfig
SYM game/src/sim/config.ts:214 interface HomeConfig
SYM game/src/sim/config.ts:226 interface WorldLocation
SYM game/src/sim/config.ts:231 interface WorldMapConfig
SYM game/src/sim/config.ts:253 interface StartAnimal
SYM game/src/sim/config.ts:261 interface GameConfig
SYM game/src/sim/config.ts:299 fn loadConfig
SYM game/src/sim/config.ts:336 fn validateConfig
SYM game/src/sim/config.ts:403 fn validateSumLayout
FILE game/src/sim/msg.ts 0.9KB 18L exports: MsgParam,Msg,raw,m
SYM game/src/sim/msg.ts:5 type MsgParam
SYM game/src/sim/msg.ts:6 interface Msg
SYM game/src/sim/msg.ts:12 fn raw
SYM game/src/sim/msg.ts:16 fn m
FILE game/src/sim/rng.ts 1.3KB 49L exports: Rng
SYM game/src/sim/rng.ts:6 class Rng
SYM game/src/sim/rng.ts:14 method Rng.state
SYM game/src/sim/rng.ts:18 method Rng.fromState
SYM game/src/sim/rng.ts:23 method Rng.next
SYM game/src/sim/rng.ts:32 method Rng.range
SYM game/src/sim/rng.ts:37 method Rng.int
SYM game/src/sim/rng.ts:41 method Rng.chance
SYM game/src/sim/rng.ts:45 method Rng.pick
FILE game/src/sim/save.ts 14.9KB 226L exports: SAVE_FORMAT,SaveMeta,SaveFile,SaveError,saveMeta,serialize,deserialize,migrationChainComplete,validateState
SYM game/src/sim/save.ts:12 const SAVE_FORMAT
SYM game/src/sim/save.ts:15 interface SaveMeta
SYM game/src/sim/save.ts:25 interface SaveFile
SYM game/src/sim/save.ts:32 class SaveError
SYM game/src/sim/save.ts:39 fn saveMeta
SYM game/src/sim/save.ts:44 fn serialize
SYM game/src/sim/save.ts:53 fn deserialize
SYM game/src/sim/save.ts:81 fn migrationChainComplete
SYM game/src/sim/save.ts:90 fn isObj
SYM game/src/sim/save.ts:91 fn fin
SYM game/src/sim/save.ts:92 fn u32
SYM game/src/sim/save.ts:97 fn validateState
FILE game/src/sim/sim.ts 12.8KB 269L exports: DayReport,SimEvent,Sim
SYM game/src/sim/sim.ts:34 interface DayReport
SYM game/src/sim/sim.ts:58 type SimEvent
SYM game/src/sim/sim.ts:60 class Sim
SYM game/src/sim/sim.ts:81 method Sim.on
SYM game/src/sim/sim.ts:88 method Sim.emit
SYM game/src/sim/sim.ts:92 method Sim.command
SYM game/src/sim/sim.ts:101 method Sim.emitTravel
SYM game/src/sim/sim.ts:106 method Sim.step
SYM game/src/sim/sim.ts:172 method Sim.refreshQuality
SYM game/src/sim/sim.ts:177 method Sim.runDays
SYM game/src/sim/sim.ts:182 method Sim.endDay
SYM game/src/sim/sim.ts:260 method Sim.spend
SYM game/src/sim/sim.ts:266 method Sim.random
FILE game/src/sim/state.ts 19.2KB 383L exports: SAVE_VERSION,ProductId,PRODUCTS,AnimalMode,Animal,GroundItem,Batch,ProcessorKind,ProcessorState,VehicleId,VEHICLES,BuyOrder,Place,InteriorState,+12
SYM game/src/sim/state.ts:20 const SAVE_VERSION
SYM game/src/sim/state.ts:22 type ProductId
SYM game/src/sim/state.ts:23 const PRODUCTS
SYM game/src/sim/state.ts:27 type AnimalMode
SYM game/src/sim/state.ts:29 interface Animal
SYM game/src/sim/state.ts:64 interface GroundItem
SYM game/src/sim/state.ts:73 interface Batch
SYM game/src/sim/state.ts:79 type ProcessorKind
SYM game/src/sim/state.ts:81 interface ProcessorState
SYM game/src/sim/state.ts:87 type VehicleId
SYM game/src/sim/state.ts:88 const VEHICLES
SYM game/src/sim/state.ts:90 type BuyOrder
SYM game/src/sim/state.ts:103 type Place
SYM game/src/sim/state.ts:109 interface InteriorState
SYM game/src/sim/state.ts:121 interface FleetVehicle
SYM game/src/sim/state.ts:133 interface MapState
SYM game/src/sim/state.ts:141 interface CampState
SYM game/src/sim/state.ts:149 interface DayStats
SYM game/src/sim/state.ts:162 interface PlayerState
SYM game/src/sim/state.ts:181 interface GameState
SYM game/src/sim/state.ts:233 fn emptyDayStats
SYM game/src/sim/state.ts:237 fn newAnimal
SYM game/src/sim/state.ts:270 fn createInitialState
SYM game/src/sim/state.ts:338 const MIGRATIONS
SYM game/src/sim/state.ts:371 const MIN_SAVE_VERSION
SYM game/src/sim/state.ts:374 fn migrateState
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
FILE game/src/sim/systems/buildingSize.ts 6.8KB 103L exports: TownEntry,LabFootprint,townEntry,entryFootprint,rotLocal,worldSize,labOrigin,labDoorPoint,houseFootprint,houseSlot,PlotLab,townPlots,GATE_PHI,plotHouseLab
SYM game/src/sim/systems/buildingSize.ts:11 interface TownEntry
SYM game/src/sim/systems/buildingSize.ts:12 interface LabFootprint
SYM game/src/sim/systems/buildingSize.ts:19 fn townEntry
SYM game/src/sim/systems/buildingSize.ts:22 fn entryFootprint
SYM game/src/sim/systems/buildingSize.ts:41 fn rotLocal
SYM game/src/sim/systems/buildingSize.ts:47 fn worldSize
SYM game/src/sim/systems/buildingSize.ts:53 fn labOrigin
SYM game/src/sim/systems/buildingSize.ts:59 fn labDoorPoint
SYM game/src/sim/systems/buildingSize.ts:68 fn houseFootprint
SYM game/src/sim/systems/buildingSize.ts:80 fn houseSlot
SYM game/src/sim/systems/buildingSize.ts:85 interface PlotLab
SYM game/src/sim/systems/buildingSize.ts:86 const townPlots
SYM game/src/sim/systems/buildingSize.ts:89 const GATE_PHI
SYM game/src/sim/systems/buildingSize.ts:92 fn plotHouseLab
FILE game/src/sim/systems/camps.ts 4.4KB 99L exports: moveHours,startMove,moveStep
SYM game/src/sim/systems/camps.ts:19 fn moveHours
SYM game/src/sim/systems/camps.ts:30 fn startMove
SYM game/src/sim/systems/camps.ts:50 fn moveStep
FILE game/src/sim/systems/cheats.ts 6.8KB 174L exports: CheatAction,applyCheat
SYM game/src/sim/systems/cheats.ts:12 type CheatAction
SYM game/src/sim/systems/cheats.ts:24 fn applyCheat
FILE game/src/sim/systems/difficulty.ts 3.5KB 73L exports: Difficulty,DifficultyRange,DifficultyConfig,DIFFICULTY_KEYS,defaultDifficulty,clampDifficulty,validateDifficultyConfig,difficultyProblems
SYM game/src/sim/systems/difficulty.ts:11 interface Difficulty
SYM game/src/sim/systems/difficulty.ts:18 interface DifficultyRange
SYM game/src/sim/systems/difficulty.ts:19 interface DifficultyConfig
SYM game/src/sim/systems/difficulty.ts:26 const DIFFICULTY_KEYS
SYM game/src/sim/systems/difficulty.ts:28 fn defaultDifficulty
SYM game/src/sim/systems/difficulty.ts:34 fn snap
SYM game/src/sim/systems/difficulty.ts:41 fn clampDifficulty
SYM game/src/sim/systems/difficulty.ts:51 fn validateDifficultyConfig
SYM game/src/sim/systems/difficulty.ts:64 fn difficultyProblems
FILE game/src/sim/systems/dogs.ts 13.5KB 311L exports: DogOrderKind,DOG_ORDERS,Dog,newDog,DOG_ORDER_NAME,orderDog,dogGoal,dogsStep,dogsDaily,relocateDogs
SYM game/src/sim/systems/dogs.ts:26 type DogOrderKind
SYM game/src/sim/systems/dogs.ts:27 const DOG_ORDERS
SYM game/src/sim/systems/dogs.ts:29 interface Dog
SYM game/src/sim/systems/dogs.ts:51 fn newDog
SYM game/src/sim/systems/dogs.ts:60 const DOG_ORDER_NAME
SYM game/src/sim/systems/dogs.ts:69 fn orderDog
SYM game/src/sim/systems/dogs.ts:91 fn nearestHerdKey
SYM game/src/sim/systems/dogs.ts:105 fn speciesCenter
SYM game/src/sim/systems/dogs.ts:128 fn dogGoal
SYM game/src/sim/systems/dogs.ts:159 fn dogsStep
SYM game/src/sim/systems/dogs.ts:261 fn dogsDaily
SYM game/src/sim/systems/dogs.ts:266 fn hash01
SYM game/src/sim/systems/dogs.ts:274 fn pickWander
SYM game/src/sim/systems/dogs.ts:287 fn move
SYM game/src/sim/systems/dogs.ts:298 fn relocateDogs
FILE game/src/sim/systems/gerLayout.ts 9.3KB 148L exports: LayoutBox,GerLayoutSource,GerSimConfig,goalGerReached,gerLadder,gerUpgradePrice,gerRadiusFor,gerWallRadius,gerDoorOffset,gerOuterRadius,gerInnerRadius,placeOnWall,boxFrom,gerBoxes,+2
SYM game/src/sim/systems/gerLayout.ts:7 interface LayoutBox
SYM game/src/sim/systems/gerLayout.ts:10 interface GerLayoutSource
SYM game/src/sim/systems/gerLayout.ts:29 interface GerSimConfig
SYM game/src/sim/systems/gerLayout.ts:35 fn goalGerReached
SYM game/src/sim/systems/gerLayout.ts:40 fn gerLadder
SYM game/src/sim/systems/gerLayout.ts:45 fn gerUpgradePrice
SYM game/src/sim/systems/gerLayout.ts:53 fn gerRadiusFor
SYM game/src/sim/systems/gerLayout.ts:58 fn gerWallRadius
SYM game/src/sim/systems/gerLayout.ts:65 fn gerDoorOffset
SYM game/src/sim/systems/gerLayout.ts:70 fn gerOuterRadius
SYM game/src/sim/systems/gerLayout.ts:75 fn gerInnerRadius
SYM game/src/sim/systems/gerLayout.ts:80 fn placeOnWall
SYM game/src/sim/systems/gerLayout.ts:86 fn boxFrom
SYM game/src/sim/systems/gerLayout.ts:92 fn gerBoxes
SYM game/src/sim/systems/gerLayout.ts:122 fn gerBlockers
SYM game/src/sim/systems/gerLayout.ts:132 fn pushOutOfBox
FILE game/src/sim/systems/grazing.ts 11.6KB 278L exports: flockCenters,grazingStep,driveFlock
SYM game/src/sim/systems/grazing.ts:24 fn flockCenters
SYM game/src/sim/systems/grazing.ts:44 fn flockKey
SYM game/src/sim/systems/grazing.ts:49 fn decide
SYM game/src/sim/systems/grazing.ts:98 fn scoreAt
SYM game/src/sim/systems/grazing.ts:132 fn moveToward
SYM game/src/sim/systems/grazing.ts:155 fn grazingStep
SYM game/src/sim/systems/grazing.ts:247 fn eat
SYM game/src/sim/systems/grazing.ts:267 fn driveFlock
FILE game/src/sim/systems/helpers.ts 45.7KB 937L exports: HelperKind,HelperTask,HerdGroup,HelperTrip,Helper,CandidateMember,Candidate,OtorGroup,Dwelling,HelpersState,HelperEvent,newHelpersState,bedsTotal,bedsUsed,+25
SYM game/src/sim/systems/helpers.ts:36 type HelperKind
SYM game/src/sim/systems/helpers.ts:37 type HelperTask
SYM game/src/sim/systems/helpers.ts:38 type HerdGroup
SYM game/src/sim/systems/helpers.ts:40 interface HelperTrip
SYM game/src/sim/systems/helpers.ts:49 interface Helper
SYM game/src/sim/systems/helpers.ts:75 interface CandidateMember
SYM game/src/sim/systems/helpers.ts:81 interface Candidate
SYM game/src/sim/systems/helpers.ts:88 interface OtorGroup
SYM game/src/sim/systems/helpers.ts:100 interface Dwelling
SYM game/src/sim/systems/helpers.ts:109 interface HelpersState
SYM game/src/sim/systems/helpers.ts:122 type HelperEvent
SYM game/src/sim/systems/helpers.ts:127 fn newHelpersState
SYM game/src/sim/systems/helpers.ts:134 fn bedsTotal
SYM game/src/sim/systems/helpers.ts:138 fn bedsUsed
SYM game/src/sim/systems/helpers.ts:143 fn addDwelling
SYM game/src/sim/systems/helpers.ts:149 fn spareTents
SYM game/src/sim/systems/helpers.ts:155 fn homeOf
SYM game/src/sim/systems/helpers.ts:165 fn refreshCandidates
SYM game/src/sim/systems/helpers.ts:202 fn nearTeahouse
SYM game/src/sim/systems/helpers.ts:208 fn hire
SYM game/src/sim/systems/helpers.ts:257 fn familyOf
SYM game/src/sim/systems/helpers.ts:262 fn leave
SYM game/src/sim/systems/helpers.ts:272 fn fire
SYM game/src/sim/systems/helpers.ts:283 fn setTask
SYM game/src/sim/systems/helpers.ts:297 fn payWithAnimal
SYM game/src/sim/systems/helpers.ts:309 fn playerOwned
SYM game/src/sim/systems/helpers.ts:314 fn payWages
SYM game/src/sim/systems/helpers.ts:339 fn moveToward
SYM game/src/sim/systems/helpers.ts:353 fn groupOf
SYM game/src/sim/systems/helpers.ts:359 fn flock
SYM game/src/sim/systems/helpers.ts:369 fn driveAnimal
SYM game/src/sim/systems/helpers.ts:377 fn bestPasture
SYM game/src/sim/systems/helpers.ts:400 fn ensureHorseCamp
SYM game/src/sim/systems/helpers.ts:427 fn helperGuardRadius
SYM game/src/sim/systems/helpers.ts:432 fn areaScore
SYM game/src/sim/systems/helpers.ts:439 fn herderPhase
SYM game/src/sim/systems/helpers.ts:448 fn herderStep
SYM game/src/sim/systems/helpers.ts:545 fn eveningSpot
SYM game/src/sim/systems/helpers.ts:552 fn childStep
SYM game/src/sim/systems/helpers.ts:604 fn tripCost
SYM game/src/sim/systems/helpers.ts:612 fn startTrip
SYM game/src/sim/systems/helpers.ts:625 fn idleDriver
SYM game/src/sim/systems/helpers.ts:628 fn hasDriver
SYM game/src/sim/systems/helpers.ts:633 fn sendDriver
SYM game/src/sim/systems/helpers.ts:647 fn setAutoTrip
SYM game/src/sim/systems/helpers.ts:652 fn driverStep
SYM game/src/sim/systems/helpers.ts:726 fn helpersStep
SYM game/src/sim/systems/helpers.ts:747 fn guardingHelpers
SYM game/src/sim/systems/helpers.ts:754 fn sendOtor
SYM game/src/sim/systems/helpers.ts:771 fn recallOtor
SYM game/src/sim/systems/helpers.ts:794 fn setOtorCollector
SYM game/src/sim/systems/helpers.ts:817 fn takeFromOtor
SYM game/src/sim/systems/helpers.ts:848 fn dailyOtor
SYM game/src/sim/systems/helpers.ts:930 fn relocateHelpers
FILE game/src/sim/systems/herder.ts 5.8KB 140L exports: ridingHorse,herderStep,shout,toggleUurga,toggleMount
SYM game/src/sim/systems/herder.ts:15 fn ridingHorse
SYM game/src/sim/systems/herder.ts:20 fn herderStep
SYM game/src/sim/systems/herder.ts:80 fn shout
SYM game/src/sim/systems/herder.ts:114 fn toggleUurga
SYM game/src/sim/systems/herder.ts:120 fn toggleMount
FILE game/src/sim/systems/herding.ts 6.1KB 109L exports: refreshLeaders,leaderOf,followLeaders,followHerder,horseGrazeStep
SYM game/src/sim/systems/herding.ts:18 fn flockOf
SYM game/src/sim/systems/herding.ts:21 fn pickLeader
SYM game/src/sim/systems/herding.ts:33 fn refreshLeaders
SYM game/src/sim/systems/herding.ts:46 const leaderOf
SYM game/src/sim/systems/herding.ts:55 fn followLeaders
SYM game/src/sim/systems/herding.ts:70 fn followHerder
SYM game/src/sim/systems/herding.ts:88 fn hash
SYM game/src/sim/systems/herding.ts:95 fn horseGrazeStep
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
FILE game/src/sim/systems/houseLayout.ts 8.0KB 114L exports: WalkRect,HouseRoom,houseInteriorKeys,houseRoom,clampToWalk
SYM game/src/sim/systems/houseLayout.ts:14 type WalkRect
SYM game/src/sim/systems/houseLayout.ts:15 interface HouseRoom
SYM game/src/sim/systems/houseLayout.ts:28 const houseInteriorKeys
SYM game/src/sim/systems/houseLayout.ts:30 fn resolve
SYM game/src/sim/systems/houseLayout.ts:40 fn houseRoom
SYM game/src/sim/systems/houseLayout.ts:107 fn clampToWalk
FILE game/src/sim/systems/interior.ts 20.6KB 379L exports: InteriorSpot,RoomSpec,InteriorsConfig,InteriorService,EnterDoor,sumEnterDoors,campEnterDoors,enterDoors,nearEnterDoor,roomSpec,roomGerSize,currentRoom,clampToRoom,enterBuilding,+7
SYM game/src/sim/systems/interior.ts:21 interface InteriorSpot
SYM game/src/sim/systems/interior.ts:22 interface RoomSpec
SYM game/src/sim/systems/interior.ts:60 interface InteriorsConfig
SYM game/src/sim/systems/interior.ts:79 type InteriorService
SYM game/src/sim/systems/interior.ts:81 interface EnterDoor
SYM game/src/sim/systems/interior.ts:98 fn serviceOf
SYM game/src/sim/systems/interior.ts:106 fn sumEnterDoors
SYM game/src/sim/systems/interior.ts:129 fn campEnterDoors
SYM game/src/sim/systems/interior.ts:154 fn enterDoors
SYM game/src/sim/systems/interior.ts:164 fn nearEnterDoor
SYM game/src/sim/systems/interior.ts:183 fn roomSpec
SYM game/src/sim/systems/interior.ts:210 fn roomGerSize
SYM game/src/sim/systems/interior.ts:215 fn currentRoom
SYM game/src/sim/systems/interior.ts:221 fn clampToRoom
SYM game/src/sim/systems/interior.ts:263 fn enterBuilding
SYM game/src/sim/systems/interior.ts:281 fn atExit
SYM game/src/sim/systems/interior.ts:287 fn exitBuilding
SYM game/src/sim/systems/interior.ts:302 fn moveInterior
SYM game/src/sim/systems/interior.ts:313 fn atCounter
SYM game/src/sim/systems/interior.ts:319 fn interiorService
SYM game/src/sim/systems/interior.ts:326 fn ensureInteriorValid
SYM game/src/sim/systems/interior.ts:333 fn validateInteriors
FILE game/src/sim/systems/mapTraffic.ts 1.6KB 35L exports: DriverOnMap,driversOnMap
SYM game/src/sim/systems/mapTraffic.ts:9 interface DriverOnMap
SYM game/src/sim/systems/mapTraffic.ts:20 fn driversOnMap
FILE game/src/sim/systems/milestones.ts 8.8KB 168L exports: Stats,MilestoneState,newStats,newMilestones,MilestoneDef,MilestonesConfig,conditionMet,Reached,checkMilestones,recordDay,GoalProgress,seasonGoal,nextStage,validateMilestones
SYM game/src/sim/systems/milestones.ts:12 interface Stats
SYM game/src/sim/systems/milestones.ts:27 interface MilestoneState
SYM game/src/sim/systems/milestones.ts:34 fn newStats
SYM game/src/sim/systems/milestones.ts:37 fn newMilestones
SYM game/src/sim/systems/milestones.ts:41 interface MilestoneDef
SYM game/src/sim/systems/milestones.ts:46 interface MilestonesConfig
SYM game/src/sim/systems/milestones.ts:54 fn num
SYM game/src/sim/systems/milestones.ts:60 fn SPECIES_KINDS
SYM game/src/sim/systems/milestones.ts:63 fn conditionMet
SYM game/src/sim/systems/milestones.ts:91 interface Reached
SYM game/src/sim/systems/milestones.ts:94 fn checkMilestones
SYM game/src/sim/systems/milestones.ts:109 fn recordDay
SYM game/src/sim/systems/milestones.ts:115 interface GoalProgress
SYM game/src/sim/systems/milestones.ts:118 fn seasonGoal
SYM game/src/sim/systems/milestones.ts:131 fn nextStage
SYM game/src/sim/systems/milestones.ts:150 fn validateMilestones
FILE game/src/sim/systems/night.ts 5.6KB 112L exports: goesHome,homeSpot,atHome,eveningStep,sleepAll,intakeFactor,dailyMilkLiters,morning
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
FILE game/src/sim/systems/npc.ts 20.7KB 364L exports: NpcLook,NpcDef,NpcsConfig,NpcMode,NpcNow,hhmm,npcById,roomOfBuilding,npcTimelineStats,isHoliday,npcAt,npcsAt,awayBuildings,relativeAtBuilding,+1
SYM game/src/sim/systems/npc.ts:16 interface NpcLook
SYM game/src/sim/systems/npc.ts:17 interface NpcDef
SYM game/src/sim/systems/npc.ts:33 interface NpcsConfig
SYM game/src/sim/systems/npc.ts:43 type NpcMode
SYM game/src/sim/systems/npc.ts:44 interface NpcNow
SYM game/src/sim/systems/npc.ts:55 const hhmm
SYM game/src/sim/systems/npc.ts:74 fn inRotRect
SYM game/src/sim/systems/npc.ts:80 fn worldOf
SYM game/src/sim/systems/npc.ts:113 fn cellOf
SYM game/src/sim/systems/npc.ts:114 fn free
SYM game/src/sim/systems/npc.ts:117 fn clearLine
SYM game/src/sim/systems/npc.ts:126 fn nearestFree
SYM game/src/sim/systems/npc.ts:135 fn pathBetween
SYM game/src/sim/systems/npc.ts:189 fn hash
SYM game/src/sim/systems/npc.ts:191 fn npcById
SYM game/src/sim/systems/npc.ts:194 fn roomOfBuilding
SYM game/src/sim/systems/npc.ts:201 fn homePoint
SYM game/src/sim/systems/npc.ts:212 fn stopOf
SYM game/src/sim/systems/npc.ts:237 fn metersPerMin
SYM game/src/sim/systems/npc.ts:239 fn buildTimeline
SYM game/src/sim/systems/npc.ts:263 fn timelineOf
SYM game/src/sim/systems/npc.ts:271 fn npcTimelineStats
SYM game/src/sim/systems/npc.ts:276 const isHoliday
SYM game/src/sim/systems/npc.ts:279 fn npcAt
SYM game/src/sim/systems/npc.ts:302 fn npcsAt
SYM game/src/sim/systems/npc.ts:307 fn awayBuildings
SYM game/src/sim/systems/npc.ts:314 fn relativeAtBuilding
SYM game/src/sim/systems/npc.ts:325 fn npcConfigErrors
FILE game/src/sim/systems/ownGers.ts 5.5KB 97L exports: ExtraGer,OwnGer,ownGers,gerCount,moveMultSum,gerStorageBonus,gerAddPrice,gerSellPrice,freeDwellingSlot,addExtraGer,sellGer,extraDoorId,gerSizeOfDoor,sellableGers
SYM game/src/sim/systems/ownGers.ts:12 interface ExtraGer
SYM game/src/sim/systems/ownGers.ts:14 interface OwnGer
SYM game/src/sim/systems/ownGers.ts:17 fn ownGers
SYM game/src/sim/systems/ownGers.ts:24 const gerCount
SYM game/src/sim/systems/ownGers.ts:27 fn moveMultSum
SYM game/src/sim/systems/ownGers.ts:33 fn gerStorageBonus
SYM game/src/sim/systems/ownGers.ts:38 fn gerAddPrice
SYM game/src/sim/systems/ownGers.ts:44 fn gerSellPrice
SYM game/src/sim/systems/ownGers.ts:50 fn freeDwellingSlot
SYM game/src/sim/systems/ownGers.ts:57 fn addExtraGer
SYM game/src/sim/systems/ownGers.ts:66 fn sellGer
SYM game/src/sim/systems/ownGers.ts:83 const extraDoorId
SYM game/src/sim/systems/ownGers.ts:86 fn gerSizeOfDoor
SYM game/src/sim/systems/ownGers.ts:92 fn sellableGers
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
FILE game/src/sim/systems/publicLayout.ts 6.5KB 78L exports: publicInteriorKinds,publicBlockers
SYM game/src/sim/systems/publicLayout.ts:15 const publicInteriorKinds
SYM game/src/sim/systems/publicLayout.ts:18 fn publicBlockers
FILE game/src/sim/systems/safety.ts 7.3KB 129L exports: StuckConfig,stuckCfg,waterDepthAt,inBounds,isWalkable,nearDen,nearestWalkable,safeFleeTarget,detectStuck
SYM game/src/sim/systems/safety.ts:12 interface StuckConfig
SYM game/src/sim/systems/safety.ts:32 const stuckCfg
SYM game/src/sim/systems/safety.ts:35 fn waterDepthAt
SYM game/src/sim/systems/safety.ts:46 fn inBounds
SYM game/src/sim/systems/safety.ts:54 fn isWalkable
SYM game/src/sim/systems/safety.ts:59 fn nearDen
SYM game/src/sim/systems/safety.ts:66 fn nearestWalkable
SYM game/src/sim/systems/safety.ts:83 fn safeFleeTarget
SYM game/src/sim/systems/safety.ts:108 fn detectStuck
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
FILE game/src/sim/systems/shops.ts 2.9KB 71L exports: ShopHours,ShopsConfig,shopHours,isOpen,minutesUntilOpen,fmtHour,closedMsg,tradeDoorOf,validateShops
SYM game/src/sim/systems/shops.ts:12 interface ShopHours
SYM game/src/sim/systems/shops.ts:17 interface ShopsConfig
SYM game/src/sim/systems/shops.ts:24 fn shopHours
SYM game/src/sim/systems/shops.ts:32 fn hourOf
SYM game/src/sim/systems/shops.ts:37 fn isOpen
SYM game/src/sim/systems/shops.ts:44 fn minutesUntilOpen
SYM game/src/sim/systems/shops.ts:52 fn fmtHour
SYM game/src/sim/systems/shops.ts:57 fn closedMsg
SYM game/src/sim/systems/shops.ts:62 fn tradeDoorOf
SYM game/src/sim/systems/shops.ts:66 fn validateShops
FILE game/src/sim/systems/sleep.ts 3.3KB 60L exports: wakeOptions,sleepHours,sleepPlace,minutesUntilWake,sleepUntil
SYM game/src/sim/systems/sleep.ts:15 fn wakeOptions
SYM game/src/sim/systems/sleep.ts:22 fn sleepHours
SYM game/src/sim/systems/sleep.ts:28 fn sleepPlace
SYM game/src/sim/systems/sleep.ts:36 fn minutesUntilWake
SYM game/src/sim/systems/sleep.ts:43 fn sleepUntil
FILE game/src/sim/systems/storage.ts 3.0KB 76L exports: capacity,used,freeSpace,count,add,take,dailyStorageAging
SYM game/src/sim/systems/storage.ts:9 fn capacity
SYM game/src/sim/systems/storage.ts:14 fn used
SYM game/src/sim/systems/storage.ts:18 fn freeSpace
SYM game/src/sim/systems/storage.ts:22 fn count
SYM game/src/sim/systems/storage.ts:27 fn add
SYM game/src/sim/systems/storage.ts:37 fn take
SYM game/src/sim/systems/storage.ts:54 fn dailyStorageAging
FILE game/src/sim/systems/sumtown.ts 12.3KB 269L exports: SumXZ,SumRoofSpec,SumYardSpec,SumBuildingSpec,SumCompoundSpec,SumFieldSpec,SumSpecialPlotSpec,SumZoneSpec,SumRoadSpec,SumPropSpec,SumLayout,Facing,TRADE_ROLES,TradeRole,+17
SYM game/src/sim/systems/sumtown.ts:13 type SumXZ
SYM game/src/sim/systems/sumtown.ts:14 interface SumRoofSpec
SYM game/src/sim/systems/sumtown.ts:15 interface SumYardSpec
SYM game/src/sim/systems/sumtown.ts:16 interface SumBuildingSpec
SYM game/src/sim/systems/sumtown.ts:28 interface SumCompoundSpec
SYM game/src/sim/systems/sumtown.ts:34 interface SumFieldSpec
SYM game/src/sim/systems/sumtown.ts:35 interface SumSpecialPlotSpec
SYM game/src/sim/systems/sumtown.ts:39 interface SumZoneSpec
SYM game/src/sim/systems/sumtown.ts:40 interface SumRoadSpec
SYM game/src/sim/systems/sumtown.ts:41 interface SumPropSpec
SYM game/src/sim/systems/sumtown.ts:42 interface SumLayout
SYM game/src/sim/systems/sumtown.ts:62 type Facing
SYM game/src/sim/systems/sumtown.ts:65 const TRADE_ROLES
SYM game/src/sim/systems/sumtown.ts:66 type TradeRole
SYM game/src/sim/systems/sumtown.ts:68 interface SumDoor
SYM game/src/sim/systems/sumtown.ts:79 interface LotSlot
SYM game/src/sim/systems/sumtown.ts:82 fn facingOf
SYM game/src/sim/systems/sumtown.ts:87 fn doorPoint
SYM game/src/sim/systems/sumtown.ts:103 fn allBuildings
SYM game/src/sim/systems/sumtown.ts:108 fn sumDoors
SYM game/src/sim/systems/sumtown.ts:127 fn lotSlots
SYM game/src/sim/systems/sumtown.ts:132 fn worldLimit
SYM game/src/sim/systems/sumtown.ts:137 fn nearTradeDoor
SYM game/src/sim/systems/sumtown.ts:153 fn teahouseDoor
SYM game/src/sim/systems/sumtown.ts:159 fn nearLotSlot
SYM game/src/sim/systems/sumtown.ts:174 fn orderAllowed
SYM game/src/sim/systems/sumtown.ts:195 fn canSellProducts
SYM game/src/sim/systems/sumtown.ts:198 fn canSellAnimals
SYM game/src/sim/systems/sumtown.ts:202 fn pointInPoly
SYM game/src/sim/systems/sumtown.ts:210 fn distSeg
SYM game/src/sim/systems/sumtown.ts:218 fn sumHeight
SYM game/src/sim/systems/sumtown.ts:228 fn nearestOnPolyline
SYM game/src/sim/systems/sumtown.ts:246 fn faceTowardRoad
SYM game/src/sim/systems/sumtown.ts:261 fn plotHouse
FILE game/src/sim/systems/sumwalk.ts 26.4KB 400L exports: WalkBox,WalkCyl,WalkYard,WalkSolids,WalkConfig,Pushed,pushOut,slideMove,wallRing,StuckState,stuckStep,nearestFreeSpot,Pt,Anchor,+16
SYM game/src/sim/systems/sumwalk.ts:6 interface WalkBox
SYM game/src/sim/systems/sumwalk.ts:7 interface WalkCyl
SYM game/src/sim/systems/sumwalk.ts:9 interface WalkYard
SYM game/src/sim/systems/sumwalk.ts:11 interface WalkSolids
SYM game/src/sim/systems/sumwalk.ts:13 interface WalkConfig
SYM game/src/sim/systems/sumwalk.ts:29 interface Pushed
SYM game/src/sim/systems/sumwalk.ts:32 fn pushOut
SYM game/src/sim/systems/sumwalk.ts:67 fn slideMove
SYM game/src/sim/systems/sumwalk.ts:84 fn wallRing
SYM game/src/sim/systems/sumwalk.ts:100 interface StuckState
SYM game/src/sim/systems/sumwalk.ts:101 fn stuckStep
SYM game/src/sim/systems/sumwalk.ts:110 fn nearestFreeSpot
SYM game/src/sim/systems/sumwalk.ts:124 interface Pt
SYM game/src/sim/systems/sumwalk.ts:126 interface Anchor
SYM game/src/sim/systems/sumwalk.ts:129 interface RouteCfg
SYM game/src/sim/systems/sumwalk.ts:139 interface Poly
SYM game/src/sim/systems/sumwalk.ts:140 fn polyOf
SYM game/src/sim/systems/sumwalk.ts:146 fn polyAt
SYM game/src/sim/systems/sumwalk.ts:157 const inYard
SYM game/src/sim/systems/sumwalk.ts:160 class NavMap
SYM game/src/sim/systems/sumwalk.ts:175 method NavMap.layer
SYM game/src/sim/systems/sumwalk.ts:196 method NavMap.blockedAt
SYM game/src/sim/systems/sumwalk.ts:201 method NavMap.clear
SYM game/src/sim/systems/sumwalk.ts:210 method NavMap.snap
SYM game/src/sim/systems/sumwalk.ts:227 method NavMap.astar
SYM game/src/sim/systems/sumwalk.ts:261 interface LegSample
SYM game/src/sim/systems/sumwalk.ts:262 interface LegProbe
SYM game/src/sim/systems/sumwalk.ts:265 fn findLeg
SYM game/src/sim/systems/sumwalk.ts:285 interface LegPlanOpts
SYM game/src/sim/systems/sumwalk.ts:291 fn near
SYM game/src/sim/systems/sumwalk.ts:292 fn anchorAt
SYM game/src/sim/systems/sumwalk.ts:295 fn fillet
SYM game/src/sim/systems/sumwalk.ts:316 fn planLegPath
SYM game/src/sim/systems/sumwalk.ts:374 fn isEnterablePlot
SYM game/src/sim/systems/sumwalk.ts:381 fn gateBox
SYM game/src/sim/systems/sumwalk.ts:387 fn playerSolids
SYM game/src/sim/systems/sumwalk.ts:396 fn gatePush
FILE game/src/sim/systems/town.ts 18.8KB 371L exports: HouseMode,ZdtgLoan,BankLoan,RelativeState,TownState,TownEvent,newTownState,plotDoors,TownRole,nearTownDoor,housePrice,buyHouse,setHouseMode,donate,+13
SYM game/src/sim/systems/town.ts:20 type HouseMode
SYM game/src/sim/systems/town.ts:21 interface ZdtgLoan
SYM game/src/sim/systems/town.ts:22 interface BankLoan
SYM game/src/sim/systems/town.ts:23 interface RelativeState
SYM game/src/sim/systems/town.ts:24 interface TownState
SYM game/src/sim/systems/town.ts:35 type TownEvent
SYM game/src/sim/systems/town.ts:37 fn newTownState
SYM game/src/sim/systems/town.ts:46 fn plotDoors
SYM game/src/sim/systems/town.ts:53 type TownRole
SYM game/src/sim/systems/town.ts:57 fn nearTownDoor
SYM game/src/sim/systems/town.ts:77 fn near
SYM game/src/sim/systems/town.ts:82 fn spend
SYM game/src/sim/systems/town.ts:86 fn earn
SYM game/src/sim/systems/town.ts:90 fn repUp
SYM game/src/sim/systems/town.ts:96 fn housePrice
SYM game/src/sim/systems/town.ts:100 fn buyHouse
SYM game/src/sim/systems/town.ts:112 fn setHouseMode
SYM game/src/sim/systems/town.ts:122 fn donate
SYM game/src/sim/systems/town.ts:133 fn zdtgPackages
SYM game/src/sim/systems/town.ts:138 fn takeZdtgLoan
SYM game/src/sim/systems/town.ts:159 fn zdtgRepayable
SYM game/src/sim/systems/town.ts:166 fn repayZdtgLoan
SYM game/src/sim/systems/town.ts:188 fn bankCollateralHouses
SYM game/src/sim/systems/town.ts:193 fn bankLimit
SYM game/src/sim/systems/town.ts:200 fn takeBankLoan
SYM game/src/sim/systems/town.ts:211 fn repayBankLoan
SYM game/src/sim/systems/town.ts:229 interface GiftPlan
SYM game/src/sim/systems/town.ts:232 fn giveGift
SYM game/src/sim/systems/town.ts:277 fn townDaily
SYM game/src/sim/systems/town.ts:331 fn townMonthly
SYM game/src/sim/systems/town.ts:337 fn townSeason
FILE game/src/sim/systems/trader.ts 7.4KB 166L exports: TraderKindCfg,TraderConfig,TraderVisit,TraderState,TraderEvent,newTraderState,validateTrader,traderDaily,traderPresent,traderHour,nearTrader,TraderPlan,traderBuyPrice,traderHayPrice,+1
SYM game/src/sim/systems/trader.ts:14 interface TraderKindCfg
SYM game/src/sim/systems/trader.ts:22 interface TraderConfig
SYM game/src/sim/systems/trader.ts:29 interface TraderVisit
SYM game/src/sim/systems/trader.ts:39 interface TraderState
SYM game/src/sim/systems/trader.ts:46 type TraderEvent
SYM game/src/sim/systems/trader.ts:48 fn newTraderState
SYM game/src/sim/systems/trader.ts:53 fn validateTrader
SYM game/src/sim/systems/trader.ts:66 fn traderDaily
SYM game/src/sim/systems/trader.ts:84 fn traderPresent
SYM game/src/sim/systems/trader.ts:92 fn traderHour
SYM game/src/sim/systems/trader.ts:102 fn nearTrader
SYM game/src/sim/systems/trader.ts:107 interface TraderPlan
SYM game/src/sim/systems/trader.ts:113 fn traderBuyPrice
SYM game/src/sim/systems/trader.ts:116 fn traderHayPrice
SYM game/src/sim/systems/trader.ts:121 fn traderTrade
FILE game/src/sim/systems/travel.ts 25.2KB 575L exports: TravelEvent,fleetOf,initFleetVehicle,addVehicle,syncAway,cargoUnits,hayInOrders,hayRoom,cargoSlots,nearestVehicle,enterVehicle,exitVehicle,boardBest,takeFromStorage,+20
SYM game/src/sim/systems/travel.ts:24 type TravelEvent
SYM game/src/sim/systems/travel.ts:29 fn fleetOf
SYM game/src/sim/systems/travel.ts:34 fn initFleetVehicle
SYM game/src/sim/systems/travel.ts:45 fn addVehicle
SYM game/src/sim/systems/travel.ts:51 fn syncAway
SYM game/src/sim/systems/travel.ts:56 fn cargoUnits
SYM game/src/sim/systems/travel.ts:61 fn hayInOrders
SYM game/src/sim/systems/travel.ts:66 fn hayRoom
SYM game/src/sim/systems/travel.ts:72 fn cargoSlots
SYM game/src/sim/systems/travel.ts:77 fn nearestVehicle
SYM game/src/sim/systems/travel.ts:91 fn enterVehicle
SYM game/src/sim/systems/travel.ts:105 fn exitVehicle
SYM game/src/sim/systems/travel.ts:123 fn boardBest
SYM game/src/sim/systems/travel.ts:143 fn takeFromStorage
SYM game/src/sim/systems/travel.ts:162 fn droveAnimals
SYM game/src/sim/systems/travel.ts:173 fn canTravel
SYM game/src/sim/systems/travel.ts:178 fn originKm
SYM game/src/sim/systems/travel.ts:184 fn sumId
SYM game/src/sim/systems/travel.ts:189 fn driveVehicle
SYM game/src/sim/systems/travel.ts:207 fn leaveToMap
SYM game/src/sim/systems/travel.ts:222 fn mapGo
SYM game/src/sim/systems/travel.ts:235 fn mapSpeedKmPerMin
SYM game/src/sim/systems/travel.ts:245 fn droveSlows
SYM game/src/sim/systems/travel.ts:251 fn partySpeedKmPerMin
SYM game/src/sim/systems/travel.ts:257 fn mapStep
SYM game/src/sim/systems/travel.ts:276 fn spend
SYM game/src/sim/systems/travel.ts:282 fn arrive
SYM game/src/sim/systems/travel.ts:348 fn migrateHere
SYM game/src/sim/systems/travel.ts:359 fn atLoadingSpot
SYM game/src/sim/systems/travel.ts:365 fn loadCargo
SYM game/src/sim/systems/travel.ts:393 fn unloadCargo
SYM game/src/sim/systems/travel.ts:418 interface TradePlan
SYM game/src/sim/systems/travel.ts:425 fn sellableAtShop
SYM game/src/sim/systems/travel.ts:434 fn sellableAnimals
SYM game/src/sim/systems/travel.ts:440 fn animalRoom
SYM game/src/sim/systems/travel.ts:452 fn trade
SYM game/src/sim/systems/travel.ts:541 fn buyLotVehicle
FILE game/src/sim/systems/trip.ts 4.3KB 108L exports: VehicleSpec,vehicleCfg,bestTruck,parkingSpot,productPrice,orderPrice,animalSlots,deliver
SYM game/src/sim/systems/trip.ts:15 type VehicleSpec
SYM game/src/sim/systems/trip.ts:17 fn vehicleCfg
SYM game/src/sim/systems/trip.ts:22 fn bestTruck
SYM game/src/sim/systems/trip.ts:32 fn parkingSpot
SYM game/src/sim/systems/trip.ts:36 fn productPrice
SYM game/src/sim/systems/trip.ts:40 fn orderPrice
SYM game/src/sim/systems/trip.ts:64 fn animalSlots
SYM game/src/sim/systems/trip.ts:70 fn deliver
FILE game/src/sim/systems/wolves.ts 31.9KB 660L exports: Den,WolfMode,Wolf,isPup,hungerStage,WolfState,Zone,WolfEvent,spawnWolves,protectionZones,isProtected,spookAnimals,scareWolf,wolvesStep,+6
SYM game/src/sim/systems/wolves.ts:37 interface Den
SYM game/src/sim/systems/wolves.ts:44 type WolfMode
SYM game/src/sim/systems/wolves.ts:46 interface Wolf
SYM game/src/sim/systems/wolves.ts:68 fn isPup
SYM game/src/sim/systems/wolves.ts:73 fn hungerStage
SYM game/src/sim/systems/wolves.ts:79 interface WolfState
SYM game/src/sim/systems/wolves.ts:90 interface Zone
SYM game/src/sim/systems/wolves.ts:97 type WolfEvent
SYM game/src/sim/systems/wolves.ts:108 fn campSeed
SYM game/src/sim/systems/wolves.ts:114 fn spawnWolves
SYM game/src/sim/systems/wolves.ts:140 fn protectionZones
SYM game/src/sim/systems/wolves.ts:164 fn isProtected
SYM game/src/sim/systems/wolves.ts:172 fn moveToward
SYM game/src/sim/systems/wolves.ts:187 fn pushOut
SYM game/src/sim/systems/wolves.ts:205 fn spookAnimals
SYM game/src/sim/systems/wolves.ts:262 fn scareWolf
SYM game/src/sim/systems/wolves.ts:270 fn wolvesStep
SYM game/src/sim/systems/wolves.ts:477 fn nextDen
SYM game/src/sim/systems/wolves.ts:486 fn nearestPrey
SYM game/src/sim/systems/wolves.ts:506 fn raidStep
SYM game/src/sim/systems/wolves.ts:545 fn nightRaid
SYM game/src/sim/systems/wolves.ts:574 fn wolvesDaily
SYM game/src/sim/systems/wolves.ts:628 fn killWolf
SYM game/src/sim/systems/wolves.ts:633 fn endRaid
SYM game/src/sim/systems/wolves.ts:645 fn scareWolves
SYM game/src/sim/systems/wolves.ts:658 fn huntingWolves
FILE game/src/sim/terrain.ts 3.2KB 83L exports: smoothstep,riverZ,waterDistance,baseHeightAt,heightAt,waterLevel
SYM game/src/sim/terrain.ts:7 fn clamp
SYM game/src/sim/terrain.ts:8 const smoothstep
SYM game/src/sim/terrain.ts:14 fn riverZ
SYM game/src/sim/terrain.ts:22 fn waterDistance
SYM game/src/sim/terrain.ts:28 fn baseHeightAt
SYM game/src/sim/terrain.ts:54 fn heightAt
SYM game/src/sim/terrain.ts:77 fn waterLevel
FILE tools/balance_sim/run.ts 27.5KB 463L
SYM tools/balance_sim/run.ts:34 fn nextGerOrder
SYM tools/balance_sim/run.ts:56 fn applyOverrides
SYM tools/balance_sim/run.ts:77 fn escort
SYM tools/balance_sim/run.ts:84 fn dogsGuard
SYM tools/balance_sim/run.ts:90 fn collectAll
SYM tools/balance_sim/run.ts:100 fn processAll
SYM tools/balance_sim/run.ts:107 fn surplusMales
SYM tools/balance_sim/run.ts:122 fn tripIfUseful
SYM tools/balance_sim/run.ts:144 fn bestSpot
SYM tools/balance_sim/run.ts:181 fn rotateCamp
SYM tools/balance_sim/run.ts:197 fn buyPlan
SYM tools/balance_sim/run.ts:251 fn mediumStrategy
SYM tools/balance_sim/run.ts:344 fn run
SYM tools/balance_sim/run.ts:393 fn killsTxt
SYM tools/balance_sim/run.ts:400 fn median
SYM tools/balance_sim/run.ts:405 fn fmt
FILE tools/genHouseInteriors.ts 0.8KB 10L
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
FILE game/tests/animalLook.test.ts 11.0KB 192L
FILE game/tests/animals.test.ts 2.3KB 39L
FILE game/tests/breeding.test.ts 1.4KB 33L
FILE game/tests/buildings.test.ts 18.9KB 250L
FILE game/tests/camclip.test.ts 3.9KB 68L
FILE game/tests/characters.test.ts 30.1KB 507L
FILE game/tests/clock.test.ts 2.7KB 52L
FILE game/tests/config.test.ts 1.4KB 29L
FILE game/tests/difficulty.test.ts 4.9KB 99L
FILE game/tests/docs.test.ts 4.0KB 76L
FILE game/tests/dogs.test.ts 7.5KB 190L
FILE game/tests/driver.test.ts 6.6KB 132L
FILE game/tests/flee.test.ts 4.3KB 83L
FILE game/tests/ger.test.ts 9.5KB 181L
FILE game/tests/gerSize.test.ts 8.6KB 155L
FILE game/tests/gers.test.ts 9.9KB 170L
FILE game/tests/grazing.test.ts 2.3KB 46L
FILE game/tests/helpers.ts 0.8KB 20L
FILE game/tests/herder.test.ts 6.3KB 139L
FILE game/tests/herding.test.ts 6.5KB 131L
FILE game/tests/herds.test.ts 5.1KB 112L
FILE game/tests/homelights.test.ts 3.4KB 66L
FILE game/tests/i18n.test.ts 9.1KB 172L
FILE game/tests/interior.test.ts 10.5KB 203L
FILE game/tests/milestones.test.ts 6.7KB 125L
FILE game/tests/night.test.ts 6.5KB 127L
FILE game/tests/npcs.test.ts 8.2KB 137L
FILE game/tests/npcwalk.test.ts 7.5KB 115L
FILE game/tests/pasture.test.ts 3.8KB 72L
FILE game/tests/perf.perf.test.ts 3.2KB 57L
FILE game/tests/persist.test.ts 10.2KB 212L
FILE game/tests/playthrough.test.ts 6.3KB 133L
FILE game/tests/products.test.ts 3.0KB 56L
FILE game/tests/rng.test.ts 0.8KB 26L
FILE game/tests/save.test.ts 11.7KB 233L
FILE game/tests/seasons.test.ts 7.2KB 140L
FILE game/tests/shops.test.ts 3.1KB 62L
FILE game/tests/sim.test.ts 1.4KB 30L
FILE game/tests/sleep.test.ts 5.6KB 124L
FILE game/tests/staff.test.ts 13.5KB 248L
FILE game/tests/stuck.test.ts 4.4KB 80L
FILE game/tests/style.test.ts 8.9KB 165L
FILE game/tests/sumtown.test.ts 4.6KB 91L
FILE game/tests/sumwalk.test.ts 20.5KB 320L
FILE game/tests/town.test.ts 6.1KB 127L
FILE game/tests/trader.test.ts 8.4KB 164L
FILE game/tests/transfer.test.ts 14.2KB 255L
FILE game/tests/trip.test.ts 9.2KB 173L
FILE game/tests/wolves.test.ts 14.7KB 337L
FILE docs/CONTEXT.md 32.8KB 131L
DOC docs/CONTEXT.md:12-18 ## 1. Тоглоом юу вэ
DOC docs/CONTEXT.md:19-29 ## 2. Стек ба командууд
DOC docs/CONTEXT.md:30-105 ## 3. Файлын зураглал (`game/src/`)
DOC docs/CONTEXT.md:106-108 ## 4. `data/*.json` → аль файл хэрэглэдэг
DOC docs/CONTEXT.md:109-117 ## 5. Архитектурын дүрэм ([[architecture]])
DOC docs/CONTEXT.md:118-121 ## 6. Баримтын давуу эрх (зөрчилдвөл дээд нь хүчинтэй)
DOC docs/CONTEXT.md:122-124 ## 7. Нээлттэй асуултууд
DOC docs/CONTEXT.md:125-131 ## 8. Баримтын хэсгийн индекс (мөрийн муж)
FILE docs/INDEX.md 14.1KB 136L
DOC docs/INDEX.md:16-30 ## 1. Унших дараалал ба давуу эрх
DOC docs/INDEX.md:31-107 ## 2. Баримтууд
DOC docs/INDEX.md:108-111 ## 3. Гол тоо
DOC docs/INDEX.md:112-130 ## 4. Нэр томьёо
DOC docs/INDEX.md:131-136 ## 5. Баримт засах дүрэм
FILE docs/architecture.md 20.3KB 236L
DOC docs/architecture.md:16-29 ## 1. Технологи
DOC docs/architecture.md:30-68 ## 2. Хавтасны бүтэц
DOC docs/architecture.md:69-138 ## 3. Гол зарчмууд
DOC docs/architecture.md:139-179 ## 4. Өгөгдлийн загвар (товч)
DOC docs/architecture.md:180-189 ## 5. Дүрслэл
DOC docs/architecture.md:190-199 ## 6. Хадгалалт (M6)
DOC docs/architecture.md:200-207 ## 7. Хэл
DOC docs/architecture.md:208-218 ## 8. Тест ба тэнцвэр
DOC docs/architecture.md:219-224 ## 9. Туршилтын цэс
DOC docs/architecture.md:225-236 ## 10. Ажиллуулах
FILE docs/character-design.md 20.8KB 157L
DOC docs/character-design.md:13-27 ## 1. Хэрэглэгчийн баталсан шийдвэр (2026-11-15)
DOC docs/character-design.md:28-52 ## 2. Үндсэн дүр — хэрэгжилт (V4.4, кодонд)
DOC docs/character-design.md:53-61 ## 3. NPC-үүд одоо
DOC docs/character-design.md:62-147 ## 4. Нэг кодын сан: дүр бүрийг тохиргооноос угсрах (V4.5)
DOC docs/character-design.md:148-157 ## 5. Нээлттэй шийдвэр 🙋
FILE docs/competitive-analysis/farvival.md 7.5KB 78L
DOC docs/competitive-analysis/farvival.md:16-27 ## 1. Товч мэдээлэл
DOC docs/competitive-analysis/farvival.md:28-37 ## 2. Агуулга
DOC docs/competitive-analysis/farvival.md:38-43 ## 3. Жанрын байршил
DOC docs/competitive-analysis/farvival.md:44-68 ## 4. Манай тоглоомд хамаарах сургамж
DOC docs/competitive-analysis/farvival.md:69-73 ## 5. Нээлттэй асуулт (🙋 → `mvp-spec.md` §13)
DOC docs/competitive-analysis/farvival.md:74-78 ## Эх сурвалж
FILE docs/competitive-analysis/herder.md 10.6KB 109L
DOC docs/competitive-analysis/herder.md:16-27 ## 1. Товч мэдээлэл
DOC docs/competitive-analysis/herder.md:28-36 ## 2. Гол давталт
DOC docs/competitive-analysis/herder.md:37-47 ## 3. Системүүд
DOC docs/competitive-analysis/herder.md:48-55 ## 4. ✅ Сайшаасан зүйлс
DOC docs/competitive-analysis/herder.md:56-62 ## 5. ❌ Шүүмжилсэн зүйлс
DOC docs/competitive-analysis/herder.md:63-95 ## 6. Манай тоглоомд хамаарах сургамж
DOC docs/competitive-analysis/herder.md:96-101 ## 7. Нээлттэй асуулт (🙋 → `mvp-spec.md` §13)
DOC docs/competitive-analysis/herder.md:102-109 ## Эх сурвалж
FILE docs/competitive-analysis/herding-adventures.md 12.3KB 119L
DOC docs/competitive-analysis/herding-adventures.md:18-29 ## 1. Товч мэдээлэл
DOC docs/competitive-analysis/herding-adventures.md:30-39 ## 2. Гол санаа — «Удирдлага биш, дарамт»
DOC docs/competitive-analysis/herding-adventures.md:40-53 ## 3. Үнэлгээ (хөгжүүлэгчийн амлалт дээр үндэслэсэн)
DOC docs/competitive-analysis/herding-adventures.md:54-65 ## 4. Сүрэг туух механикийн тойм (бусад тоглоомууд)
DOC docs/competitive-analysis/herding-adventures.md:66-89 ## 5. Манай тоглоомд хамаарах сургамж
DOC docs/competitive-analysis/herding-adventures.md:90-103 ## 6. Туух механикийн нэгдсэн санал (Herdling + Herding Adventures + бусад)
DOC docs/competitive-analysis/herding-adventures.md:104-110 ## 7. Нээлттэй асуулт (🙋 → `mvp-spec.md` §13)
DOC docs/competitive-analysis/herding-adventures.md:111-119 ## Эх сурвалж
FILE docs/competitive-analysis/herdling.md 18.6KB 157L
DOC docs/competitive-analysis/herdling.md:16-27 ## 1. Товч мэдээлэл
DOC docs/competitive-analysis/herdling.md:28-35 ## 2. Гол давталт
DOC docs/competitive-analysis/herdling.md:36-67 ## 3. Системүүд
DOC docs/competitive-analysis/herdling.md:68-76 ## 4. ✅ Сайшаасан зүйлс
DOC docs/competitive-analysis/herdling.md:77-88 ## 5. ❌ Шүүмжилсэн зүйлс
DOC docs/competitive-analysis/herdling.md:89-126 ## 6. Манай тоглоомд хамаарах сургамж
DOC docs/competitive-analysis/herdling.md:127-138 ## 7. Гурван тоглоомын нийтлэг дүгнэлт
DOC docs/competitive-analysis/herdling.md:139-146 ## 8. Нээлттэй асуулт (🙋 → `mvp-spec.md` §13)
DOC docs/competitive-analysis/herdling.md:147-157 ## Эх сурвалж
FILE docs/competitive-analysis/khiimori.md 17.4KB 146L
DOC docs/competitive-analysis/khiimori.md:15-26 ## 1. Товч мэдээлэл
DOC docs/competitive-analysis/khiimori.md:27-34 ## 2. Гол давталт (core loop)
DOC docs/competitive-analysis/khiimori.md:35-64 ## 3. Системүүд
DOC docs/competitive-analysis/khiimori.md:65-75 ## 4. ✅ Юуг сайшаасан бэ
DOC docs/competitive-analysis/khiimori.md:76-88 ## 5. ❌ Юуг шүүмжилсэн бэ
DOC docs/competitive-analysis/khiimori.md:89-127 ## 6. Манай тоглоомд хамаарах сургамж
DOC docs/competitive-analysis/khiimori.md:128-134 ## 7. Нээлттэй асуулт (🙋 → `mvp-spec.md` §13)
DOC docs/competitive-analysis/khiimori.md:135-146 ## Эх сурвалж
FILE docs/competitive-analysis/medieval-dynasty.md 14.5KB 130L
DOC docs/competitive-analysis/medieval-dynasty.md:16-27 ## 1. Товч мэдээлэл
DOC docs/competitive-analysis/medieval-dynasty.md:28-36 ## 2. Гол давталт
DOC docs/competitive-analysis/medieval-dynasty.md:37-47 ## 3. Системүүд
DOC docs/competitive-analysis/medieval-dynasty.md:48-57 ## 4. ✅ Сайшаасан зүйлс (жингээр)
DOC docs/competitive-analysis/medieval-dynasty.md:58-72 ## 5. ❌ Шүүмжилсэн зүйлс (жингээр)
DOC docs/competitive-analysis/medieval-dynasty.md:73-108 ## 6. Манай тоглоомд хамаарах сургамж
DOC docs/competitive-analysis/medieval-dynasty.md:109-116 ## 7. Нээлттэй асуулт (🙋 → `mvp-spec.md` §13)
DOC docs/competitive-analysis/medieval-dynasty.md:117-130 ## Эх сурвалж
FILE docs/competitive-analysis/mount-and-blade-warband.md 14.5KB 124L
DOC docs/competitive-analysis/mount-and-blade-warband.md:16-27 ## 1. Товч мэдээлэл
DOC docs/competitive-analysis/mount-and-blade-warband.md:28-35 ## 2. Гол давталт
DOC docs/competitive-analysis/mount-and-blade-warband.md:36-45 ## 3. ✅ Сайшаасан зүйлс
DOC docs/competitive-analysis/mount-and-blade-warband.md:46-57 ## 4. ❌ Шүүмжилсэн зүйлс
DOC docs/competitive-analysis/mount-and-blade-warband.md:58-92 ## 5. Манай тоглоомд хамаарах сургамж
DOC docs/competitive-analysis/mount-and-blade-warband.md:93-103 ## 6. Таван тоглоомын нийтлэг дүгнэлт (энэ ээлжийн судалгаа)
DOC docs/competitive-analysis/mount-and-blade-warband.md:104-110 ## 7. Нээлттэй асуулт (🙋 → `mvp-spec.md` §13)
DOC docs/competitive-analysis/mount-and-blade-warband.md:111-124 ## Эх сурвалж
FILE docs/competitive-analysis/nomad-steppeborn-saga.md 17.3KB 161L
DOC docs/competitive-analysis/nomad-steppeborn-saga.md:16-28 ## 1. Товч мэдээлэл
DOC docs/competitive-analysis/nomad-steppeborn-saga.md:29-32 ## 2. Амласан гол давталт
DOC docs/competitive-analysis/nomad-steppeborn-saga.md:33-58 ## 3. Амласан системүүд
DOC docs/competitive-analysis/nomad-steppeborn-saga.md:59-69 ## 4. ✅ Сайн тал (санаа, чиглэлийн хувьд)
DOC docs/competitive-analysis/nomad-steppeborn-saga.md:70-84 ## 5. ❌ Эрсдэл, сул тал
DOC docs/competitive-analysis/nomad-steppeborn-saga.md:85-119 ## 6. Манай тоглоомд хамаарах сургамж
DOC docs/competitive-analysis/nomad-steppeborn-saga.md:120-135 ## 7. Khiimori-тэй харьцуулалт
DOC docs/competitive-analysis/nomad-steppeborn-saga.md:136-142 ## 8. Нээлттэй асуулт (🙋 → `mvp-spec.md` §13)
DOC docs/competitive-analysis/nomad-steppeborn-saga.md:143-149 ## 9. Дараагийн судлах тоглоом (санал)
DOC docs/competitive-analysis/nomad-steppeborn-saga.md:150-161 ## Эх сурвалж
FILE docs/competitive-analysis/ranch-simulator.md 11.3KB 111L
DOC docs/competitive-analysis/ranch-simulator.md:16-28 ## 1. Товч мэдээлэл
DOC docs/competitive-analysis/ranch-simulator.md:29-37 ## 2. Гол давталт
DOC docs/competitive-analysis/ranch-simulator.md:38-45 ## 3. ✅ Сайшаасан зүйлс
DOC docs/competitive-analysis/ranch-simulator.md:46-59 ## 4. ❌ Шүүмжилсэн зүйлс
DOC docs/competitive-analysis/ranch-simulator.md:60-93 ## 5. Манай тоглоомд хамаарах сургамж
DOC docs/competitive-analysis/ranch-simulator.md:94-100 ## 6. Нээлттэй асуулт (🙋 → `mvp-spec.md` §13)
DOC docs/competitive-analysis/ranch-simulator.md:101-111 ## Эх сурвалж
FILE docs/competitive-analysis/russian-village-simulator.md 16.0KB 128L
DOC docs/competitive-analysis/russian-village-simulator.md:18-32 ## 1. Товч мэдээлэл
DOC docs/competitive-analysis/russian-village-simulator.md:33-44 ## 2. Агуулга
DOC docs/competitive-analysis/russian-village-simulator.md:45-52 ## 3. ✅ Тоглогчид юуг таашаасан бэ
DOC docs/competitive-analysis/russian-village-simulator.md:53-61 ## 4. ❌ Шүүмжилсэн зүйлс
DOC docs/competitive-analysis/russian-village-simulator.md:62-72 ## 5. Дэд жанрын зураглал — «Орос амьдралын симулятор»
DOC docs/competitive-analysis/russian-village-simulator.md:73-105 ## 6. Манай тоглоомд хамаарах сургамж
DOC docs/competitive-analysis/russian-village-simulator.md:106-113 ## 7. Нээлттэй асуулт (🙋 → `mvp-spec.md` §13)
DOC docs/competitive-analysis/russian-village-simulator.md:114-128 ## Эх сурвалж
FILE docs/competitive-analysis/stardew-valley.md 13.5KB 125L
DOC docs/competitive-analysis/stardew-valley.md:16-26 ## 1. Товч мэдээлэл
DOC docs/competitive-analysis/stardew-valley.md:27-34 ## 2. Гол давталт
DOC docs/competitive-analysis/stardew-valley.md:35-48 ## 3. Урт хугацааны сэдлийн бүтэц (гол сургамж)
DOC docs/competitive-analysis/stardew-valley.md:49-58 ## 4. ✅ Сайшаасан зүйлс (Steam сэтгэгдлийн жингээр)
DOC docs/competitive-analysis/stardew-valley.md:59-71 ## 5. ❌ Шүүмжилсэн зүйлс (жингээр)
DOC docs/competitive-analysis/stardew-valley.md:72-104 ## 6. Манай тоглоомд хамаарах сургамж
DOC docs/competitive-analysis/stardew-valley.md:105-112 ## 7. Нээлттэй асуулт (🙋 → `mvp-spec.md` §13)
DOC docs/competitive-analysis/stardew-valley.md:113-125 ## Эх сурвалж
FILE docs/competitive-analysis/summary.md 29.7KB 248L
DOC docs/competitive-analysis/summary.md:17-28 ## 0. Гол 7 дүгнэлт
DOC docs/competitive-analysis/summary.md:29-46 ## 1. Судалсан тоглоомууд
DOC docs/competitive-analysis/summary.md:47-56 ## 2. Эрэмбэлэх арга
DOC docs/competitive-analysis/summary.md:57-116 ## 3. Эрэмбэлсэн дүгнэлт
DOC docs/competitive-analysis/summary.md:117-157 ## 4. Гол шийдвэрүүдийн хувилбарууд (дэлгэрэнгүй)
DOC docs/competitive-analysis/summary.md:158-171 ## 5. Тоглоомуудын хоорондын зөрчил
DOC docs/competitive-analysis/summary.md:172-200 ## 6. Зах зээл, борлуулалтын сургамж
DOC docs/competitive-analysis/summary.md:201-213 ## 7. Манай ялгарах байр суурь (нэг дор)
DOC docs/competitive-analysis/summary.md:214-242 ## 8. Шийдвэрийн асуултууд 🙋
DOC docs/competitive-analysis/summary.md:243-248 ## Эх сурвалж
FILE docs/decisions.md 20.0KB 130L
DOC docs/decisions.md:16-125 ## 0. Хэрэглэгчийн шийдвэрийн түүх
DOC docs/decisions.md:126-130 ## 13. MVP-ийн хүрээ хаагдсан (2026-11-15)
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
FILE docs/mvp-spec.md 54.4KB 470L
DOC docs/mvp-spec.md:17-24 ## 0. Хэрэглэгчийн шийдвэрийн түүх
DOC docs/mvp-spec.md:25-52 ## 1. Хүрээ
DOC docs/mvp-spec.md:53-71 ## 2. Цаг (M4.5, M5.5)
DOC docs/mvp-spec.md:72-111 ## 3. Эхлэл
DOC docs/mvp-spec.md:112-160 ## 4. Бүтээгдэхүүн: мал үлдээнэ, малчин цуглуулна (Farm Frenzy маяг)
DOC docs/mvp-spec.md:161-217 ## 5. Үнэ, тээвэр ба сумын төв
DOC docs/mvp-spec.md:218-260 ## 6. Туслах малчид (M5 — [[helpers-m5]])
DOC docs/mvp-spec.md:261-302 ## 7. Бэлчээр, бууц сэлгэх, доройтол
DOC docs/mvp-spec.md:303-340 ## 8. Чоно (M4, M4.5, B6)
DOC docs/mvp-spec.md:341-356 ## 9. Төллөлт ба нас (M5.5)
DOC docs/mvp-spec.md:357-432 ## 10. Тоглоомын зорилго ба замын тэмдэгтүүд
DOC docs/mvp-spec.md:433-455 ## 11. Прототипоос хасагдах, өөрчлөгдөх зүйл
DOC docs/mvp-spec.md:456-461 ## 12. Хөгжүүлэлтийн явц
DOC docs/mvp-spec.md:462-466 ## 13. Нээлттэй шийдвэр байхгүй
DOC docs/mvp-spec.md:467-470 ## Эх сурвалж
FILE docs/night-transport.md 9.4KB 106L
DOC docs/night-transport.md:18-32 ## 1. Цаг ба шөнө
DOC docs/night-transport.md:33-44 ## 2. Хотлох (хэрэглэгчийн дүрэм)
DOC docs/night-transport.md:45-68 ## 3. Сүү, ноос хоносон газраа (хэрэглэгчийн дүрэм)
DOC docs/night-transport.md:69-87 ## 4. Шөнийн чоно (хэрэглэгчийн дүрэм)
DOC docs/night-transport.md:88-103 ## 5. Тээвэр
DOC docs/night-transport.md:104-106 ## 6. Хэрэглэгчийн шийдвэр 🙋
FILE docs/plan/LEAD.md 9.7KB 54L
DOC docs/plan/LEAD.md:12-16 ## 1. Ажлын загвар
DOC docs/plan/LEAD.md:17-25 ## 2. Хийгдсэн (2026-11-15 19:00 → 11-16 15:00, ~60 commit, push хийгээгүй)
DOC docs/plan/LEAD.md:26-32 ## 3. Явж буй ажил (энэ тэмдэглэлийн үед)
DOC docs/plan/LEAD.md:33-45 ## 4. Хэрэглэгчийн шийдвэр хүлээж буй
DOC docs/plan/LEAD.md:46-50 ## 5. Дараагийн алхам
DOC docs/plan/LEAD.md:51-54 ## 6. Контекст хэмнэх (2026-11-16)
FILE docs/plan/M6.md 21.3KB 73L
DOC docs/plan/M6.md:15-17 ## Зорилго
DOC docs/plan/M6.md:18-34 ## MVP «дууссан» шалгуур (D1–D10 — M6 ба M7-ийн нийт)
DOC docs/plan/M6.md:35-37 ## Одоогийн байдал
DOC docs/plan/M6.md:38-56 ## Блокууд
DOC docs/plan/M6.md:57-63 ## Жолооч: сум руу шууд явуулах + 9 цагийн аяллын засвар (2026-11-16) ✅
DOC docs/plan/M6.md:64-71 ## Эрсдэл
DOC docs/plan/M6.md:72-73 ## Хуваарь
FILE docs/plan/M7.md 7.6KB 31L
DOC docs/plan/M7.md:12-22 ## Блокууд
DOC docs/plan/M7.md:23-27 ## Асуулга (10 асуулт)
DOC docs/plan/M7.md:28-31 ## Эрсдэл
FILE docs/plan/V.md 78.8KB 287L
DOC docs/plan/V.md:13-15 ## Зорилго
DOC docs/plan/V.md:16-23 ## Гарах шалгуур ([[visuals-plan]] §V3–V5, §7.1)
DOC docs/plan/V.md:24-265 ## Блокууд ба чеклист (2026-11-15)
DOC docs/plan/V.md:266-287 ## Зогссон цэг
FILE docs/plan/playtest.md 22.6KB 136L
DOC docs/plan/playtest.md:13-18 ## A. FPS ба төхөөрөмж
DOC docs/plan/playtest.md:19-39 ## B. Харааны ба соёлын баталгаажуулалт ([[V]])
DOC docs/plan/playtest.md:40-113 ## C. Мэдрэмж, үе шат бүрээр
DOC docs/plan/playtest.md:114-117 ## V4.6 хонь, ямаа (🧑 мэдрэмж)
DOC docs/plan/playtest.md:118-123 ## V4.6 S2 үхэр, адуу, нохой, чоно (🧑 мэдрэмж)
DOC docs/plan/playtest.md:124-126 ## Хүний масштаб 1.7 м (characters.json scale 0.70) (🧑 мэдрэмж)
DOC docs/plan/playtest.md:127-133 ## Сумын төвийн NPC жигд алхалт ба мөргөлдөөн (🧑 мэдрэмж, 2026-11-16)
DOC docs/plan/playtest.md:134-136 ## Мэдэгдэж буй дутагдал: NPC хашаа гаталгах (sumwalk, 2026-11-16)
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
FILE docs/visuals-plan.md 28.3KB 277L
DOC docs/visuals-plan.md:19-31 ## 1. Зорилго
DOC docs/visuals-plan.md:32-40 ## 2. Зарчим
DOC docs/visuals-plan.md:41-96 ## 3. Хэв маяг (V0-д батлах)
DOC docs/visuals-plan.md:97-109 ## 4. Одоо байгаа зүйл
DOC docs/visuals-plan.md:110-215 ## 5. Үе шатууд
DOC docs/visuals-plan.md:216-233 ## 6. Чанарын түвшин
DOC docs/visuals-plan.md:234-257 ## 7. Хэмжилт
DOC docs/visuals-plan.md:258-261 ## 8. Хойшлогдох (V1+)
DOC docs/visuals-plan.md:262-274 ## 9. Шийдвэрүүд
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
