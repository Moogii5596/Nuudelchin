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
FILE game/src/i18n/i18n.ts 0.5KB 20L exports: Lang,setLang,getLang,t
SYM game/src/i18n/i18n.ts:4 type Lang
SYM game/src/i18n/i18n.ts:8 fn setLang
SYM game/src/i18n/i18n.ts:12 fn getLang
SYM game/src/i18n/i18n.ts:17 fn t
FILE game/src/i18n/npcStrings.ts 0.8KB 16L exports: npcText,NPC_LINES,npcLine
SYM game/src/i18n/npcStrings.ts:11 fn npcText
SYM game/src/i18n/npcStrings.ts:14 const NPC_LINES
SYM game/src/i18n/npcStrings.ts:16 const npcLine
FILE game/src/input/controller.ts 14.6KB 357L exports: ActionKind,ControllerHooks,PlayerController
SYM game/src/input/controller.ts:15 type ActionKind
SYM game/src/input/controller.ts:17 interface ControllerHooks
SYM game/src/input/controller.ts:29 fn angDiff
SYM game/src/input/controller.ts:36 class PlayerController
SYM game/src/input/controller.ts:61 method PlayerController.press
SYM game/src/input/controller.ts:135 method PlayerController.hold
SYM game/src/input/controller.ts:143 method PlayerController.shout
SYM game/src/input/controller.ts:149 method PlayerController.scare
SYM game/src/input/controller.ts:165 method PlayerController.interact
SYM game/src/input/controller.ts:188 method PlayerController.useAction
SYM game/src/input/controller.ts:213 method PlayerController.isDown
SYM game/src/input/controller.ts:218 method PlayerController.moveTo
SYM game/src/input/controller.ts:223 method PlayerController.update
SYM game/src/input/controller.ts:320 method PlayerController.drive
FILE game/src/input/touch.ts 14.4KB 299L exports: TouchHooks,TouchUI
SYM game/src/input/touch.ts:15 interface TouchHooks
SYM game/src/input/touch.ts:32 class TouchUI
SYM game/src/input/touch.ts:223 method TouchUI.enterLandscape
SYM game/src/input/touch.ts:227 method TouchUI.start
SYM game/src/input/touch.ts:233 method TouchUI.refreshInstall
SYM game/src/input/touch.ts:240 method TouchUI.install
SYM game/src/input/touch.ts:249 method TouchUI.bind
SYM game/src/input/touch.ts:267 method TouchUI.fullscreen
SYM game/src/input/touch.ts:280 method TouchUI.paused
SYM game/src/input/touch.ts:284 method TouchUI.portrait
SYM game/src/input/touch.ts:289 method TouchUI.update
FILE game/src/main.ts 34.5KB 537L
SYM game/src/main.ts:41 fn toast
SYM game/src/main.ts:64 fn start
SYM game/src/main.ts:510 fn boot
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
FILE game/src/render/animal/config.ts 12.5KB 157L exports: LookSpecies,V3,Pair,BodyLook,SkirtLook,DLook,HornLook,HeadLook,MotionLook,VariantLook,SpeciesLook,AnimalLook,parseAnimalLook,animalLook
SYM game/src/render/animal/config.ts:7 type LookSpecies
SYM game/src/render/animal/config.ts:8 type V3
SYM game/src/render/animal/config.ts:9 type Pair
SYM game/src/render/animal/config.ts:11 interface BodyLook
SYM game/src/render/animal/config.ts:12 interface SkirtLook
SYM game/src/render/animal/config.ts:13 interface DLook
SYM game/src/render/animal/config.ts:18 interface HornLook
SYM game/src/render/animal/config.ts:19 interface HeadLook
SYM game/src/render/animal/config.ts:25 interface MotionLook
SYM game/src/render/animal/config.ts:29 interface VariantLook
SYM game/src/render/animal/config.ts:30 interface SpeciesLook
SYM game/src/render/animal/config.ts:36 interface AnimalLook
SYM game/src/render/animal/config.ts:50 fn fail
SYM game/src/render/animal/config.ts:51 fn isObj
SYM game/src/render/animal/config.ts:52 fn obj
SYM game/src/render/animal/config.ts:53 fn num
SYM game/src/render/animal/config.ts:55 fn hex
SYM game/src/render/animal/config.ts:56 fn tup
SYM game/src/render/animal/config.ts:57 fn pair
SYM game/src/render/animal/config.ts:58 fn v3
SYM game/src/render/animal/config.ts:60 fn parseD
SYM game/src/render/animal/config.ts:79 fn parseHead
SYM game/src/render/animal/config.ts:102 fn parseMotion
SYM game/src/render/animal/config.ts:113 fn parseSpecies
SYM game/src/render/animal/config.ts:131 fn parseAnimalLook
SYM game/src/render/animal/config.ts:157 const animalLook
FILE game/src/render/animal/geo.ts 7.5KB 123L exports: smooth01,triOf,ellipsoid,bodyGeo,neckGeo,tailGeo,skirtGeo,patchK,markGeo,prep
SYM game/src/render/animal/geo.ts:10 const smooth01
SYM game/src/render/animal/geo.ts:14 fn pos
SYM game/src/render/animal/geo.ts:15 const triOf
SYM game/src/render/animal/geo.ts:18 fn ellipsoid
SYM game/src/render/animal/geo.ts:31 fn bodyGeo
SYM game/src/render/animal/geo.ts:54 fn neckGeo
SYM game/src/render/animal/geo.ts:63 fn tailGeo
SYM game/src/render/animal/geo.ts:73 fn skirtGeo
SYM game/src/render/animal/geo.ts:103 const patchK
SYM game/src/render/animal/geo.ts:111 fn markGeo
SYM game/src/render/animal/geo.ts:116 fn prep
FILE game/src/render/animal/goat.ts 0.2KB 4L exports: goatModel
SYM game/src/render/animal/goat.ts:4 const goatModel
FILE game/src/render/animal/head.ts 7.7KB 116L exports: HeadQ,Q_DETAIL,Q_LIGHT,headGeo
SYM game/src/render/animal/head.ts:12 interface HeadQ
SYM game/src/render/animal/head.ts:14 const Q_DETAIL
SYM game/src/render/animal/head.ts:15 const Q_LIGHT
SYM game/src/render/animal/head.ts:17 fn pos
SYM game/src/render/animal/head.ts:18 fn radAt
SYM game/src/render/animal/head.ts:24 fn headSkull
SYM game/src/render/animal/head.ts:39 fn surf
SYM game/src/render/animal/head.ts:44 fn hornGeo
SYM game/src/render/animal/head.ts:63 fn beardGeo
SYM game/src/render/animal/head.ts:75 fn headGeo
FILE game/src/render/animal/legs.ts 3.6KB 64L exports: legRm,legLens,legUpper,legLower,hockKnee
SYM game/src/render/animal/legs.ts:12 const legRm
SYM game/src/render/animal/legs.ts:13 fn legLens
SYM game/src/render/animal/legs.ts:18 fn lathe
SYM game/src/render/animal/legs.ts:25 fn hoofGeo
SYM game/src/render/animal/legs.ts:30 fn legUpper
SYM game/src/render/animal/legs.ts:39 fn legLower
SYM game/src/render/animal/legs.ts:53 fn merge2
SYM game/src/render/animal/legs.ts:61 fn hockKnee
FILE game/src/render/animal/lod.ts 9.6KB 175L exports: Level,Rec,Colors,PartDef,LMAT,buildParts,trisOf,RestPoses,AnimalSet
SYM game/src/render/animal/lod.ts:16 type Level
SYM game/src/render/animal/lod.ts:18 interface Rec
SYM game/src/render/animal/lod.ts:19 interface Colors
SYM game/src/render/animal/lod.ts:21 interface PartDef
SYM game/src/render/animal/lod.ts:34 fn vec
SYM game/src/render/animal/lod.ts:35 const LMAT
SYM game/src/render/animal/lod.ts:50 fn buildParts
SYM game/src/render/animal/lod.ts:87 const trisOf
SYM game/src/render/animal/lod.ts:91 class RestPoses
SYM game/src/render/animal/lod.ts:95 method RestPoses.get
SYM game/src/render/animal/lod.ts:108 class AnimalSet
SYM game/src/render/animal/lod.ts:137 method AnimalSet.put
SYM game/src/render/animal/lod.ts:154 method AnimalSet.push
SYM game/src/render/animal/lod.ts:159 method AnimalSet.pushRest
SYM game/src/render/animal/lod.ts:162 method AnimalSet.end
FILE game/src/render/animal/model.ts 2.4KB 44L exports: AnimalModel,createModel,ageIdxOf
SYM game/src/render/animal/model.ts:10 interface AnimalModel
SYM game/src/render/animal/model.ts:21 fn mixHex
SYM game/src/render/animal/model.ts:22 fn hash
SYM game/src/render/animal/model.ts:24 fn createModel
SYM game/src/render/animal/model.ts:44 const ageIdxOf
FILE game/src/render/animal/pose.ts 9.0KB 132L exports: Action,LegNode,PoseState,Rig,PoseInput,newState,makeRig,poseAnimal,settle
SYM game/src/render/animal/pose.ts:12 type Action
SYM game/src/render/animal/pose.ts:14 interface LegNode
SYM game/src/render/animal/pose.ts:16 interface PoseState
SYM game/src/render/animal/pose.ts:22 interface Rig
SYM game/src/render/animal/pose.ts:27 interface PoseInput
SYM game/src/render/animal/pose.ts:41 fn rnd
SYM game/src/render/animal/pose.ts:42 const newState
SYM game/src/render/animal/pose.ts:44 fn group
SYM game/src/render/animal/pose.ts:46 fn makeRig
SYM game/src/render/animal/pose.ts:58 fn poseAnimal
SYM game/src/render/animal/pose.ts:127 fn settle
FILE game/src/render/animal/sheep.ts 0.2KB 4L exports: sheepModel
SYM game/src/render/animal/sheep.ts:4 const sheepModel
FILE game/src/render/animals.ts 15.0KB 349L exports: AnimalsView
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
SYM game/src/render/animals.ts:346 method AnimalsView.reset
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
FILE game/src/render/character/animate.ts 6.6KB 139L exports: CharacterPose,animateCharacter
SYM game/src/render/character/animate.ts:11 interface CharacterPose
SYM game/src/render/character/animate.ts:24 fn sstep
SYM game/src/render/character/animate.ts:30 fn animateCharacter
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
FILE game/src/render/characters.ts 18.4KB 411L exports: Rig,makeHorse,makeDog,poseDogLying,swingLegs,CharactersView
SYM game/src/render/characters.ts:19 interface Rig
SYM game/src/render/characters.ts:27 fn makeHorse
SYM game/src/render/characters.ts:43 fn makeWolf
SYM game/src/render/characters.ts:76 fn makeDog
SYM game/src/render/characters.ts:104 fn poseDogLying
SYM game/src/render/characters.ts:117 fn swingLegs
SYM game/src/render/characters.ts:128 fn makeBubble
SYM game/src/render/characters.ts:149 class CharactersView
SYM game/src/render/characters.ts:182 method CharactersView.say
SYM game/src/render/characters.ts:189 method CharactersView.react
SYM game/src/render/characters.ts:194 method CharactersView.emotion
SYM game/src/render/characters.ts:212 method CharactersView.seatHerder
SYM game/src/render/characters.ts:225 method CharactersView.setSeason
SYM game/src/render/characters.ts:231 method CharactersView.herderObject
SYM game/src/render/characters.ts:235 method CharactersView.update
SYM game/src/render/characters.ts:323 method CharactersView.updateDogs
SYM game/src/render/characters.ts:373 method CharactersView.updateWolves
FILE game/src/render/ger/atlas.ts 16.0KB 177L exports: AtlasMaps,doorAtlas,IN_RECT,interiorAtlas
SYM game/src/render/ger/atlas.ts:5 interface AtlasMaps
SYM game/src/render/ger/atlas.ts:7 fn hasDom
SYM game/src/render/ger/atlas.ts:8 fn doorAtlas
SYM game/src/render/ger/atlas.ts:110 const IN_RECT
SYM game/src/render/ger/atlas.ts:111 fn interiorAtlas
FILE game/src/render/ger/config.ts 9.5KB 125L exports: GerSize,DoorVariant,GerShape,GerWinter,GerPalette,TentPalette,GerInteriorColors,GerInterior,GerAtlas,GerConfig,TentKind,TentConfig,GerData,gerConfigErrors,+4
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
SYM game/src/render/ger/config.ts:42 interface TentKind
SYM game/src/render/ger/config.ts:43 interface TentConfig
SYM game/src/render/ger/config.ts:48 interface GerData
SYM game/src/render/ger/config.ts:51 fn isObj
SYM game/src/render/ger/config.ts:54 fn check
SYM game/src/render/ger/config.ts:70 fn gerConfigErrors
SYM game/src/render/ger/config.ts:110 fn validateGerData
SYM game/src/render/ger/config.ts:117 const GER
SYM game/src/render/ger/config.ts:118 const TENT
SYM game/src/render/ger/config.ts:121 fn gerSize
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
FILE game/src/render/interior.ts 11.2KB 234L exports: InteriorView
SYM game/src/render/interior.ts:19 class InteriorView
SYM game/src/render/interior.ts:39 method InteriorView.active
SYM game/src/render/interior.ts:44 method InteriorView.show
SYM game/src/render/interior.ts:58 method InteriorView.hide
SYM game/src/render/interior.ts:87 method InteriorView.releaseNpcs
SYM game/src/render/interior.ts:92 method InteriorView.update
SYM game/src/render/interior.ts:107 method InteriorView.buildGer
SYM game/src/render/interior.ts:136 method InteriorView.build
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
FILE game/src/render/scene.ts 25.4KB 526L exports: GameView
SYM game/src/render/scene.ts:28 fn flakeTexture
SYM game/src/render/scene.ts:41 class GameView
SYM game/src/render/scene.ts:241 method GameView.applyQuality
SYM game/src/render/scene.ts:271 method GameView.snapshot
SYM game/src/render/scene.ts:285 method GameView.toggleHeatmap
SYM game/src/render/scene.ts:291 method GameView.frame
SYM game/src/render/scene.ts:364 method GameView.hideHerderIfCameraInside
SYM game/src/render/scene.ts:373 method GameView.campSolids
SYM game/src/render/scene.ts:401 method GameView.frameInterior
SYM game/src/render/scene.ts:427 method GameView.leaveInterior
SYM game/src/render/scene.ts:443 method GameView.applyDaylight
SYM game/src/render/scene.ts:503 method GameView.updateFlakes
SYM game/src/render/scene.ts:519 method GameView.drawCalls
SYM game/src/render/scene.ts:523 method GameView.triangleCount
FILE game/src/render/staff.ts 6.8KB 151L exports: makeDwelling,StaffView
SYM game/src/render/staff.ts:22 fn helperRole
SYM game/src/render/staff.ts:31 fn makeDwelling
SYM game/src/render/staff.ts:55 class StaffView
SYM game/src/render/staff.ts:62 method StaffView.setSeason
SYM game/src/render/staff.ts:68 method StaffView.update
SYM game/src/render/staff.ts:130 method StaffView.syncDwellings
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
FILE game/src/render/sumcenter.ts 20.2KB 369L exports: SumCenterView
SYM game/src/render/sumcenter.ts:40 fn residentMatrix
SYM game/src/render/sumcenter.ts:44 fn residents
SYM game/src/render/sumcenter.ts:69 class SumCenterView
SYM game/src/render/sumcenter.ts:223 method SumCenterView.syncTown
SYM game/src/render/sumcenter.ts:238 method SumCenterView.buildGers
SYM game/src/render/sumcenter.ts:276 method SumCenterView.syncTalk
SYM game/src/render/sumcenter.ts:317 method SumCenterView.syncCrowd
SYM game/src/render/sumcenter.ts:342 method SumCenterView.takeLive
SYM game/src/render/sumcenter.ts:359 method SumCenterView.releaseLive
SYM game/src/render/sumcenter.ts:366 method SumCenterView.syncLot
FILE game/src/render/sumlayout.ts 37.6KB 736L exports: Rect,VehicleSlotView,HomeDoor,SumPlotView,SumGer,SumCenterBuild,buildSumCenter
SYM game/src/render/sumlayout.ts:14 interface Rect
SYM game/src/render/sumlayout.ts:16 interface VehicleSlotView
SYM game/src/render/sumlayout.ts:18 interface HomeDoor
SYM game/src/render/sumlayout.ts:19 interface SumPlotView
SYM game/src/render/sumlayout.ts:20 interface SumGer
SYM game/src/render/sumlayout.ts:21 interface SumCenterBuild
SYM game/src/render/sumlayout.ts:40 fn rng
SYM game/src/render/sumlayout.ts:56 fn mat
SYM game/src/render/sumlayout.ts:62 class Batch
SYM game/src/render/sumlayout.ts:64 method Batch.add
SYM game/src/render/sumlayout.ts:77 method Batch.box
SYM game/src/render/sumlayout.ts:80 method Batch.cyl
SYM game/src/render/sumlayout.ts:83 method Batch.mesh
SYM game/src/render/sumlayout.ts:98 fn gableGeometry
SYM game/src/render/sumlayout.ts:114 fn nearestOnPolyline
SYM game/src/render/sumlayout.ts:127 fn rectsOverlap
SYM game/src/render/sumlayout.ts:130 fn rectNearPolyline
SYM game/src/render/sumlayout.ts:147 fn buildSumCenter
FILE game/src/render/terrain.ts 59.8KB 1360L exports: TerrainView
SYM game/src/render/terrain.ts:31 fn typeLookup
SYM game/src/render/terrain.ts:62 fn grassClumpGeometry
SYM game/src/render/terrain.ts:97 fn flowerGeometry
SYM game/src/render/terrain.ts:145 class TerrainView
SYM game/src/render/terrain.ts:206 method TerrainView.heightAt
SYM game/src/render/terrain.ts:211 method TerrainView.sync
SYM game/src/render/terrain.ts:222 method TerrainView.updateSeason
SYM game/src/render/terrain.ts:232 method TerrainView.build
SYM game/src/render/terrain.ts:255 method TerrainView.dispose
SYM game/src/render/terrain.ts:287 method TerrainView.clearSmoke
SYM game/src/render/terrain.ts:298 method TerrainView.clearFlowers
SYM game/src/render/terrain.ts:307 method TerrainView.clearMountains
SYM game/src/render/terrain.ts:316 method TerrainView.disposeGeometries
SYM game/src/render/terrain.ts:322 method TerrainView.setQuality
SYM game/src/render/terrain.ts:340 method TerrainView.updateVisualTime
SYM game/src/render/terrain.ts:369 method TerrainView.buildGround
SYM game/src/render/terrain.ts:466 method TerrainView.buildWater
SYM game/src/render/terrain.ts:548 method TerrainView.buildGrassTextures
SYM game/src/render/terrain.ts:595 method TerrainView.buildTufts
SYM game/src/render/terrain.ts:748 method TerrainView.buildFlowers
SYM game/src/render/terrain.ts:799 method TerrainView.smoothBiomass
SYM game/src/render/terrain.ts:830 method TerrainView.updateGrass
SYM game/src/render/terrain.ts:920 method TerrainView.updateGrassCenter
SYM game/src/render/terrain.ts:928 method TerrainView.buildDecor
SYM game/src/render/terrain.ts:1011 method TerrainView.buildMountains
SYM game/src/render/terrain.ts:1061 method TerrainView.buildOvoo
SYM game/src/render/terrain.ts:1106 method TerrainView.buildCampStructures
SYM game/src/render/terrain.ts:1116 method TerrainView.buildPostFence
SYM game/src/render/terrain.ts:1144 method TerrainView.buildShed
SYM game/src/render/terrain.ts:1214 method TerrainView.buildPostAndFire
SYM game/src/render/terrain.ts:1238 method TerrainView.syncHay
SYM game/src/render/terrain.ts:1264 method TerrainView.buildDens
SYM game/src/render/terrain.ts:1301 method TerrainView.buildHome
FILE game/src/render/ui/menu.ts 25.2KB 497L exports: Intent,takeIntent,putIntent,storedLang,MenuDeps,MenuUI
SYM game/src/render/ui/menu.ts:25 type Intent
SYM game/src/render/ui/menu.ts:30 fn takeIntent
SYM game/src/render/ui/menu.ts:42 fn putIntent
SYM game/src/render/ui/menu.ts:47 fn storedLang
SYM game/src/render/ui/menu.ts:56 interface MenuDeps
SYM game/src/render/ui/menu.ts:78 fn esc
SYM game/src/render/ui/menu.ts:80 class MenuUI
SYM game/src/render/ui/menu.ts:123 method MenuUI.showStart
SYM game/src/render/ui/menu.ts:128 method MenuUI.toggleGame
SYM game/src/render/ui/menu.ts:134 method MenuUI.close
SYM game/src/render/ui/menu.ts:141 method MenuUI.showIntro
SYM game/src/render/ui/menu.ts:148 method MenuUI.go
SYM game/src/render/ui/menu.ts:163 method MenuUI.refreshSlots
SYM game/src/render/ui/menu.ts:173 method MenuUI.onKey
SYM game/src/render/ui/menu.ts:184 method MenuUI.render
SYM game/src/render/ui/menu.ts:191 method MenuUI.ver
SYM game/src/render/ui/menu.ts:195 method MenuUI.back
SYM game/src/render/ui/menu.ts:199 method MenuUI.rStart
SYM game/src/render/ui/menu.ts:217 method MenuUI.netBtn
SYM game/src/render/ui/menu.ts:222 method MenuUI.rTransfer
SYM game/src/render/ui/menu.ts:236 method MenuUI.rCode
SYM game/src/render/ui/menu.ts:253 method MenuUI.xferError
SYM game/src/render/ui/menu.ts:258 method MenuUI.rGame
SYM game/src/render/ui/menu.ts:274 method MenuUI.slotInfoHtml
SYM game/src/render/ui/menu.ts:283 method MenuUI.rSlots
SYM game/src/render/ui/menu.ts:297 method MenuUI.rangeRow
SYM game/src/render/ui/menu.ts:302 method MenuUI.difficultyHtml
SYM game/src/render/ui/menu.ts:308 method MenuUI.rNew
SYM game/src/render/ui/menu.ts:323 method MenuUI.firstFreeSlot
SYM game/src/render/ui/menu.ts:328 method MenuUI.rFile
SYM game/src/render/ui/menu.ts:338 method MenuUI.rSettings
SYM game/src/render/ui/menu.ts:348 method MenuUI.rIntro
SYM game/src/render/ui/menu.ts:358 method MenuUI.finishIntro
SYM game/src/render/ui/menu.ts:365 method MenuUI.onInput
SYM game/src/render/ui/menu.ts:376 method MenuUI.onChange
SYM game/src/render/ui/menu.ts:390 method MenuUI.setDie
SYM game/src/render/ui/menu.ts:395 method MenuUI.onClick
SYM game/src/render/ui/menu.ts:493 method MenuUI.busyDo
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
FILE game/src/render/ui/panels.ts 82.7KB 1175L exports: UiHooks,Panels
SYM game/src/render/ui/panels.ts:87 interface UiHooks
SYM game/src/render/ui/panels.ts:94 class Panels
SYM game/src/render/ui/panels.ts:135 method Panels.isOpen
SYM game/src/render/ui/panels.ts:139 method Panels.open
SYM game/src/render/ui/panels.ts:162 method Panels.close
SYM game/src/render/ui/panels.ts:176 method Panels.showReport
SYM game/src/render/ui/panels.ts:188 method Panels.refresh
SYM game/src/render/ui/panels.ts:194 method Panels.showArrive
SYM game/src/render/ui/panels.ts:200 method Panels.render
SYM game/src/render/ui/panels.ts:220 method Panels.storageHtml
SYM game/src/render/ui/panels.ts:282 method Panels.buyItems
SYM game/src/render/ui/panels.ts:306 method Panels.vehicleButtons
SYM game/src/render/ui/panels.ts:314 method Panels.cargoList
SYM game/src/render/ui/panels.ts:328 method Panels.cargoHtml
SYM game/src/render/ui/panels.ts:397 method Panels.selectedAnimals
SYM game/src/render/ui/panels.ts:405 method Panels.shopHtml
SYM game/src/render/ui/panels.ts:476 method Panels.townCommand
SYM game/src/render/ui/panels.ts:506 method Panels.townHtml
SYM game/src/render/ui/panels.ts:584 method Panels.lotHtml
SYM game/src/render/ui/panels.ts:616 method Panels.arriveHtml
SYM game/src/render/ui/panels.ts:657 method Panels.reportHtml
SYM game/src/render/ui/panels.ts:703 method Panels.wolfKillsHtml
SYM game/src/render/ui/panels.ts:710 method Panels.dogsHtml
SYM game/src/render/ui/panels.ts:738 method Panels.campsHtml
SYM game/src/render/ui/panels.ts:785 method Panels.cheatHtml
SYM game/src/render/ui/panels.ts:798 method Panels.teahouseHtml
SYM game/src/render/ui/panels.ts:821 method Panels.helpersHtml
SYM game/src/render/ui/panels.ts:872 method Panels.otorHtml
SYM game/src/render/ui/panels.ts:898 method Panels.payHtml
SYM game/src/render/ui/panels.ts:918 method Panels.act
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
FILE game/src/render/worldmap.ts 22.2KB 487L exports: paperPixels,WorldMapView
SYM game/src/render/worldmap.ts:21 fn textSprite
SYM game/src/render/worldmap.ts:47 fn paperPixels
SYM game/src/render/worldmap.ts:87 class WorldMapView
SYM game/src/render/worldmap.ts:237 method WorldMapView.inkLines
SYM game/src/render/worldmap.ts:289 method WorldMapView.heightAt
SYM game/src/render/worldmap.ts:298 method WorldMapView.addCamp
SYM game/src/render/worldmap.ts:310 method WorldMapView.addSum
SYM game/src/render/worldmap.ts:324 method WorldMapView.addPath
SYM game/src/render/worldmap.ts:336 method WorldMapView.resize
SYM game/src/render/worldmap.ts:342 method WorldMapView.partyModel
SYM game/src/render/worldmap.ts:367 method WorldMapView.snapshot
SYM game/src/render/worldmap.ts:377 method WorldMapView.applySeason
SYM game/src/render/worldmap.ts:399 method WorldMapView.update
SYM game/src/render/worldmap.ts:450 method WorldMapView.replaceLabel
SYM game/src/render/worldmap.ts:482 fn segDist
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
FILE game/src/sim/commands.ts 20.6KB 399L exports: Command,CommandResult,nearHome,applyCommand
SYM game/src/sim/commands.ts:28 type Command
SYM game/src/sim/commands.ts:81 interface CommandResult
SYM game/src/sim/commands.ts:87 fn nearHome
SYM game/src/sim/commands.ts:99 fn ok
SYM game/src/sim/commands.ts:100 fn fail
SYM game/src/sim/commands.ts:102 fn applyCommand
FILE game/src/sim/config.ts 21.8KB 426L exports: Species,Sex,Season,SeasonsConfig,SPECIES,TimeConfig,SpeciesConfig,AnimalsConfig,PastureTypeConfig,GrazingConfig,HerdConfig,PastureConfig,WaterShape,TerrainConfig,+9
SYM game/src/sim/config.ts:33 type Species
SYM game/src/sim/config.ts:34 type Sex
SYM game/src/sim/config.ts:35 type Season
SYM game/src/sim/config.ts:38 interface SeasonsConfig
SYM game/src/sim/config.ts:56 const SPECIES
SYM game/src/sim/config.ts:58 interface TimeConfig
SYM game/src/sim/config.ts:72 interface SpeciesConfig
SYM game/src/sim/config.ts:87 interface AnimalsConfig
SYM game/src/sim/config.ts:106 interface PastureTypeConfig
SYM game/src/sim/config.ts:113 interface GrazingConfig
SYM game/src/sim/config.ts:136 interface HerdConfig
SYM game/src/sim/config.ts:155 interface PastureConfig
SYM game/src/sim/config.ts:177 type WaterShape
SYM game/src/sim/config.ts:182 interface TerrainConfig
SYM game/src/sim/config.ts:193 interface CampConfig
SYM game/src/sim/config.ts:203 interface HomeConfig
SYM game/src/sim/config.ts:215 interface WorldLocation
SYM game/src/sim/config.ts:220 interface WorldMapConfig
SYM game/src/sim/config.ts:240 interface StartAnimal
SYM game/src/sim/config.ts:248 interface GameConfig
SYM game/src/sim/config.ts:278 fn loadConfig
SYM game/src/sim/config.ts:311 fn validateConfig
SYM game/src/sim/config.ts:373 fn validateSumLayout
FILE game/src/sim/rng.ts 1.3KB 49L exports: Rng
SYM game/src/sim/rng.ts:6 class Rng
SYM game/src/sim/rng.ts:14 method Rng.state
SYM game/src/sim/rng.ts:18 method Rng.fromState
SYM game/src/sim/rng.ts:23 method Rng.next
SYM game/src/sim/rng.ts:32 method Rng.range
SYM game/src/sim/rng.ts:37 method Rng.int
SYM game/src/sim/rng.ts:41 method Rng.chance
SYM game/src/sim/rng.ts:45 method Rng.pick
FILE game/src/sim/save.ts 13.0KB 206L exports: SAVE_FORMAT,SaveMeta,SaveFile,SaveError,saveMeta,serialize,deserialize,migrationChainComplete,validateState
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
FILE game/src/sim/sim.ts 11.0KB 243L exports: DayReport,SimEvent,Sim
SYM game/src/sim/sim.ts:29 interface DayReport
SYM game/src/sim/sim.ts:51 type SimEvent
SYM game/src/sim/sim.ts:53 class Sim
SYM game/src/sim/sim.ts:74 method Sim.on
SYM game/src/sim/sim.ts:81 method Sim.emit
SYM game/src/sim/sim.ts:85 method Sim.command
SYM game/src/sim/sim.ts:94 method Sim.emitTravel
SYM game/src/sim/sim.ts:99 method Sim.step
SYM game/src/sim/sim.ts:160 method Sim.refreshQuality
SYM game/src/sim/sim.ts:165 method Sim.runDays
SYM game/src/sim/sim.ts:170 method Sim.endDay
SYM game/src/sim/sim.ts:234 method Sim.spend
SYM game/src/sim/sim.ts:240 method Sim.random
FILE game/src/sim/state.ts 14.8KB 323L exports: SAVE_VERSION,ProductId,PRODUCTS,AnimalMode,Animal,GroundItem,Batch,ProcessorKind,ProcessorState,VehicleId,VEHICLES,BuyOrder,Place,InteriorState,+12
SYM game/src/sim/state.ts:17 const SAVE_VERSION
SYM game/src/sim/state.ts:19 type ProductId
SYM game/src/sim/state.ts:20 const PRODUCTS
SYM game/src/sim/state.ts:24 type AnimalMode
SYM game/src/sim/state.ts:26 interface Animal
SYM game/src/sim/state.ts:54 interface GroundItem
SYM game/src/sim/state.ts:63 interface Batch
SYM game/src/sim/state.ts:69 type ProcessorKind
SYM game/src/sim/state.ts:71 interface ProcessorState
SYM game/src/sim/state.ts:77 type VehicleId
SYM game/src/sim/state.ts:78 const VEHICLES
SYM game/src/sim/state.ts:80 type BuyOrder
SYM game/src/sim/state.ts:93 type Place
SYM game/src/sim/state.ts:99 interface InteriorState
SYM game/src/sim/state.ts:111 interface FleetVehicle
SYM game/src/sim/state.ts:123 interface MapState
SYM game/src/sim/state.ts:131 interface CampState
SYM game/src/sim/state.ts:139 interface DayStats
SYM game/src/sim/state.ts:152 interface PlayerState
SYM game/src/sim/state.ts:168 interface GameState
SYM game/src/sim/state.ts:206 fn emptyDayStats
SYM game/src/sim/state.ts:210 fn newAnimal
SYM game/src/sim/state.ts:243 fn createInitialState
SYM game/src/sim/state.ts:304 const MIGRATIONS
SYM game/src/sim/state.ts:311 const MIN_SAVE_VERSION
SYM game/src/sim/state.ts:314 fn migrateState
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
FILE game/src/sim/systems/gerLayout.ts 7.4KB 121L exports: LayoutBox,GerLayoutSource,GerSimConfig,gerWallRadius,gerDoorOffset,gerOuterRadius,gerInnerRadius,placeOnWall,boxFrom,gerBoxes,gerBlockers,pushOutOfBox
SYM game/src/sim/systems/gerLayout.ts:7 interface LayoutBox
SYM game/src/sim/systems/gerLayout.ts:10 interface GerLayoutSource
SYM game/src/sim/systems/gerLayout.ts:25 interface GerSimConfig
SYM game/src/sim/systems/gerLayout.ts:31 fn gerWallRadius
SYM game/src/sim/systems/gerLayout.ts:38 fn gerDoorOffset
SYM game/src/sim/systems/gerLayout.ts:43 fn gerOuterRadius
SYM game/src/sim/systems/gerLayout.ts:48 fn gerInnerRadius
SYM game/src/sim/systems/gerLayout.ts:53 fn placeOnWall
SYM game/src/sim/systems/gerLayout.ts:59 fn boxFrom
SYM game/src/sim/systems/gerLayout.ts:65 fn gerBoxes
SYM game/src/sim/systems/gerLayout.ts:95 fn gerBlockers
SYM game/src/sim/systems/gerLayout.ts:105 fn pushOutOfBox
FILE game/src/sim/systems/grazing.ts 9.9KB 254L exports: flockCenters,grazingStep,driveFlock
SYM game/src/sim/systems/grazing.ts:23 fn flockCenters
SYM game/src/sim/systems/grazing.ts:43 fn flockKey
SYM game/src/sim/systems/grazing.ts:48 fn decide
SYM game/src/sim/systems/grazing.ts:97 fn scoreAt
SYM game/src/sim/systems/grazing.ts:130 fn moveToward
SYM game/src/sim/systems/grazing.ts:145 fn grazingStep
SYM game/src/sim/systems/grazing.ts:223 fn eat
SYM game/src/sim/systems/grazing.ts:243 fn driveFlock
FILE game/src/sim/systems/helpers.ts 42.3KB 884L exports: HelperKind,HelperTask,HerdGroup,HelperTrip,Helper,CandidateMember,Candidate,OtorGroup,Dwelling,HelpersState,HelperEvent,newHelpersState,bedsTotal,bedsUsed,+21
SYM game/src/sim/systems/helpers.ts:33 type HelperKind
SYM game/src/sim/systems/helpers.ts:34 type HelperTask
SYM game/src/sim/systems/helpers.ts:35 type HerdGroup
SYM game/src/sim/systems/helpers.ts:37 interface HelperTrip
SYM game/src/sim/systems/helpers.ts:44 interface Helper
SYM game/src/sim/systems/helpers.ts:68 interface CandidateMember
SYM game/src/sim/systems/helpers.ts:74 interface Candidate
SYM game/src/sim/systems/helpers.ts:81 interface OtorGroup
SYM game/src/sim/systems/helpers.ts:93 interface Dwelling
SYM game/src/sim/systems/helpers.ts:102 interface HelpersState
SYM game/src/sim/systems/helpers.ts:113 type HelperEvent
SYM game/src/sim/systems/helpers.ts:118 fn newHelpersState
SYM game/src/sim/systems/helpers.ts:125 fn freeSlot
SYM game/src/sim/systems/helpers.ts:133 fn bedsTotal
SYM game/src/sim/systems/helpers.ts:137 fn bedsUsed
SYM game/src/sim/systems/helpers.ts:142 fn addDwelling
SYM game/src/sim/systems/helpers.ts:148 fn spareTents
SYM game/src/sim/systems/helpers.ts:154 fn homeOf
SYM game/src/sim/systems/helpers.ts:164 fn refreshCandidates
SYM game/src/sim/systems/helpers.ts:201 fn nearTeahouse
SYM game/src/sim/systems/helpers.ts:207 fn hire
SYM game/src/sim/systems/helpers.ts:255 fn familyOf
SYM game/src/sim/systems/helpers.ts:260 fn leave
SYM game/src/sim/systems/helpers.ts:270 fn fire
SYM game/src/sim/systems/helpers.ts:281 fn setTask
SYM game/src/sim/systems/helpers.ts:295 fn payWithAnimal
SYM game/src/sim/systems/helpers.ts:307 fn playerOwned
SYM game/src/sim/systems/helpers.ts:312 fn payWages
SYM game/src/sim/systems/helpers.ts:337 fn moveToward
SYM game/src/sim/systems/helpers.ts:351 fn groupOf
SYM game/src/sim/systems/helpers.ts:357 fn flock
SYM game/src/sim/systems/helpers.ts:367 fn driveAnimal
SYM game/src/sim/systems/helpers.ts:375 fn bestPasture
SYM game/src/sim/systems/helpers.ts:398 fn ensureHorseCamp
SYM game/src/sim/systems/helpers.ts:425 fn helperGuardRadius
SYM game/src/sim/systems/helpers.ts:430 fn areaScore
SYM game/src/sim/systems/helpers.ts:437 fn herderPhase
SYM game/src/sim/systems/helpers.ts:446 fn herderStep
SYM game/src/sim/systems/helpers.ts:543 fn eveningSpot
SYM game/src/sim/systems/helpers.ts:550 fn childStep
SYM game/src/sim/systems/helpers.ts:602 fn driverStep
SYM game/src/sim/systems/helpers.ts:673 fn helpersStep
SYM game/src/sim/systems/helpers.ts:694 fn guardingHelpers
SYM game/src/sim/systems/helpers.ts:701 fn sendOtor
SYM game/src/sim/systems/helpers.ts:718 fn recallOtor
SYM game/src/sim/systems/helpers.ts:741 fn setOtorCollector
SYM game/src/sim/systems/helpers.ts:764 fn takeFromOtor
SYM game/src/sim/systems/helpers.ts:795 fn dailyOtor
SYM game/src/sim/systems/helpers.ts:877 fn relocateHelpers
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
FILE game/src/sim/systems/interior.ts 17.3KB 334L exports: InteriorSpot,RoomSpec,InteriorsConfig,InteriorService,EnterDoor,sumEnterDoors,campEnterDoors,enterDoors,nearEnterDoor,roomSpec,roomGerSize,currentRoom,clampToRoom,enterBuilding,+7
SYM game/src/sim/systems/interior.ts:16 interface InteriorSpot
SYM game/src/sim/systems/interior.ts:17 interface RoomSpec
SYM game/src/sim/systems/interior.ts:49 interface InteriorsConfig
SYM game/src/sim/systems/interior.ts:68 type InteriorService
SYM game/src/sim/systems/interior.ts:70 interface EnterDoor
SYM game/src/sim/systems/interior.ts:87 fn serviceOf
SYM game/src/sim/systems/interior.ts:95 fn sumEnterDoors
SYM game/src/sim/systems/interior.ts:116 fn campEnterDoors
SYM game/src/sim/systems/interior.ts:135 fn enterDoors
SYM game/src/sim/systems/interior.ts:146 fn nearEnterDoor
SYM game/src/sim/systems/interior.ts:165 fn roomSpec
SYM game/src/sim/systems/interior.ts:182 fn roomGerSize
SYM game/src/sim/systems/interior.ts:187 fn currentRoom
SYM game/src/sim/systems/interior.ts:193 fn clampToRoom
SYM game/src/sim/systems/interior.ts:218 fn enterBuilding
SYM game/src/sim/systems/interior.ts:236 fn atExit
SYM game/src/sim/systems/interior.ts:242 fn exitBuilding
SYM game/src/sim/systems/interior.ts:257 fn moveInterior
SYM game/src/sim/systems/interior.ts:268 fn atCounter
SYM game/src/sim/systems/interior.ts:274 fn interiorService
SYM game/src/sim/systems/interior.ts:281 fn ensureInteriorValid
SYM game/src/sim/systems/interior.ts:288 fn validateInteriors
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
FILE game/src/sim/systems/storage.ts 2.9KB 74L exports: capacity,used,freeSpace,count,add,take,dailyStorageAging
SYM game/src/sim/systems/storage.ts:8 fn capacity
SYM game/src/sim/systems/storage.ts:12 fn used
SYM game/src/sim/systems/storage.ts:16 fn freeSpace
SYM game/src/sim/systems/storage.ts:20 fn count
SYM game/src/sim/systems/storage.ts:25 fn add
SYM game/src/sim/systems/storage.ts:35 fn take
SYM game/src/sim/systems/storage.ts:52 fn dailyStorageAging
FILE game/src/sim/systems/sumtown.ts 11.8KB 265L exports: SumXZ,SumRoofSpec,SumYardSpec,SumBuildingSpec,SumCompoundSpec,SumFieldSpec,SumSpecialPlotSpec,SumZoneSpec,SumRoadSpec,SumPropSpec,SumLayout,Facing,TRADE_ROLES,TradeRole,+17
SYM game/src/sim/systems/sumtown.ts:12 type SumXZ
SYM game/src/sim/systems/sumtown.ts:13 interface SumRoofSpec
SYM game/src/sim/systems/sumtown.ts:14 interface SumYardSpec
SYM game/src/sim/systems/sumtown.ts:15 interface SumBuildingSpec
SYM game/src/sim/systems/sumtown.ts:27 interface SumCompoundSpec
SYM game/src/sim/systems/sumtown.ts:33 interface SumFieldSpec
SYM game/src/sim/systems/sumtown.ts:34 interface SumSpecialPlotSpec
SYM game/src/sim/systems/sumtown.ts:38 interface SumZoneSpec
SYM game/src/sim/systems/sumtown.ts:39 interface SumRoadSpec
SYM game/src/sim/systems/sumtown.ts:40 interface SumPropSpec
SYM game/src/sim/systems/sumtown.ts:41 interface SumLayout
SYM game/src/sim/systems/sumtown.ts:61 type Facing
SYM game/src/sim/systems/sumtown.ts:64 const TRADE_ROLES
SYM game/src/sim/systems/sumtown.ts:65 type TradeRole
SYM game/src/sim/systems/sumtown.ts:67 interface SumDoor
SYM game/src/sim/systems/sumtown.ts:78 interface LotSlot
SYM game/src/sim/systems/sumtown.ts:81 fn facingOf
SYM game/src/sim/systems/sumtown.ts:86 fn doorPoint
SYM game/src/sim/systems/sumtown.ts:100 fn allBuildings
SYM game/src/sim/systems/sumtown.ts:105 fn sumDoors
SYM game/src/sim/systems/sumtown.ts:124 fn lotSlots
SYM game/src/sim/systems/sumtown.ts:129 fn worldLimit
SYM game/src/sim/systems/sumtown.ts:134 fn nearTradeDoor
SYM game/src/sim/systems/sumtown.ts:150 fn teahouseDoor
SYM game/src/sim/systems/sumtown.ts:156 fn nearLotSlot
SYM game/src/sim/systems/sumtown.ts:171 fn orderAllowed
SYM game/src/sim/systems/sumtown.ts:193 fn canSellProducts
SYM game/src/sim/systems/sumtown.ts:196 fn canSellAnimals
SYM game/src/sim/systems/sumtown.ts:200 fn pointInPoly
SYM game/src/sim/systems/sumtown.ts:208 fn distSeg
SYM game/src/sim/systems/sumtown.ts:216 fn sumHeight
SYM game/src/sim/systems/sumtown.ts:226 fn nearestOnPolyline
SYM game/src/sim/systems/sumtown.ts:244 fn faceTowardRoad
SYM game/src/sim/systems/sumtown.ts:259 fn plotHouse
FILE game/src/sim/systems/town.ts 19.7KB 370L exports: HouseMode,ZdtgLoan,BankLoan,RelativeState,TownState,TownEvent,newTownState,plotDoors,TownRole,nearTownDoor,housePrice,buyHouse,setHouseMode,donate,+13
SYM game/src/sim/systems/town.ts:19 type HouseMode
SYM game/src/sim/systems/town.ts:20 interface ZdtgLoan
SYM game/src/sim/systems/town.ts:21 interface BankLoan
SYM game/src/sim/systems/town.ts:22 interface RelativeState
SYM game/src/sim/systems/town.ts:23 interface TownState
SYM game/src/sim/systems/town.ts:34 type TownEvent
SYM game/src/sim/systems/town.ts:36 fn newTownState
SYM game/src/sim/systems/town.ts:45 fn plotDoors
SYM game/src/sim/systems/town.ts:52 type TownRole
SYM game/src/sim/systems/town.ts:56 fn nearTownDoor
SYM game/src/sim/systems/town.ts:76 fn near
SYM game/src/sim/systems/town.ts:81 fn spend
SYM game/src/sim/systems/town.ts:85 fn earn
SYM game/src/sim/systems/town.ts:89 fn repUp
SYM game/src/sim/systems/town.ts:95 fn housePrice
SYM game/src/sim/systems/town.ts:99 fn buyHouse
SYM game/src/sim/systems/town.ts:111 fn setHouseMode
SYM game/src/sim/systems/town.ts:121 fn donate
SYM game/src/sim/systems/town.ts:132 fn zdtgPackages
SYM game/src/sim/systems/town.ts:137 fn takeZdtgLoan
SYM game/src/sim/systems/town.ts:158 fn zdtgRepayable
SYM game/src/sim/systems/town.ts:165 fn repayZdtgLoan
SYM game/src/sim/systems/town.ts:187 fn bankCollateralHouses
SYM game/src/sim/systems/town.ts:192 fn bankLimit
SYM game/src/sim/systems/town.ts:199 fn takeBankLoan
SYM game/src/sim/systems/town.ts:210 fn repayBankLoan
SYM game/src/sim/systems/town.ts:228 interface GiftPlan
SYM game/src/sim/systems/town.ts:231 fn giveGift
SYM game/src/sim/systems/town.ts:276 fn townDaily
SYM game/src/sim/systems/town.ts:330 fn townMonthly
SYM game/src/sim/systems/town.ts:336 fn townSeason
FILE game/src/sim/systems/travel.ts 25.8KB 572L exports: TravelEvent,fleetOf,initFleetVehicle,addVehicle,syncAway,cargoUnits,hayInOrders,hayRoom,cargoSlots,nearestVehicle,enterVehicle,exitVehicle,boardBest,takeFromStorage,+20
SYM game/src/sim/systems/travel.ts:22 type TravelEvent
SYM game/src/sim/systems/travel.ts:27 fn fleetOf
SYM game/src/sim/systems/travel.ts:32 fn initFleetVehicle
SYM game/src/sim/systems/travel.ts:43 fn addVehicle
SYM game/src/sim/systems/travel.ts:49 fn syncAway
SYM game/src/sim/systems/travel.ts:54 fn cargoUnits
SYM game/src/sim/systems/travel.ts:59 fn hayInOrders
SYM game/src/sim/systems/travel.ts:64 fn hayRoom
SYM game/src/sim/systems/travel.ts:70 fn cargoSlots
SYM game/src/sim/systems/travel.ts:75 fn nearestVehicle
SYM game/src/sim/systems/travel.ts:89 fn enterVehicle
SYM game/src/sim/systems/travel.ts:103 fn exitVehicle
SYM game/src/sim/systems/travel.ts:121 fn boardBest
SYM game/src/sim/systems/travel.ts:141 fn takeFromStorage
SYM game/src/sim/systems/travel.ts:160 fn droveAnimals
SYM game/src/sim/systems/travel.ts:171 fn canTravel
SYM game/src/sim/systems/travel.ts:176 fn originKm
SYM game/src/sim/systems/travel.ts:182 fn sumId
SYM game/src/sim/systems/travel.ts:187 fn driveVehicle
SYM game/src/sim/systems/travel.ts:205 fn leaveToMap
SYM game/src/sim/systems/travel.ts:220 fn mapGo
SYM game/src/sim/systems/travel.ts:233 fn mapSpeedKmPerMin
SYM game/src/sim/systems/travel.ts:243 fn droveSlows
SYM game/src/sim/systems/travel.ts:249 fn partySpeedKmPerMin
SYM game/src/sim/systems/travel.ts:255 fn mapStep
SYM game/src/sim/systems/travel.ts:274 fn spend
SYM game/src/sim/systems/travel.ts:280 fn arrive
SYM game/src/sim/systems/travel.ts:346 fn migrateHere
SYM game/src/sim/systems/travel.ts:357 fn atLoadingSpot
SYM game/src/sim/systems/travel.ts:363 fn loadCargo
SYM game/src/sim/systems/travel.ts:391 fn unloadCargo
SYM game/src/sim/systems/travel.ts:416 interface TradePlan
SYM game/src/sim/systems/travel.ts:423 fn sellableAtShop
SYM game/src/sim/systems/travel.ts:432 fn sellableAnimals
SYM game/src/sim/systems/travel.ts:438 fn animalRoom
SYM game/src/sim/systems/travel.ts:450 fn trade
SYM game/src/sim/systems/travel.ts:538 fn buyLotVehicle
FILE game/src/sim/systems/trip.ts 4.2KB 109L exports: VehicleSpec,vehicleCfg,bestTruck,parkingSpot,productPrice,orderPrice,animalSlots,deliver
SYM game/src/sim/systems/trip.ts:14 type VehicleSpec
SYM game/src/sim/systems/trip.ts:16 fn vehicleCfg
SYM game/src/sim/systems/trip.ts:21 fn bestTruck
SYM game/src/sim/systems/trip.ts:31 fn parkingSpot
SYM game/src/sim/systems/trip.ts:35 fn productPrice
SYM game/src/sim/systems/trip.ts:39 fn orderPrice
SYM game/src/sim/systems/trip.ts:65 fn animalSlots
SYM game/src/sim/systems/trip.ts:71 fn deliver
FILE game/src/sim/systems/wolves.ts 31.5KB 657L exports: Den,WolfMode,Wolf,isPup,hungerStage,WolfState,Zone,WolfEvent,spawnWolves,protectionZones,isProtected,spookAnimals,scareWolf,wolvesStep,+6
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
FILE game/tests/animalLook.test.ts 7.1KB 126L
FILE game/tests/animals.test.ts 2.3KB 39L
FILE game/tests/breeding.test.ts 1.4KB 33L
FILE game/tests/camclip.test.ts 3.9KB 68L
FILE game/tests/characters.test.ts 26.0KB 438L
FILE game/tests/clock.test.ts 2.3KB 47L
FILE game/tests/config.test.ts 1.4KB 29L
FILE game/tests/difficulty.test.ts 4.9KB 99L
FILE game/tests/docs.test.ts 4.0KB 76L
FILE game/tests/dogs.test.ts 7.5KB 190L
FILE game/tests/ger.test.ts 9.5KB 181L
FILE game/tests/grazing.test.ts 2.3KB 46L
FILE game/tests/helpers.ts 0.8KB 20L
FILE game/tests/herder.test.ts 6.3KB 139L
FILE game/tests/herds.test.ts 5.1KB 112L
FILE game/tests/interior.test.ts 10.1KB 200L
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
FILE docs/CONTEXT.md 22.3KB 114L
DOC docs/CONTEXT.md:12-18 ## 1. Тоглоом юу вэ
DOC docs/CONTEXT.md:19-29 ## 2. Стек ба командууд
DOC docs/CONTEXT.md:30-88 ## 3. Файлын зураглал (`game/src/`)
DOC docs/CONTEXT.md:89-91 ## 4. `data/*.json` → аль файл хэрэглэдэг
DOC docs/CONTEXT.md:92-100 ## 5. Архитектурын дүрэм ([[architecture]])
DOC docs/CONTEXT.md:101-104 ## 6. Баримтын давуу эрх (зөрчилдвөл дээд нь хүчинтэй)
DOC docs/CONTEXT.md:105-107 ## 7. Нээлттэй асуултууд
DOC docs/CONTEXT.md:108-114 ## 8. Баримтын хэсгийн индекс (мөрийн муж)
FILE docs/INDEX.md 13.9KB 135L
DOC docs/INDEX.md:16-30 ## 1. Унших дараалал ба давуу эрх
DOC docs/INDEX.md:31-106 ## 2. Баримтууд
DOC docs/INDEX.md:107-110 ## 3. Гол тоо
DOC docs/INDEX.md:111-129 ## 4. Нэр томьёо
DOC docs/INDEX.md:130-135 ## 5. Баримт засах дүрэм
FILE docs/architecture.md 19.5KB 236L
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
FILE docs/mvp-spec.md 50.8KB 460L
DOC docs/mvp-spec.md:17-22 ## 0. Хэрэглэгчийн шийдвэрийн түүх
DOC docs/mvp-spec.md:23-50 ## 1. Хүрээ
DOC docs/mvp-spec.md:51-69 ## 2. Цаг (M4.5, M5.5)
DOC docs/mvp-spec.md:70-102 ## 3. Эхлэл
DOC docs/mvp-spec.md:103-151 ## 4. Бүтээгдэхүүн: мал үлдээнэ, малчин цуглуулна (Farm Frenzy маяг)
DOC docs/mvp-spec.md:152-208 ## 5. Үнэ, тээвэр ба сумын төв
DOC docs/mvp-spec.md:209-251 ## 6. Туслах малчид (M5 — [[helpers-m5]])
DOC docs/mvp-spec.md:252-293 ## 7. Бэлчээр, бууц сэлгэх, доройтол
DOC docs/mvp-spec.md:294-331 ## 8. Чоно (M4, M4.5, B6)
DOC docs/mvp-spec.md:332-347 ## 9. Төллөлт ба нас (M5.5)
DOC docs/mvp-spec.md:348-422 ## 10. Тоглоомын зорилго ба замын тэмдэгтүүд
DOC docs/mvp-spec.md:423-445 ## 11. Прототипоос хасагдах, өөрчлөгдөх зүйл
DOC docs/mvp-spec.md:446-451 ## 12. Хөгжүүлэлтийн явц
DOC docs/mvp-spec.md:452-456 ## 13. Нээлттэй шийдвэр байхгүй
DOC docs/mvp-spec.md:457-460 ## Эх сурвалж
FILE docs/night-transport.md 9.4KB 106L
DOC docs/night-transport.md:18-32 ## 1. Цаг ба шөнө
DOC docs/night-transport.md:33-44 ## 2. Хотлох (хэрэглэгчийн дүрэм)
DOC docs/night-transport.md:45-68 ## 3. Сүү, ноос хоносон газраа (хэрэглэгчийн дүрэм)
DOC docs/night-transport.md:69-87 ## 4. Шөнийн чоно (хэрэглэгчийн дүрэм)
DOC docs/night-transport.md:88-103 ## 5. Тээвэр
DOC docs/night-transport.md:104-106 ## 6. Хэрэглэгчийн шийдвэр 🙋
FILE docs/plan/M6.md 17.6KB 66L
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
FILE docs/plan/V.md 55.5KB 178L
DOC docs/plan/V.md:13-15 ## Зорилго
DOC docs/plan/V.md:16-23 ## Гарах шалгуур ([[visuals-plan]] §V3–V5, §7.1)
DOC docs/plan/V.md:24-172 ## Блокууд ба чеклист (2026-11-15)
DOC docs/plan/V.md:173-178 ## Зогссон цэг
FILE docs/plan/playtest.md 12.9KB 77L
DOC docs/plan/playtest.md:13-18 ## A. FPS ба төхөөрөмж
DOC docs/plan/playtest.md:19-39 ## B. Харааны ба соёлын баталгаажуулалт ([[V]])
DOC docs/plan/playtest.md:40-77 ## C. Мэдрэмж, үе шат бүрээр
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
