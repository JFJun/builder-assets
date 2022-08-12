import { AssetPack } from "./AssetPack"
import {pgDB} from "./postgres"

export class UploadDB {

  // tslint:disable-next-line:no-empty
  async upload(assetPacks: AssetPack[]) {
    return Promise.all([this.uploadPostgres(assetPacks)])
  }
  // tslint:disable-next-line:no-empty
  async uploadPostgres(assetPacks: AssetPack[]){
    const assetPacksSQL = `
    INSERT INTO asset_packs (id,title,thumbnail,is_deleted,created_at,updated_at,eth_address)
     value ($1,$2,$3,$4,$5,$6,$7)
    `
    const date = new Date()

    for (const assetPack of assetPacks) {
      // todo
        pgDB.query(assetPacksSQL,[assetPack.id,assetPack.title,])
    }
  }
}
