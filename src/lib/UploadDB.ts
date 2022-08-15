import { AssetPack } from "./AssetPack"
import { pgDB } from "./postgres"

// tslint:disable-next-line:no-empty
export async function uploadDB(assetPack: AssetPack,ethAddress: string) {
  return Promise.all([uploadPostgres(assetPack,ethAddress)])
}
// tslint:disable-next-line:no-empty
function uploadPostgres(assetPack: AssetPack,ethAddress: string) {
  const assetPacksSQL = `
    INSERT INTO asset_packs (id,title,thumbnail,is_deleted,created_at,updated_at,eth_address)
     value ($1,$2,$3,$4,$5,$6,$7)
    `
  const date = new Date()

  const thumbnail = assetPack.id + ".png"
  console.log("thumbnail is: ",thumbnail)
  pgDB.query(assetPacksSQL,[assetPack.id,assetPack.title,thumbnail,false,date,date,ethAddress])
}
