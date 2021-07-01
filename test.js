const QiniuManager = require("./src/utils/QiniuManager")
const accessKey = 'uJdbhGnfzZeCmW15JLSnVyqbVYKqvtDk2jLs2mc0'
const secretKey = 'C8-gNPipd4nsoYwy49QgjFlwRiJDioDW0oX-o_s-'
var localFile = "/Users/dongrudong/Downloads/demo/aa.md"
var key = "bb.md"
const manager = new QiniuManager(accessKey, secretKey, "clouddoc")
// manager.uploadFile(key,localFile).then((res)=>{
//   console.log("上传成功",res)
//   return manager.deleteFile(key)
// }).then(res=>{
//   console.log("删除成功",res)
// }).catch(err=>{
//   console.log(err)
// })
manager.generateDownloadLink(key).then(res=>{
  console.log(res)
})
