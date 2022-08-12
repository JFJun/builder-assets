// tslint:disable-next-line:no-multi-spaces
import * as Minio from 'minio'

import { env } from "decentraland-commons"

export const minioClient = new Minio.Client({
  endPoint: env.get("MINIO_IP"),
  port: 9000,
  useSSL: false,
  accessKey: env.get("MINIO_USER"),
  secretKey: env.get("MINIO_PASSWORD")
})

export async function checkFile(
    bucketName: string,
    key: string
): Promise<boolean> {
  return false
}

export function uploadFile(
    bucketName: string,
    contentType: string,
    key: string,
    data: Buffer
) {
  console.log("========================================>")
    // tslint:disable-next-line:no-multi-spaces
  minioClient.putObject(bucketName, getKeyName(key), data,  function(e) {
    if (e) {
      return console.log(e)
    }
    console.log("Successfully uploaded the buffer")
  })

}

function getKeyName(key: string): string {
  return `contents/${key}`
}
