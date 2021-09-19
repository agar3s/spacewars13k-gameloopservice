const { Web3Storage, getFilesFromPath } = require('web3.storage');

exports.upload = async function (file) {
  const token = '';

  const storage = new Web3Storage({ token });
  const files = [];

  //for (const path of [file]) {
  const pathFiles = await getFilesFromPath(file);
  files.push(...pathFiles);
  //}

  console.log(`Uploading ${files.length} files`);
  const cid = await storage.put(files);
  console.log('Content added with CID:', cid);
  return cid;
}

//exports.main('./ss13k-600.gif');
