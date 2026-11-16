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
FILE game/src/input/controller.ts 14.7KB 358L exports: ActionKind,ControllerHooks,PlayerController
SYM game/src/input/controller.ts:16 type ActionKind
SYM game/src/input/controller.ts:18 interface ControllerHooks
SYM game/src/input/controller.ts:30 fn angDiff
SYM game/src/input/controller.ts:37 class PlayerController
SYM game/src/input/controller.ts:62 method PlayerController.press
SYM game/src/input/controller.ts:136 method PlayerController.hold
SYM game/src/input/controller.ts:144 method PlayerController.shout
SYM game/src/input/controller.ts:150 method PlayerController.scare
SYM game/src/input/controller.ts:166 method PlayerController.interact
SYM game/src/input/controller.ts:189 method PlayerController.useAction
SYM game/src/input/controller.ts:214 method PlayerController.isDown
SYM game/src/input/controller.ts:219 method PlayerController.moveTo
SYM game/src/input/controller.ts:224 method PlayerController.update
SYM game/src/input/controller.ts:321 method PlayerController.drive
FILE game/src/input/touch.ts 11.8KB 267L exports: TouchHooks,TouchUI
SYM game/src/input/touch.ts:16 interface TouchHooks
SYM game/src/input/touch.ts:33 class TouchUI
SYM game/src/input/touch.ts:191 method TouchUI.enterLandscape
SYM game/src/input/touch.ts:195 method TouchUI.start
SYM game/src/input/touch.ts:201 method TouchUI.refreshInstall
SYM game/src/input/touch.ts:208 method TouchUI.install
SYM game/src/input/touch.ts:217 method TouchUI.bind
SYM game/src/input/touch.ts:235 method TouchUI.fullscreen
SYM game/src/input/touch.ts:248 method TouchUI.paused
SYM game/src/input/touch.ts:252 method TouchUI.portrait
SYM game/src/input/touch.ts:257 method TouchUI.update
FILE game/src/main.ts 32.6KB 556L
SYM game/src/main.ts:44 fn toast
SYM game/src/main.ts:68 fn start
SYM game/src/main.ts:531 fn boot
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
FILE game/src/render/animal/config.ts 17.5KB 200L exports: LookSpecies,LOOK_SPECIES,V3,Pair,BodyLook,Bump,SkirtLook,DLook,HornLook,HeadLook,MotionLook,Gait,VariantLook,SpeciesLook,+3
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
SYM game/src/render/animal/config.ts:53 interface AnimalLook
SYM game/src/render/animal/config.ts:69 fn fail
SYM game/src/render/animal/config.ts:70 fn isObj
SYM game/src/render/animal/config.ts:71 fn obj
SYM game/src/render/animal/config.ts:72 fn num
SYM game/src/render/animal/config.ts:74 fn hex
SYM game/src/render/animal/config.ts:75 fn tup
SYM game/src/render/animal/config.ts:76 fn pair
SYM game/src/render/animal/config.ts:77 fn v3
SYM game/src/render/animal/config.ts:80 fn leaves
SYM game/src/render/animal/config.ts:88 fn copyExtra
SYM game/src/render/animal/config.ts:93 fn parseD
SYM game/src/render/animal/config.ts:114 fn parseHead
SYM game/src/render/animal/config.ts:139 fn parseMotion
SYM game/src/render/animal/config.ts:151 fn parseSpecies
SYM game/src/render/animal/config.ts:173 fn parseAnimalLook
SYM game/src/render/animal/config.ts:200 const animalLook
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
FILE game/src/render/animal/pose.ts 14.6KB 204L exports: Action,LegNode,PoseState,Rig,PoseInput,newState,makeRig,actionsOf,fitAction,gaitFor,poseAnimal,settle
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
FILE game/src/render/building/index.ts 7.6KB 131L exports: BuildingDoor,BuildingRoom,BuildingPoint,BuildingWheel,BuiltBuilding,BuildOpts,makeBuilding,Khashaa,makeKhashaa,appendAt,BuildingMaterials,makeBuildingMaterials,emptyGeo,PlotSpec,+2
SYM game/src/render/building/index.ts:20 interface BuildingDoor
SYM game/src/render/building/index.ts:21 interface BuildingRoom
SYM game/src/render/building/index.ts:22 interface BuildingPoint
SYM game/src/render/building/index.ts:23 interface BuildingWheel
SYM game/src/render/building/index.ts:24 interface BuiltBuilding
SYM game/src/render/building/index.ts:40 interface BuildOpts
SYM game/src/render/building/index.ts:43 fn makeBuilding
SYM game/src/render/building/index.ts:47 interface Khashaa
SYM game/src/render/building/index.ts:49 fn makeKhashaa
SYM game/src/render/building/index.ts:53 fn makeAny
SYM game/src/render/building/index.ts:78 fn appendAt
SYM game/src/render/building/index.ts:84 interface BuildingMaterials
SYM game/src/render/building/index.ts:92 fn makeBuildingMaterials
SYM game/src/render/building/index.ts:99 const emptyGeo
SYM game/src/render/building/index.ts:101 interface PlotSpec
SYM game/src/render/building/index.ts:109 interface Plot
SYM game/src/render/building/index.ts:131 fn makePlot
FILE game/src/render/building/interior.ts 16.8KB 141L exports: buildInterior,mirroredHouse,mirrorGeoX,makeInterior
SYM game/src/render/building/interior.ts:7 fn buildInterior
SYM game/src/render/building/interior.ts:116 fn mirroredHouse
SYM game/src/render/building/interior.ts:120 fn mirrorGeoX
SYM game/src/render/building/interior.ts:128 fn makeInterior
FILE game/src/render/building/interiorData.ts 2.3KB 31L exports: HouseInteriorData,houseInteriorData
SYM game/src/render/building/interiorData.ts:5 fn r3
SYM game/src/render/building/interiorData.ts:6 interface HouseInteriorData
SYM game/src/render/building/interiorData.ts:15 fn houseInteriorData
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
FILE game/src/render/building/yard.ts 14.5KB 148L exports: buildKhashaa,makePorter,makePlot
SYM game/src/render/building/yard.ts:11 fn buildKhashaa
SYM game/src/render/building/yard.ts:83 fn makePorter
SYM game/src/render/building/yard.ts:107 fn makePlot
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
FILE game/src/render/character/animate.ts 9.0KB 174L exports: CharacterPose,animateCharacter
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
FILE game/src/render/character/rig.ts 9.1KB 175L exports: Pair,CharacterRig,BuildOptions,buildCharacter,wearOf,showOutfit,dressCharacter
SYM game/src/render/character/rig.ts:20 type Pair
SYM game/src/render/character/rig.ts:22 interface CharacterRig
SYM game/src/render/character/rig.ts:47 interface BuildOptions
SYM game/src/render/character/rig.ts:59 fn buildCharacter
SYM game/src/render/character/rig.ts:135 fn applyFigure
SYM game/src/render/character/rig.ts:155 fn wearOf
SYM game/src/render/character/rig.ts:162 fn showOutfit
SYM game/src/render/character/rig.ts:171 fn dressCharacter
FILE game/src/render/character/spec.ts 21.3KB 341L exports: BootPalette,BodyForm,ToortsogLook,FoxHatLook,HairStyle,HAIR_STYLES,Beard,BEARDS,EyeShape,EYE_SHAPES,BrowShape,BROW_SHAPES,CharacterHat,CHARACTER_HATS,+22
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
SYM game/src/render/character/spec.ts:91 interface CrowdLookSpec
SYM game/src/render/character/spec.ts:93 type TalkEventName
SYM game/src/render/character/spec.ts:94 const TALK_EVENTS
SYM game/src/render/character/spec.ts:96 type EmotionSeq
SYM game/src/render/character/spec.ts:98 interface TalkConfig
SYM game/src/render/character/spec.ts:101 interface CharactersData
SYM game/src/render/character/spec.ts:113 interface CharacterColors
SYM game/src/render/character/spec.ts:115 const OUTFIT_BODIES
SYM game/src/render/character/spec.ts:116 const OUTFIT_HATS
SYM game/src/render/character/spec.ts:119 fn isObj
SYM game/src/render/character/spec.ts:121 fn fail
SYM game/src/render/character/spec.ts:125 fn group
SYM game/src/render/character/spec.ts:130 fn color
SYM game/src/render/character/spec.ts:134 fn num
SYM game/src/render/character/spec.ts:138 fn colors
SYM game/src/render/character/spec.ts:145 fn oneOf
SYM game/src/render/character/spec.ts:149 fn pair
SYM game/src/render/character/spec.ts:153 fn parseFigure
SYM game/src/render/character/spec.ts:160 fn bool
SYM game/src/render/character/spec.ts:161 fn parseFace
SYM game/src/render/character/spec.ts:183 fn parseScarf
SYM game/src/render/character/spec.ts:187 fn parseWear
SYM game/src/render/character/spec.ts:199 fn parseSpec
SYM game/src/render/character/spec.ts:242 fn merge
SYM game/src/render/character/spec.ts:249 fn validateCharacters
SYM game/src/render/character/spec.ts:320 const characters
SYM game/src/render/character/spec.ts:323 fn characterSpec
SYM game/src/render/character/spec.ts:330 fn withColors
SYM game/src/render/character/spec.ts:338 fn helperSpec
FILE game/src/render/character/talk.ts 1.9KB 43L exports: TalkBus,talkBus,postTalkEvent,EmotionQueue,turnToward
SYM game/src/render/character/talk.ts:9 interface TalkBus
SYM game/src/render/character/talk.ts:16 const talkBus
SYM game/src/render/character/talk.ts:18 fn postTalkEvent
SYM game/src/render/character/talk.ts:24 class EmotionQueue
SYM game/src/render/character/talk.ts:29 method EmotionQueue.step
SYM game/src/render/character/talk.ts:39 fn turnToward
FILE game/src/render/characters.ts 17.1KB 341L exports: makeDog,poseDogLying,CharactersView
SYM game/src/render/characters.ts:28 fn makeDog
SYM game/src/render/characters.ts:32 fn poseDogLying
SYM game/src/render/characters.ts:35 fn makeBubble
SYM game/src/render/characters.ts:60 class CharactersView
SYM game/src/render/characters.ts:97 method CharactersView.setQuality
SYM game/src/render/characters.ts:103 method CharactersView.say
SYM game/src/render/characters.ts:110 method CharactersView.react
SYM game/src/render/characters.ts:115 method CharactersView.emotion
SYM game/src/render/characters.ts:133 method CharactersView.seatHerder
SYM game/src/render/characters.ts:146 method CharactersView.setSeason
SYM game/src/render/characters.ts:152 method CharactersView.herderObject
SYM game/src/render/characters.ts:156 method CharactersView.update
SYM game/src/render/characters.ts:225 method CharactersView.stepAnimals
SYM game/src/render/characters.ts:257 method CharactersView.updateDogs
SYM game/src/render/characters.ts:299 method CharactersView.updateWolves
FILE game/src/render/ger/atlas.ts 16.0KB 177L exports: AtlasMaps,doorAtlas,IN_RECT,interiorAtlas
SYM game/src/render/ger/atlas.ts:5 interface AtlasMaps
SYM game/src/render/ger/atlas.ts:7 fn hasDom
SYM game/src/render/ger/atlas.ts:8 fn doorAtlas
SYM game/src/render/ger/atlas.ts:110 const IN_RECT
SYM game/src/render/ger/atlas.ts:111 fn interiorAtlas
FILE game/src/render/ger/config.ts 9.8KB 128L exports: GerSize,DoorVariant,GerShape,GerWinter,GerPalette,TentPalette,GerInteriorColors,GerInterior,GerAtlas,GerConfig,TentKind,TentConfig,GerData,gerConfigErrors,+4
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
SYM game/src/render/ger/config.ts:113 fn validateGerData
SYM game/src/render/ger/config.ts:120 const GER
SYM game/src/render/ger/config.ts:121 const TENT
SYM game/src/render/ger/config.ts:124 fn gerSize
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
FILE game/src/render/interior.ts 13.9KB 282L exports: InteriorView
SYM game/src/render/interior.ts:20 class InteriorView
SYM game/src/render/interior.ts:41 method InteriorView.active
SYM game/src/render/interior.ts:46 method InteriorView.show
SYM game/src/render/interior.ts:61 method InteriorView.hide
SYM game/src/render/interior.ts:90 method InteriorView.releaseNpcs
SYM game/src/render/interior.ts:95 method InteriorView.update
SYM game/src/render/interior.ts:110 method InteriorView.buildGer
SYM game/src/render/interior.ts:143 method InteriorView.buildHouse
SYM game/src/render/interior.ts:183 method InteriorView.build
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
FILE game/src/render/npcs.ts 14.5KB 273L exports: NpcView
SYM game/src/render/npcs.ts:27 fn hex
SYM game/src/render/npcs.ts:42 class NpcView
SYM game/src/render/npcs.ts:59 method NpcView.spec
SYM game/src/render/npcs.ts:68 method NpcView.ensureRig
SYM game/src/render/npcs.ts:78 method NpcView.ensureFar
SYM game/src/render/npcs.ts:89 method NpcView.syncSeason
SYM game/src/render/npcs.ts:100 method NpcView.now
SYM game/src/render/npcs.ts:103 method NpcView.measure
SYM game/src/render/npcs.ts:110 method NpcView.drive
SYM game/src/render/npcs.ts:131 method NpcView.pickTalk
SYM game/src/render/npcs.ts:146 method NpcView.showSpeech
SYM game/src/render/npcs.ts:198 method NpcView.hideEntry
SYM game/src/render/npcs.ts:206 method NpcView.hideOutdoor
SYM game/src/render/npcs.ts:239 method NpcView.leaveIndoor
SYM game/src/render/npcs.ts:247 method NpcView.syncAwaySign
FILE game/src/render/scene.ts 25.6KB 528L exports: GameView
SYM game/src/render/scene.ts:28 fn flakeTexture
SYM game/src/render/scene.ts:41 class GameView
SYM game/src/render/scene.ts:241 method GameView.applyQuality
SYM game/src/render/scene.ts:273 method GameView.snapshot
SYM game/src/render/scene.ts:287 method GameView.toggleHeatmap
SYM game/src/render/scene.ts:293 method GameView.frame
SYM game/src/render/scene.ts:366 method GameView.hideHerderIfCameraInside
SYM game/src/render/scene.ts:375 method GameView.campSolids
SYM game/src/render/scene.ts:403 method GameView.frameInterior
SYM game/src/render/scene.ts:429 method GameView.leaveInterior
SYM game/src/render/scene.ts:445 method GameView.applyDaylight
SYM game/src/render/scene.ts:505 method GameView.updateFlakes
SYM game/src/render/scene.ts:521 method GameView.drawCalls
SYM game/src/render/scene.ts:525 method GameView.triangleCount
FILE game/src/render/staff.ts 8.9KB 187L exports: makeDwelling,StaffView
SYM game/src/render/staff.ts:27 fn helperRole
SYM game/src/render/staff.ts:36 fn makeDwelling
SYM game/src/render/staff.ts:64 class StaffView
SYM game/src/render/staff.ts:75 method StaffView.setQuality
SYM game/src/render/staff.ts:83 method StaffView.setSeason
SYM game/src/render/staff.ts:89 method StaffView.update
SYM game/src/render/staff.ts:166 method StaffView.syncDwellings
FILE game/src/render/style.ts 25.4KB 613L exports: TimeVisual,SeasonVisual,GrassVisual,WaterVisual,SmokeVisual,DogRestVisual,HerderEmotion,HerderEvent,HerderAnimVisual,SumResidentsVisual,OutfitBody,OutfitHat,HelperRole,OutfitsVisual,+10
SYM game/src/render/style.ts:5 interface TimeVisual
SYM game/src/render/style.ts:17 interface SeasonVisual
SYM game/src/render/style.ts:24 interface GrassVisual
SYM game/src/render/style.ts:35 interface WaterVisual
SYM game/src/render/style.ts:45 interface SmokeVisual
SYM game/src/render/style.ts:50 interface DogRestVisual
SYM game/src/render/style.ts:60 type HerderEmotion
SYM game/src/render/style.ts:61 type HerderEvent
SYM game/src/render/style.ts:62 interface HerderAnimVisual
SYM game/src/render/style.ts:73 interface SumResidentsVisual
SYM game/src/render/style.ts:82 type OutfitBody
SYM game/src/render/style.ts:83 type OutfitHat
SYM game/src/render/style.ts:84 type HelperRole
SYM game/src/render/style.ts:85 interface OutfitsVisual
SYM game/src/render/style.ts:91 interface MapPaperVisual
SYM game/src/render/style.ts:98 interface VehicleFxVisual
SYM game/src/render/style.ts:109 interface CloudShadowVisual
SYM game/src/render/style.ts:118 interface FlowersVisual
SYM game/src/render/style.ts:125 interface MountainLayerVisual
SYM game/src/render/style.ts:135 interface VisualPalette
SYM game/src/render/style.ts:168 interface VisualStyle
SYM game/src/render/style.ts:194 fn isRecord
SYM game/src/render/style.ts:196 fn isColor
SYM game/src/render/style.ts:197 fn isPositive
SYM game/src/render/style.ts:200 fn parseMapPaper
SYM game/src/render/style.ts:219 fn parseVehicleFx
SYM game/src/render/style.ts:240 fn parseHerderAnim
SYM game/src/render/style.ts:267 fn parseSumResidents
SYM game/src/render/style.ts:285 fn parseOutfits
SYM game/src/render/style.ts:315 fn validateVisualStyle
SYM game/src/render/style.ts:609 const visualStyle
SYM game/src/render/style.ts:611 fn paletteHex
FILE game/src/render/sumcenter.ts 22.2KB 399L exports: SumCenterView
SYM game/src/render/sumcenter.ts:41 fn residentMatrix
SYM game/src/render/sumcenter.ts:45 fn residents
SYM game/src/render/sumcenter.ts:70 class SumCenterView
SYM game/src/render/sumcenter.ts:228 method SumCenterView.syncTown
SYM game/src/render/sumcenter.ts:243 method SumCenterView.buildTown
SYM game/src/render/sumcenter.ts:268 method SumCenterView.buildGers
SYM game/src/render/sumcenter.ts:306 method SumCenterView.syncTalk
SYM game/src/render/sumcenter.ts:347 method SumCenterView.syncCrowd
SYM game/src/render/sumcenter.ts:372 method SumCenterView.takeLive
SYM game/src/render/sumcenter.ts:389 method SumCenterView.releaseLive
SYM game/src/render/sumcenter.ts:396 method SumCenterView.syncLot
FILE game/src/render/sumlayout.ts 46.2KB 839L exports: Rect,VehicleSlotView,HomeDoor,SumPlotView,SumGer,SumCenterBuild,buildSumCenter
SYM game/src/render/sumlayout.ts:19 interface Rect
SYM game/src/render/sumlayout.ts:21 interface VehicleSlotView
SYM game/src/render/sumlayout.ts:23 interface HomeDoor
SYM game/src/render/sumlayout.ts:24 interface SumPlotView
SYM game/src/render/sumlayout.ts:25 interface SumGer
SYM game/src/render/sumlayout.ts:26 interface SumCenterBuild
SYM game/src/render/sumlayout.ts:49 fn rng
SYM game/src/render/sumlayout.ts:65 fn mat
SYM game/src/render/sumlayout.ts:71 class Batch
SYM game/src/render/sumlayout.ts:73 method Batch.add
SYM game/src/render/sumlayout.ts:86 method Batch.box
SYM game/src/render/sumlayout.ts:89 method Batch.cyl
SYM game/src/render/sumlayout.ts:92 method Batch.mesh
SYM game/src/render/sumlayout.ts:107 fn gableGeometry
SYM game/src/render/sumlayout.ts:123 fn nearestOnPolyline
SYM game/src/render/sumlayout.ts:136 fn rectsOverlap
SYM game/src/render/sumlayout.ts:139 fn rectNearPolyline
SYM game/src/render/sumlayout.ts:156 fn buildSumCenter
FILE game/src/render/terrain.ts 60.2KB 1366L exports: TerrainView
SYM game/src/render/terrain.ts:31 fn typeLookup
SYM game/src/render/terrain.ts:62 fn grassClumpGeometry
SYM game/src/render/terrain.ts:97 fn flowerGeometry
SYM game/src/render/terrain.ts:145 class TerrainView
SYM game/src/render/terrain.ts:208 method TerrainView.heightAt
SYM game/src/render/terrain.ts:213 method TerrainView.sync
SYM game/src/render/terrain.ts:227 method TerrainView.updateSeason
SYM game/src/render/terrain.ts:237 method TerrainView.build
SYM game/src/render/terrain.ts:261 method TerrainView.dispose
SYM game/src/render/terrain.ts:293 method TerrainView.clearSmoke
SYM game/src/render/terrain.ts:304 method TerrainView.clearFlowers
SYM game/src/render/terrain.ts:313 method TerrainView.clearMountains
SYM game/src/render/terrain.ts:322 method TerrainView.disposeGeometries
SYM game/src/render/terrain.ts:328 method TerrainView.setQuality
SYM game/src/render/terrain.ts:346 method TerrainView.updateVisualTime
SYM game/src/render/terrain.ts:375 method TerrainView.buildGround
SYM game/src/render/terrain.ts:472 method TerrainView.buildWater
SYM game/src/render/terrain.ts:554 method TerrainView.buildGrassTextures
SYM game/src/render/terrain.ts:601 method TerrainView.buildTufts
SYM game/src/render/terrain.ts:754 method TerrainView.buildFlowers
SYM game/src/render/terrain.ts:805 method TerrainView.smoothBiomass
SYM game/src/render/terrain.ts:836 method TerrainView.updateGrass
SYM game/src/render/terrain.ts:926 method TerrainView.updateGrassCenter
SYM game/src/render/terrain.ts:934 method TerrainView.buildDecor
SYM game/src/render/terrain.ts:1017 method TerrainView.buildMountains
SYM game/src/render/terrain.ts:1067 method TerrainView.buildOvoo
SYM game/src/render/terrain.ts:1112 method TerrainView.buildCampStructures
SYM game/src/render/terrain.ts:1122 method TerrainView.buildPostFence
SYM game/src/render/terrain.ts:1150 method TerrainView.buildShed
SYM game/src/render/terrain.ts:1220 method TerrainView.buildPostAndFire
SYM game/src/render/terrain.ts:1244 method TerrainView.syncHay
SYM game/src/render/terrain.ts:1270 method TerrainView.buildDens
SYM game/src/render/terrain.ts:1307 method TerrainView.buildHome
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
FILE game/src/render/ui/panels.ts 66.8KB 1071L exports: UiHooks,Panels
SYM game/src/render/ui/panels.ts:89 interface UiHooks
SYM game/src/render/ui/panels.ts:96 class Panels
SYM game/src/render/ui/panels.ts:137 method Panels.isOpen
SYM game/src/render/ui/panels.ts:141 method Panels.open
SYM game/src/render/ui/panels.ts:164 method Panels.close
SYM game/src/render/ui/panels.ts:179 method Panels.showReport
SYM game/src/render/ui/panels.ts:191 method Panels.refresh
SYM game/src/render/ui/panels.ts:197 method Panels.showArrive
SYM game/src/render/ui/panels.ts:203 method Panels.render
SYM game/src/render/ui/panels.ts:225 method Panels.milestonesHtml
SYM game/src/render/ui/panels.ts:236 method Panels.spark
SYM game/src/render/ui/panels.ts:244 method Panels.ceremonyHtml
SYM game/src/render/ui/panels.ts:255 method Panels.storageHtml
SYM game/src/render/ui/panels.ts:309 method Panels.buyItems
SYM game/src/render/ui/panels.ts:335 method Panels.vehicleButtons
SYM game/src/render/ui/panels.ts:343 method Panels.cargoList
SYM game/src/render/ui/panels.ts:357 method Panels.cargoHtml
SYM game/src/render/ui/panels.ts:413 method Panels.selectedAnimals
SYM game/src/render/ui/panels.ts:421 method Panels.shopHtml
SYM game/src/render/ui/panels.ts:479 method Panels.townCommand
SYM game/src/render/ui/panels.ts:509 method Panels.townHtml
SYM game/src/render/ui/panels.ts:571 method Panels.lotHtml
SYM game/src/render/ui/panels.ts:599 method Panels.arriveHtml
SYM game/src/render/ui/panels.ts:625 method Panels.reportHtml
SYM game/src/render/ui/panels.ts:643 method Panels.wolfKillsHtml
SYM game/src/render/ui/panels.ts:650 method Panels.dogsHtml
SYM game/src/render/ui/panels.ts:673 method Panels.campsHtml
SYM game/src/render/ui/panels.ts:704 method Panels.cheatHtml
SYM game/src/render/ui/panels.ts:713 method Panels.teahouseHtml
SYM game/src/render/ui/panels.ts:731 method Panels.helpersHtml
SYM game/src/render/ui/panels.ts:778 method Panels.otorHtml
SYM game/src/render/ui/panels.ts:798 method Panels.payHtml
SYM game/src/render/ui/panels.ts:814 method Panels.act
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
FILE game/src/render/worldmap.ts 22.5KB 489L exports: paperPixels,WorldMapView
SYM game/src/render/worldmap.ts:23 fn textSprite
SYM game/src/render/worldmap.ts:49 fn paperPixels
SYM game/src/render/worldmap.ts:89 class WorldMapView
SYM game/src/render/worldmap.ts:239 method WorldMapView.inkLines
SYM game/src/render/worldmap.ts:291 method WorldMapView.heightAt
SYM game/src/render/worldmap.ts:300 method WorldMapView.addCamp
SYM game/src/render/worldmap.ts:312 method WorldMapView.addSum
SYM game/src/render/worldmap.ts:326 method WorldMapView.addPath
SYM game/src/render/worldmap.ts:338 method WorldMapView.resize
SYM game/src/render/worldmap.ts:344 method WorldMapView.partyModel
SYM game/src/render/worldmap.ts:369 method WorldMapView.snapshot
SYM game/src/render/worldmap.ts:379 method WorldMapView.applySeason
SYM game/src/render/worldmap.ts:401 method WorldMapView.update
SYM game/src/render/worldmap.ts:452 method WorldMapView.replaceLabel
SYM game/src/render/worldmap.ts:484 fn segDist
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
FILE game/src/sim/commands.ts 20.0KB 410L exports: Command,CommandResult,nearHome,applyCommand
SYM game/src/sim/commands.ts:29 type Command
SYM game/src/sim/commands.ts:84 interface CommandResult
SYM game/src/sim/commands.ts:90 fn nearHome
SYM game/src/sim/commands.ts:102 fn ok
SYM game/src/sim/commands.ts:103 fn fail
SYM game/src/sim/commands.ts:105 fn applyCommand
FILE game/src/sim/config.ts 22.1KB 432L exports: Species,Sex,Season,SeasonsConfig,SPECIES,TimeConfig,SpeciesConfig,AnimalsConfig,PastureTypeConfig,GrazingConfig,HerdConfig,PastureConfig,WaterShape,TerrainConfig,+9
SYM game/src/sim/config.ts:35 type Species
SYM game/src/sim/config.ts:36 type Sex
SYM game/src/sim/config.ts:37 type Season
SYM game/src/sim/config.ts:40 interface SeasonsConfig
SYM game/src/sim/config.ts:58 const SPECIES
SYM game/src/sim/config.ts:60 interface TimeConfig
SYM game/src/sim/config.ts:74 interface SpeciesConfig
SYM game/src/sim/config.ts:89 interface AnimalsConfig
SYM game/src/sim/config.ts:108 interface PastureTypeConfig
SYM game/src/sim/config.ts:115 interface GrazingConfig
SYM game/src/sim/config.ts:138 interface HerdConfig
SYM game/src/sim/config.ts:157 interface PastureConfig
SYM game/src/sim/config.ts:179 type WaterShape
SYM game/src/sim/config.ts:184 interface TerrainConfig
SYM game/src/sim/config.ts:195 interface CampConfig
SYM game/src/sim/config.ts:205 interface HomeConfig
SYM game/src/sim/config.ts:217 interface WorldLocation
SYM game/src/sim/config.ts:222 interface WorldMapConfig
SYM game/src/sim/config.ts:242 interface StartAnimal
SYM game/src/sim/config.ts:250 interface GameConfig
SYM game/src/sim/config.ts:282 fn loadConfig
SYM game/src/sim/config.ts:316 fn validateConfig
SYM game/src/sim/config.ts:379 fn validateSumLayout
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
FILE game/src/sim/save.ts 13.9KB 218L exports: SAVE_FORMAT,SaveMeta,SaveFile,SaveError,saveMeta,serialize,deserialize,migrationChainComplete,validateState
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
FILE game/src/sim/sim.ts 12.4KB 262L exports: DayReport,SimEvent,Sim
SYM game/src/sim/sim.ts:31 interface DayReport
SYM game/src/sim/sim.ts:55 type SimEvent
SYM game/src/sim/sim.ts:57 class Sim
SYM game/src/sim/sim.ts:78 method Sim.on
SYM game/src/sim/sim.ts:85 method Sim.emit
SYM game/src/sim/sim.ts:89 method Sim.command
SYM game/src/sim/sim.ts:98 method Sim.emitTravel
SYM game/src/sim/sim.ts:103 method Sim.step
SYM game/src/sim/sim.ts:165 method Sim.refreshQuality
SYM game/src/sim/sim.ts:170 method Sim.runDays
SYM game/src/sim/sim.ts:175 method Sim.endDay
SYM game/src/sim/sim.ts:253 method Sim.spend
SYM game/src/sim/sim.ts:259 method Sim.random
FILE game/src/sim/state.ts 16.6KB 346L exports: SAVE_VERSION,ProductId,PRODUCTS,AnimalMode,Animal,GroundItem,Batch,ProcessorKind,ProcessorState,VehicleId,VEHICLES,BuyOrder,Place,InteriorState,+12
SYM game/src/sim/state.ts:18 const SAVE_VERSION
SYM game/src/sim/state.ts:20 type ProductId
SYM game/src/sim/state.ts:21 const PRODUCTS
SYM game/src/sim/state.ts:25 type AnimalMode
SYM game/src/sim/state.ts:27 interface Animal
SYM game/src/sim/state.ts:55 interface GroundItem
SYM game/src/sim/state.ts:64 interface Batch
SYM game/src/sim/state.ts:70 type ProcessorKind
SYM game/src/sim/state.ts:72 interface ProcessorState
SYM game/src/sim/state.ts:78 type VehicleId
SYM game/src/sim/state.ts:79 const VEHICLES
SYM game/src/sim/state.ts:81 type BuyOrder
SYM game/src/sim/state.ts:94 type Place
SYM game/src/sim/state.ts:100 interface InteriorState
SYM game/src/sim/state.ts:112 interface FleetVehicle
SYM game/src/sim/state.ts:124 interface MapState
SYM game/src/sim/state.ts:132 interface CampState
SYM game/src/sim/state.ts:140 interface DayStats
SYM game/src/sim/state.ts:153 interface PlayerState
SYM game/src/sim/state.ts:169 interface GameState
SYM game/src/sim/state.ts:213 fn emptyDayStats
SYM game/src/sim/state.ts:217 fn newAnimal
SYM game/src/sim/state.ts:250 fn createInitialState
SYM game/src/sim/state.ts:314 const MIGRATIONS
SYM game/src/sim/state.ts:334 const MIN_SAVE_VERSION
SYM game/src/sim/state.ts:337 fn migrateState
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
FILE game/src/sim/systems/camps.ts 4.4KB 98L exports: moveHours,startMove,moveStep
SYM game/src/sim/systems/camps.ts:18 fn moveHours
SYM game/src/sim/systems/camps.ts:29 fn startMove
SYM game/src/sim/systems/camps.ts:49 fn moveStep
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
FILE game/src/sim/systems/grazing.ts 9.9KB 254L exports: flockCenters,grazingStep,driveFlock
SYM game/src/sim/systems/grazing.ts:23 fn flockCenters
SYM game/src/sim/systems/grazing.ts:43 fn flockKey
SYM game/src/sim/systems/grazing.ts:48 fn decide
SYM game/src/sim/systems/grazing.ts:97 fn scoreAt
SYM game/src/sim/systems/grazing.ts:130 fn moveToward
SYM game/src/sim/systems/grazing.ts:145 fn grazingStep
SYM game/src/sim/systems/grazing.ts:223 fn eat
SYM game/src/sim/systems/grazing.ts:243 fn driveFlock
FILE game/src/sim/systems/helpers.ts 41.7KB 885L exports: HelperKind,HelperTask,HerdGroup,HelperTrip,Helper,CandidateMember,Candidate,OtorGroup,Dwelling,HelpersState,HelperEvent,newHelpersState,bedsTotal,bedsUsed,+21
SYM game/src/sim/systems/helpers.ts:34 type HelperKind
SYM game/src/sim/systems/helpers.ts:35 type HelperTask
SYM game/src/sim/systems/helpers.ts:36 type HerdGroup
SYM game/src/sim/systems/helpers.ts:38 interface HelperTrip
SYM game/src/sim/systems/helpers.ts:45 interface Helper
SYM game/src/sim/systems/helpers.ts:69 interface CandidateMember
SYM game/src/sim/systems/helpers.ts:75 interface Candidate
SYM game/src/sim/systems/helpers.ts:82 interface OtorGroup
SYM game/src/sim/systems/helpers.ts:94 interface Dwelling
SYM game/src/sim/systems/helpers.ts:103 interface HelpersState
SYM game/src/sim/systems/helpers.ts:114 type HelperEvent
SYM game/src/sim/systems/helpers.ts:119 fn newHelpersState
SYM game/src/sim/systems/helpers.ts:126 fn freeSlot
SYM game/src/sim/systems/helpers.ts:134 fn bedsTotal
SYM game/src/sim/systems/helpers.ts:138 fn bedsUsed
SYM game/src/sim/systems/helpers.ts:143 fn addDwelling
SYM game/src/sim/systems/helpers.ts:149 fn spareTents
SYM game/src/sim/systems/helpers.ts:155 fn homeOf
SYM game/src/sim/systems/helpers.ts:165 fn refreshCandidates
SYM game/src/sim/systems/helpers.ts:202 fn nearTeahouse
SYM game/src/sim/systems/helpers.ts:208 fn hire
SYM game/src/sim/systems/helpers.ts:256 fn familyOf
SYM game/src/sim/systems/helpers.ts:261 fn leave
SYM game/src/sim/systems/helpers.ts:271 fn fire
SYM game/src/sim/systems/helpers.ts:282 fn setTask
SYM game/src/sim/systems/helpers.ts:296 fn payWithAnimal
SYM game/src/sim/systems/helpers.ts:308 fn playerOwned
SYM game/src/sim/systems/helpers.ts:313 fn payWages
SYM game/src/sim/systems/helpers.ts:338 fn moveToward
SYM game/src/sim/systems/helpers.ts:352 fn groupOf
SYM game/src/sim/systems/helpers.ts:358 fn flock
SYM game/src/sim/systems/helpers.ts:368 fn driveAnimal
SYM game/src/sim/systems/helpers.ts:376 fn bestPasture
SYM game/src/sim/systems/helpers.ts:399 fn ensureHorseCamp
SYM game/src/sim/systems/helpers.ts:426 fn helperGuardRadius
SYM game/src/sim/systems/helpers.ts:431 fn areaScore
SYM game/src/sim/systems/helpers.ts:438 fn herderPhase
SYM game/src/sim/systems/helpers.ts:447 fn herderStep
SYM game/src/sim/systems/helpers.ts:544 fn eveningSpot
SYM game/src/sim/systems/helpers.ts:551 fn childStep
SYM game/src/sim/systems/helpers.ts:603 fn driverStep
SYM game/src/sim/systems/helpers.ts:674 fn helpersStep
SYM game/src/sim/systems/helpers.ts:695 fn guardingHelpers
SYM game/src/sim/systems/helpers.ts:702 fn sendOtor
SYM game/src/sim/systems/helpers.ts:719 fn recallOtor
SYM game/src/sim/systems/helpers.ts:742 fn setOtorCollector
SYM game/src/sim/systems/helpers.ts:765 fn takeFromOtor
SYM game/src/sim/systems/helpers.ts:796 fn dailyOtor
SYM game/src/sim/systems/helpers.ts:878 fn relocateHelpers
FILE game/src/sim/systems/herder.ts 4.8KB 127L exports: ridingHorse,herderStep,shout,toggleUurga,toggleMount
SYM game/src/sim/systems/herder.ts:14 fn ridingHorse
SYM game/src/sim/systems/herder.ts:19 fn herderStep
SYM game/src/sim/systems/herder.ts:69 fn shout
SYM game/src/sim/systems/herder.ts:103 fn toggleUurga
SYM game/src/sim/systems/herder.ts:109 fn toggleMount
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
FILE game/src/sim/systems/interior.ts 19.1KB 358L exports: InteriorSpot,RoomSpec,InteriorsConfig,InteriorService,EnterDoor,sumEnterDoors,campEnterDoors,enterDoors,nearEnterDoor,roomSpec,roomGerSize,currentRoom,clampToRoom,enterBuilding,+7
SYM game/src/sim/systems/interior.ts:19 interface InteriorSpot
SYM game/src/sim/systems/interior.ts:20 interface RoomSpec
SYM game/src/sim/systems/interior.ts:56 interface InteriorsConfig
SYM game/src/sim/systems/interior.ts:75 type InteriorService
SYM game/src/sim/systems/interior.ts:77 interface EnterDoor
SYM game/src/sim/systems/interior.ts:94 fn serviceOf
SYM game/src/sim/systems/interior.ts:102 fn sumEnterDoors
SYM game/src/sim/systems/interior.ts:125 fn campEnterDoors
SYM game/src/sim/systems/interior.ts:144 fn enterDoors
SYM game/src/sim/systems/interior.ts:154 fn nearEnterDoor
SYM game/src/sim/systems/interior.ts:173 fn roomSpec
SYM game/src/sim/systems/interior.ts:196 fn roomGerSize
SYM game/src/sim/systems/interior.ts:201 fn currentRoom
SYM game/src/sim/systems/interior.ts:207 fn clampToRoom
SYM game/src/sim/systems/interior.ts:242 fn enterBuilding
SYM game/src/sim/systems/interior.ts:260 fn atExit
SYM game/src/sim/systems/interior.ts:266 fn exitBuilding
SYM game/src/sim/systems/interior.ts:281 fn moveInterior
SYM game/src/sim/systems/interior.ts:292 fn atCounter
SYM game/src/sim/systems/interior.ts:298 fn interiorService
SYM game/src/sim/systems/interior.ts:305 fn ensureInteriorValid
SYM game/src/sim/systems/interior.ts:312 fn validateInteriors
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
FILE game/src/sim/systems/storage.ts 3.0KB 75L exports: capacity,used,freeSpace,count,add,take,dailyStorageAging
SYM game/src/sim/systems/storage.ts:8 fn capacity
SYM game/src/sim/systems/storage.ts:13 fn used
SYM game/src/sim/systems/storage.ts:17 fn freeSpace
SYM game/src/sim/systems/storage.ts:21 fn count
SYM game/src/sim/systems/storage.ts:26 fn add
SYM game/src/sim/systems/storage.ts:36 fn take
SYM game/src/sim/systems/storage.ts:53 fn dailyStorageAging
FILE game/src/sim/systems/sumtown.ts 12.4KB 270L exports: SumXZ,SumRoofSpec,SumYardSpec,SumBuildingSpec,SumCompoundSpec,SumFieldSpec,SumSpecialPlotSpec,SumZoneSpec,SumRoadSpec,SumPropSpec,SumLayout,Facing,TRADE_ROLES,TradeRole,+17
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
SYM game/src/sim/systems/sumtown.ts:196 fn canSellProducts
SYM game/src/sim/systems/sumtown.ts:199 fn canSellAnimals
SYM game/src/sim/systems/sumtown.ts:203 fn pointInPoly
SYM game/src/sim/systems/sumtown.ts:211 fn distSeg
SYM game/src/sim/systems/sumtown.ts:219 fn sumHeight
SYM game/src/sim/systems/sumtown.ts:229 fn nearestOnPolyline
SYM game/src/sim/systems/sumtown.ts:247 fn faceTowardRoad
SYM game/src/sim/systems/sumtown.ts:262 fn plotHouse
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
FILE game/src/sim/systems/travel.ts 25.1KB 573L exports: TravelEvent,fleetOf,initFleetVehicle,addVehicle,syncAway,cargoUnits,hayInOrders,hayRoom,cargoSlots,nearestVehicle,enterVehicle,exitVehicle,boardBest,takeFromStorage,+20
SYM game/src/sim/systems/travel.ts:23 type TravelEvent
SYM game/src/sim/systems/travel.ts:28 fn fleetOf
SYM game/src/sim/systems/travel.ts:33 fn initFleetVehicle
SYM game/src/sim/systems/travel.ts:44 fn addVehicle
SYM game/src/sim/systems/travel.ts:50 fn syncAway
SYM game/src/sim/systems/travel.ts:55 fn cargoUnits
SYM game/src/sim/systems/travel.ts:60 fn hayInOrders
SYM game/src/sim/systems/travel.ts:65 fn hayRoom
SYM game/src/sim/systems/travel.ts:71 fn cargoSlots
SYM game/src/sim/systems/travel.ts:76 fn nearestVehicle
SYM game/src/sim/systems/travel.ts:90 fn enterVehicle
SYM game/src/sim/systems/travel.ts:104 fn exitVehicle
SYM game/src/sim/systems/travel.ts:122 fn boardBest
SYM game/src/sim/systems/travel.ts:142 fn takeFromStorage
SYM game/src/sim/systems/travel.ts:161 fn droveAnimals
SYM game/src/sim/systems/travel.ts:172 fn canTravel
SYM game/src/sim/systems/travel.ts:177 fn originKm
SYM game/src/sim/systems/travel.ts:183 fn sumId
SYM game/src/sim/systems/travel.ts:188 fn driveVehicle
SYM game/src/sim/systems/travel.ts:206 fn leaveToMap
SYM game/src/sim/systems/travel.ts:221 fn mapGo
SYM game/src/sim/systems/travel.ts:234 fn mapSpeedKmPerMin
SYM game/src/sim/systems/travel.ts:244 fn droveSlows
SYM game/src/sim/systems/travel.ts:250 fn partySpeedKmPerMin
SYM game/src/sim/systems/travel.ts:256 fn mapStep
SYM game/src/sim/systems/travel.ts:275 fn spend
SYM game/src/sim/systems/travel.ts:281 fn arrive
SYM game/src/sim/systems/travel.ts:347 fn migrateHere
SYM game/src/sim/systems/travel.ts:358 fn atLoadingSpot
SYM game/src/sim/systems/travel.ts:364 fn loadCargo
SYM game/src/sim/systems/travel.ts:392 fn unloadCargo
SYM game/src/sim/systems/travel.ts:417 interface TradePlan
SYM game/src/sim/systems/travel.ts:424 fn sellableAtShop
SYM game/src/sim/systems/travel.ts:433 fn sellableAnimals
SYM game/src/sim/systems/travel.ts:439 fn animalRoom
SYM game/src/sim/systems/travel.ts:451 fn trade
SYM game/src/sim/systems/travel.ts:539 fn buyLotVehicle
FILE game/src/sim/systems/trip.ts 4.4KB 111L exports: VehicleSpec,vehicleCfg,bestTruck,parkingSpot,productPrice,orderPrice,animalSlots,deliver
SYM game/src/sim/systems/trip.ts:15 type VehicleSpec
SYM game/src/sim/systems/trip.ts:17 fn vehicleCfg
SYM game/src/sim/systems/trip.ts:22 fn bestTruck
SYM game/src/sim/systems/trip.ts:32 fn parkingSpot
SYM game/src/sim/systems/trip.ts:36 fn productPrice
SYM game/src/sim/systems/trip.ts:40 fn orderPrice
SYM game/src/sim/systems/trip.ts:66 fn animalSlots
SYM game/src/sim/systems/trip.ts:72 fn deliver
FILE game/src/sim/systems/wolves.ts 31.6KB 657L exports: Den,WolfMode,Wolf,isPup,hungerStage,WolfState,Zone,WolfEvent,spawnWolves,protectionZones,isProtected,spookAnimals,scareWolf,wolvesStep,+6
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
SYM game/src/sim/systems/wolves.ts:474 fn nextDen
SYM game/src/sim/systems/wolves.ts:483 fn nearestPrey
SYM game/src/sim/systems/wolves.ts:503 fn raidStep
SYM game/src/sim/systems/wolves.ts:542 fn nightRaid
SYM game/src/sim/systems/wolves.ts:571 fn wolvesDaily
SYM game/src/sim/systems/wolves.ts:625 fn killWolf
SYM game/src/sim/systems/wolves.ts:630 fn endRaid
SYM game/src/sim/systems/wolves.ts:642 fn scareWolves
SYM game/src/sim/systems/wolves.ts:655 fn huntingWolves
FILE game/src/sim/terrain.ts 3.2KB 83L exports: smoothstep,riverZ,waterDistance,baseHeightAt,heightAt,waterLevel
SYM game/src/sim/terrain.ts:7 fn clamp
SYM game/src/sim/terrain.ts:8 const smoothstep
SYM game/src/sim/terrain.ts:14 fn riverZ
SYM game/src/sim/terrain.ts:22 fn waterDistance
SYM game/src/sim/terrain.ts:28 fn baseHeightAt
SYM game/src/sim/terrain.ts:54 fn heightAt
SYM game/src/sim/terrain.ts:77 fn waterLevel
FILE tools/balance_sim/run.ts 27.0KB 460L
SYM tools/balance_sim/run.ts:31 fn nextGerOrder
SYM tools/balance_sim/run.ts:53 fn applyOverrides
SYM tools/balance_sim/run.ts:74 fn escort
SYM tools/balance_sim/run.ts:81 fn dogsGuard
SYM tools/balance_sim/run.ts:87 fn collectAll
SYM tools/balance_sim/run.ts:97 fn processAll
SYM tools/balance_sim/run.ts:104 fn surplusMales
SYM tools/balance_sim/run.ts:119 fn tripIfUseful
SYM tools/balance_sim/run.ts:141 fn bestSpot
SYM tools/balance_sim/run.ts:178 fn rotateCamp
SYM tools/balance_sim/run.ts:194 fn buyPlan
SYM tools/balance_sim/run.ts:248 fn mediumStrategy
SYM tools/balance_sim/run.ts:341 fn run
SYM tools/balance_sim/run.ts:390 fn killsTxt
SYM tools/balance_sim/run.ts:397 fn median
SYM tools/balance_sim/run.ts:402 fn fmt
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
FILE game/tests/animalLook.test.ts 9.6KB 171L
FILE game/tests/animals.test.ts 2.3KB 39L
FILE game/tests/breeding.test.ts 1.4KB 33L
FILE game/tests/buildings.test.ts 11.8KB 167L
FILE game/tests/camclip.test.ts 3.9KB 68L
FILE game/tests/characters.test.ts 26.1KB 438L
FILE game/tests/clock.test.ts 2.7KB 52L
FILE game/tests/config.test.ts 1.4KB 29L
FILE game/tests/difficulty.test.ts 4.9KB 99L
FILE game/tests/docs.test.ts 4.0KB 76L
FILE game/tests/dogs.test.ts 7.5KB 190L
FILE game/tests/ger.test.ts 9.5KB 181L
FILE game/tests/gerSize.test.ts 8.6KB 155L
FILE game/tests/grazing.test.ts 2.3KB 46L
FILE game/tests/helpers.ts 0.8KB 20L
FILE game/tests/herder.test.ts 6.3KB 139L
FILE game/tests/herds.test.ts 5.1KB 112L
FILE game/tests/i18n.test.ts 9.1KB 172L
FILE game/tests/interior.test.ts 10.5KB 203L
FILE game/tests/milestones.test.ts 6.7KB 125L
FILE game/tests/night.test.ts 6.5KB 127L
FILE game/tests/npcs.test.ts 8.1KB 137L
FILE game/tests/pasture.test.ts 3.8KB 72L
FILE game/tests/perf.perf.test.ts 3.2KB 57L
FILE game/tests/persist.test.ts 10.2KB 212L
FILE game/tests/playthrough.test.ts 6.3KB 133L
FILE game/tests/products.test.ts 3.0KB 56L
FILE game/tests/rng.test.ts 0.8KB 26L
FILE game/tests/save.test.ts 11.7KB 233L
FILE game/tests/seasons.test.ts 7.2KB 140L
FILE game/tests/sim.test.ts 1.4KB 30L
FILE game/tests/staff.test.ts 13.3KB 248L
FILE game/tests/style.test.ts 8.9KB 165L
FILE game/tests/sumtown.test.ts 4.5KB 90L
FILE game/tests/town.test.ts 6.1KB 127L
FILE game/tests/transfer.test.ts 14.2KB 255L
FILE game/tests/trip.test.ts 9.2KB 173L
FILE game/tests/wolves.test.ts 14.7KB 337L
FILE docs/CONTEXT.md 27.8KB 120L
DOC docs/CONTEXT.md:12-18 ## 1. Тоглоом юу вэ
DOC docs/CONTEXT.md:19-29 ## 2. Стек ба командууд
DOC docs/CONTEXT.md:30-94 ## 3. Файлын зураглал (`game/src/`)
DOC docs/CONTEXT.md:95-97 ## 4. `data/*.json` → аль файл хэрэглэдэг
DOC docs/CONTEXT.md:98-106 ## 5. Архитектурын дүрэм ([[architecture]])
DOC docs/CONTEXT.md:107-110 ## 6. Баримтын давуу эрх (зөрчилдвөл дээд нь хүчинтэй)
DOC docs/CONTEXT.md:111-113 ## 7. Нээлттэй асуултууд
DOC docs/CONTEXT.md:114-120 ## 8. Баримтын хэсгийн индекс (мөрийн муж)
FILE docs/INDEX.md 13.9KB 135L
DOC docs/INDEX.md:16-30 ## 1. Унших дараалал ба давуу эрх
DOC docs/INDEX.md:31-106 ## 2. Баримтууд
DOC docs/INDEX.md:107-110 ## 3. Гол тоо
DOC docs/INDEX.md:111-129 ## 4. Нэр томьёо
DOC docs/INDEX.md:130-135 ## 5. Баримт засах дүрэм
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
FILE docs/mvp-spec.md 51.4KB 461L
DOC docs/mvp-spec.md:17-22 ## 0. Хэрэглэгчийн шийдвэрийн түүх
DOC docs/mvp-spec.md:23-50 ## 1. Хүрээ
DOC docs/mvp-spec.md:51-69 ## 2. Цаг (M4.5, M5.5)
DOC docs/mvp-spec.md:70-103 ## 3. Эхлэл
DOC docs/mvp-spec.md:104-152 ## 4. Бүтээгдэхүүн: мал үлдээнэ, малчин цуглуулна (Farm Frenzy маяг)
DOC docs/mvp-spec.md:153-209 ## 5. Үнэ, тээвэр ба сумын төв
DOC docs/mvp-spec.md:210-252 ## 6. Туслах малчид (M5 — [[helpers-m5]])
DOC docs/mvp-spec.md:253-294 ## 7. Бэлчээр, бууц сэлгэх, доройтол
DOC docs/mvp-spec.md:295-332 ## 8. Чоно (M4, M4.5, B6)
DOC docs/mvp-spec.md:333-348 ## 9. Төллөлт ба нас (M5.5)
DOC docs/mvp-spec.md:349-423 ## 10. Тоглоомын зорилго ба замын тэмдэгтүүд
DOC docs/mvp-spec.md:424-446 ## 11. Прототипоос хасагдах, өөрчлөгдөх зүйл
DOC docs/mvp-spec.md:447-452 ## 12. Хөгжүүлэлтийн явц
DOC docs/mvp-spec.md:453-457 ## 13. Нээлттэй шийдвэр байхгүй
DOC docs/mvp-spec.md:458-461 ## Эх сурвалж
FILE docs/night-transport.md 9.4KB 106L
DOC docs/night-transport.md:18-32 ## 1. Цаг ба шөнө
DOC docs/night-transport.md:33-44 ## 2. Хотлох (хэрэглэгчийн дүрэм)
DOC docs/night-transport.md:45-68 ## 3. Сүү, ноос хоносон газраа (хэрэглэгчийн дүрэм)
DOC docs/night-transport.md:69-87 ## 4. Шөнийн чоно (хэрэглэгчийн дүрэм)
DOC docs/night-transport.md:88-103 ## 5. Тээвэр
DOC docs/night-transport.md:104-106 ## 6. Хэрэглэгчийн шийдвэр 🙋
FILE docs/plan/M6.md 18.0KB 66L
DOC docs/plan/M6.md:15-17 ## Зорилго
DOC docs/plan/M6.md:18-34 ## MVP «дууссан» шалгуур (D1–D10 — M6 ба M7-ийн нийт)
DOC docs/plan/M6.md:35-37 ## Одоогийн байдал
DOC docs/plan/M6.md:38-56 ## Блокууд
DOC docs/plan/M6.md:57-64 ## Эрсдэл
DOC docs/plan/M6.md:65-66 ## Хуваарь
FILE docs/plan/M7.md 7.6KB 31L
DOC docs/plan/M7.md:12-22 ## Блокууд
DOC docs/plan/M7.md:23-27 ## Асуулга (10 асуулт)
DOC docs/plan/M7.md:28-31 ## Эрсдэл
FILE docs/plan/V.md 67.0KB 224L
DOC docs/plan/V.md:13-15 ## Зорилго
DOC docs/plan/V.md:16-23 ## Гарах шалгуур ([[visuals-plan]] §V3–V5, §7.1)
DOC docs/plan/V.md:24-206 ## Блокууд ба чеклист (2026-11-15)
DOC docs/plan/V.md:207-224 ## Зогссон цэг
FILE docs/plan/playtest.md 16.7KB 104L
DOC docs/plan/playtest.md:13-18 ## A. FPS ба төхөөрөмж
DOC docs/plan/playtest.md:19-39 ## B. Харааны ба соёлын баталгаажуулалт ([[V]])
DOC docs/plan/playtest.md:40-95 ## C. Мэдрэмж, үе шат бүрээр
DOC docs/plan/playtest.md:96-99 ## V4.6 хонь, ямаа (🧑 мэдрэмж)
DOC docs/plan/playtest.md:100-104 ## V4.6 S2 үхэр, адуу, нохой, чоно (🧑 мэдрэмж)
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
FILE docs/visuals-plan.md 28.4KB 277L
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
