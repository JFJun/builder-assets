import * as fs from 'fs-extra'
import * as path from 'path'
import { Log } from 'decentraland-commons'
import * as mime from 'mime/lite'

import {
  AssetPackInfo,
  FILE_NAME as ASSET_INFO_FILE_NAME
} from '../lib/AssetPackInfo'
import { AssetPack } from '../lib/AssetPack'
import { Manifest } from '../lib/Manifest'
import { getDirectories } from '../lib/files'
import { uploadFile } from "../lib/minio"
import {uploadDB} from "../lib/UploadDB"

type Options = {
  src: string
  contentServer: string
  bucket: string
  out: string
  url: string
  force: boolean
}

const log = new Log('cmd::bundle')

export function register(program) {
  // TODO: Add a skip flag
  return program
    .command('bundle')
    .option('--src [assetPacksDir]', 'Path to the asset packs content folder')
    .option(
      '--bucket [bucketName]',
      'S3 bucket name to upload the asset pack contents'
    )
    .option('--content-server [contentServerURL]', 'Content server URL')
    .option('--out [assetPackOut]', 'Path to the asset pack descriptor output')
    .option('--url [url]', 'URL where the assets where be served')
    .option('--force', 'Skip Hash comparison', false)
    .action(main)
}

async function main(options: Options) {
  let temporalDir = ''

  try {
    checkOptions(options)

    temporalDir = '_' + path.basename(options.src)
    await fs.copy(options.src, temporalDir)

    const directories = await getDirectories(temporalDir)
    const uploadedAssetPacks: AssetPack[] = []
    const skippedDirErrors: string[] = []

    for (const dirPath of directories) {
      console.log("dirPath: ",dirPath)
      const assetPackInfo = new AssetPackInfo(dirPath)
      await assetPackInfo.read()

      if (assetPackInfo.isValid()) {
        const { id, title } = assetPackInfo.toJSON()
        const assetPack = new AssetPack(id!, title!, dirPath)
        // 上传图片到服务器
        await uploadAssetPackPng(options.bucket,id,dirPath)
        await uploadDB(assetPack,"0x784054926a114c097765dCFC96d6d9b67b6ed037")
        await uploadAssetPack(assetPack, options)
        uploadedAssetPacks.push(assetPack)
      } else {
        const dirName = path.basename(dirPath)
        throw new Error(
          `"${ASSET_INFO_FILE_NAME}" file missing or malformed for "${dirName}". Check the README for an example`
        )
      }
    }

    if (skippedDirErrors.length) {
      log.warn(`Errors:\n\t - ${skippedDirErrors.join('\n\t - ')}`)
    }

    if (options.out) {
      await new Manifest(options.out, options.url).save(uploadedAssetPacks)
    }
  } catch (err) {
    log.error(err)
  } finally {
    if (temporalDir) {
      await fs.remove(temporalDir)
    }
  }

  log.info('All done!')
  process.exit()
}

async function uploadAssetPack(assetPack: AssetPack, options: Options) {
  await assetPack.bundle(options.contentServer)

  if (options.out) {
    await assetPack.save(options.out)
  }

  if (options.bucket) {
    console.log("start upload to bucket")
    await assetPack.upload(options.bucket, options.force)
  }

}

// 上传 png图片到服务器
async function uploadAssetPackPng(bucketName: string,id: string | undefined ,dirPath: string) {
  let pngPath = path.join(dirPath,"thumbnail.png")
  console.log("pngUrl :",pngPath)
  const pngData = await fs.readFile(pngPath)
  const bn = bucketName + "/asset_packs"
  const contentType = mime.getType(pngPath)
  const key = id + ".png"
  return uploadFile(bn,contentType,key,pngData)
}

function checkOptions(options: Options) {
  const { src, out, url } = options

  if (!src) {
    throw new Error(
      'You need to supply a --src path to the assets. Check --help for more info'
    )
  }

  if ((out && !url) || (!out && url)) {
    throw new Error(
      'You need to supply both --out and --url or neither. Check --help for more info'
    )
  }
}
